import mysql from 'mysql2/promise';

const BD_HOTE = 'localhost';
const BD_NOM  = 'DexAppBD';
const BD_USER = 'root';
const BD_MDP  = '';

// Connexion à la base de données
export const pool = mysql.createPool({
    host:     BD_HOTE,
    database: BD_NOM,
    user:     BD_USER,
    password: BD_MDP,
    dateStrings: true
});