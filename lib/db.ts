import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "zxcv5623",
  database: "wangchu",
  charset: "utf8",
});

export default db;