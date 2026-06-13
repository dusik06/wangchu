import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "zxcv5623",
  database: process.env.DB_NAME || "wangchu",
  charset: "UTF8_GENERAL_CI",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;