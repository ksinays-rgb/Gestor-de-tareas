const { getConnection } = require("./db");

async function test() {
  try {
    const conn = await getConnection();
    console.log("✅ Conectado a Oracle correctamente");
    await conn.close();
  } catch (err) {
    console.error("❌ Error conectando:", err.message);
  }
}

test();