const express = require("express");
const cors = require("cors");
const { getConnection } = require("./db");
const oracledb = require("oracledb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =====================
// MIDDLEWARE JWT
// =====================
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({ message: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "CLAVE_SUPER_SECRETA");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// "BD" en memoria (temporal)
//let tasks = [
//  { id: 1, title: "Mi primera tarea", done: false },
//];

// GET: listar
app.get("/api/tasks", verifyToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(
      `SELECT id, title, done FROM tasks ORDER BY id DESC`
    );

    const tasks = result.rows.map((r) => ({
      id: r[0],
      title: r[1],
      done: r[2] === 1,
    }));

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error obteniendo tareas" });
  } finally {
    if (conn) await conn.close();
  }
});

// POST: crear
 app.post("/api/tasks", verifyToken, async (req, res) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "El titulo es obligatorio" });
  }

  let conn;
  try {
    conn = await getConnection();

    // Insertar y devolver el id generado
    const result = await conn.execute(
      `INSERT INTO tasks (title, done) VALUES (:title, 0)
       RETURNING id INTO :id`,
      {
        title: title.trim(),
         id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    const newId = result.outBinds.id[0];

    res.status(201).json({ id: newId, title: title.trim(), done: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creando tarea" });
  } finally {
    if (conn) await conn.close();
  }
});

// PUT: actualizar (título y/o done)
app.put("/api/tasks/:id", verifyToken, async (req, res) => {
  const id = Number(req.params.id);
  const { title, done } = req.body;

  let conn;
  try {
    conn = await getConnection();

    const fields = [];
    const binds = { id };

    if (typeof title === "string") {
      fields.push("title = :title");
      binds.title = title.trim();
    }
    if (typeof done === "boolean") {
      fields.push("done = :done");
      binds.done = done ? 1 : 0;
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Nada para actualizar" });
    }

    const result = await conn.execute(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = :id`,
      binds,
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error actualizando tarea" });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE: eliminar
app.delete("/api/tasks/:id", verifyToken, async (req, res) => {
  const id = Number(req.params.id);

  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(
      `DELETE FROM tasks WHERE id = :id`,
      { id },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error eliminando tarea" });
  } finally {
    if (conn) await conn.close();
  }
});

// =====================
// AUTH: REGISTER
// =====================
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !username.trim() || !password) {
    return res.status(400).json({ message: "Username y password son obligatorios" });
  }

  let conn;
  try {
    conn = await getConnection();

    const passwordHash = await bcrypt.hash(password, 10);

    await conn.execute(
      `INSERT INTO users_app (username, password_hash)
       VALUES (:u, :p)`,
      { u: username.trim().toLowerCase(), p: passwordHash },
      { autoCommit: true }
    );

    res.status(201).json({ message: "Usuario creado" });
  } catch (err) {
    if (String(err.message).includes("ORA-00001")) {
      return res.status(409).json({ message: "Ese usuario ya existe" });
    }
    console.error(err);
    res.status(500).json({ message: "Error registrando usuario" });
  } finally {
    if (conn) await conn.close();
  }
});


// =====================
// AUTH: LOGIN
// =====================
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !username.trim() || !password) {
    return res.status(400).json({ message: "Username y password son obligatorios" });
  }

  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(
      `SELECT id, username, password_hash
       FROM users_app
       WHERE username = :u`,
      { u: username.trim().toLowerCase() }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const [id, user, hash] = result.rows[0];

    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id, username: user },
      "CLAVE_SUPER_SECRETA",
      { expiresIn: "2h" }
    );

    res.json({ token, username: user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error en login" });
  } finally {
    if (conn) await conn.close();
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Backend en http://localhost:${PORT}`));