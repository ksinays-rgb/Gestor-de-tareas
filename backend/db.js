const oracledb = require("oracledb");

const dbConfig = {
  user: "GESTOR",
  password: "gestor123",
  connectString: "localhost:1521/XEPDB1",
};

async function getConnection() {
  return await oracledb.getConnection(dbConfig);
}

module.exports = { getConnection };