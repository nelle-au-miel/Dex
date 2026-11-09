import express from 'express';
import { pool } from './bd.js';

const app = express();

// GET /api/cours : la liste de cours
app.get('/api/cours', async (req, res) => {
    const [cours] = await pool.execute('SELECT id, titre FROM cours');
    res.json(cours);
});

// GET /api/travaux : la liste de travaux
app.get('/api/travaux', async (req, res) => {
    const cours = typeof req.query.cours === "string"
        ? req.query.cours.trim()
        : '';

    // Pas de filtre demandé : on renvoie tous les travaux ouverts
    if (!cours) {
        const [tous] = await pool.execute(
            'SELECT * FROM travaux WHERE ouvert = TRUE'
        );
        return res.json(tous);
    }
    // Filtre demandé : on renvoie les travaux ouverts de ce cours
    const [filtres] = await pool.execute(
        'SELECT * FROM travaux WHERE ouvert = TRUE AND cours_id = ?',
        [cours]
    );
    res.json(filtres);
});

app.listen(3000, () => {
    console.log('Serveur démarré sur : http://localhost:3000/api/cours');
});