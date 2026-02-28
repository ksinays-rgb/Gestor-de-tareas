import { useEffect, useState } from "react";

const API = "http://localhost:4000/api/tasks";
const AUTH_LOGIN = "http://localhost:4000/api/auth/login";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authUser, setAuthUser] = useState(localStorage.getItem("username") || "");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // ===============================
  // CARGAR TAREAS
  // ===============================
  async function loadTasks() {
    setError("");
    setLoading(true);

    try {
      if (!token) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const res = await fetch(API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTasks([]);
        setError(err.message || "No autorizado");
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setTasks([]);
        return;
      }

      setTasks(data);
    } catch {
      setTasks([]);
      setError("No se pudo cargar tareas ❌");
    } finally {
      setLoading(false);
    }
  }

  // ===============================
  // LOGIN
  // ===============================
  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(AUTH_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUser,
          password: loginPass,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Login incorrecto");
        return;
      }

      setToken(data.token);
      setAuthUser(data.username);

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);

      setLoginUser("");
      setLoginPass("");
    } catch {
      setError("No se pudo iniciar sesión ❌");
    }
  }

  // ===============================
  // LOGOUT
  // ===============================
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken("");
    setAuthUser("");
    setTasks([]);
  }

  // ===============================
  // CRUD TAREAS
  // ===============================
  async function addTask(e) {
    e.preventDefault();
    setError("");

    if (!title.trim()) return;

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message || "Error al crear tarea");
        return;
      }

      setTitle("");
      loadTasks();
    } catch {
      setError("Error al crear tarea ❌");
    }
  }

  async function toggleTask(task) {
    try {
      await fetch(`${API}/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ done: !task.done }),
      });

      loadTasks();
    } catch {
      setError("Error al actualizar ❌");
    }
  }

  async function deleteTask(id) {
    try {
      await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      loadTasks();
    } catch {
      setError("Error al eliminar ❌");
    }
  }

  useEffect(() => {
    loadTasks();
  }, [token]);

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="container">
      <div className="card">
        {!token ? (
          <>
            <h1 style={{ marginTop: 0 }}>Iniciar sesión</h1>

            <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
              <input
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Usuario"
                style={{ padding: 10 }}
              />

              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Contraseña"
                style={{ padding: 10 }}
              />

              <button type="submit">Entrar</button>
            </form>

            {error && <p style={{ marginTop: 10 }}>{error}</p>}
          </>
        ) : (
          <>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h1 style={{ marginTop: 0 }}>Gestor de Tareas</h1>
              <button onClick={handleLogout}>Cerrar sesión</button>
            </div>

            <p style={{ opacity: 0.7 }}>Usuario: {authUser}</p>

            <form onSubmit={addTask} style={{ display: "flex", gap: 8 }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Escribe una tarea..."
                style={{ flex: 1, padding: 10 }}
              />
              <button type="submit">Agregar</button>
            </form>

            {error && <p style={{ marginTop: 10 }}>{error}</p>}

            {loading ? (
              <p style={{ marginTop: 20 }}>Cargando...</p>
            ) : tasks.length === 0 ? (
              <p style={{ marginTop: 20 }}>Sin tareas</p>
            ) : (
              <ul style={{ marginTop: 20, padding: 0, listStyle: "none" }}>
                {tasks.map((t) => (
                  <li key={t.id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                  }}>
                    <label style={{ display: "flex", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(t)}
                      />
                      <span style={{
                        textDecoration: t.done ? "line-through" : "none"
                      }}>
                        {t.title}
                      </span>
                    </label>
                    <button onClick={() => deleteTask(t.id)}>Eliminar</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}