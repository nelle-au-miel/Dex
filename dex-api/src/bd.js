import mysql from "mysql2/promise";

/* ---------------------------- CONNEXION À LA BASE DE DONNÉES ------------------------- */

export const bd = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "DexAppBD",
  dateStrings: true
});