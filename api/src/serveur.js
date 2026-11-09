import express from 'express';
import { pool } from './bd.js';

const app = express();

app.get('/api/cours', async (req, res) => {
    const [cours] = await pool.execute('SELECT id, titre FROM cours');
    res.json(cours);
});

app.listen(3000, () => {
    console.log('Serveur démarré sur : http://localhost:3000/api/cours');
});