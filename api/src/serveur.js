import express from 'express';
import { pool } from './bd.js';

const app = express();

app.use(express.json());

// Vérifie ce qui est envoyé par l'étudiant; rend la liste d'erreurs, vide si tout va bien
function valider(matricule, nom, creneaux) {
    const erreurs = [];

    if (matricule.trim() === '') {
        erreurs.push = 'Le matricule est obligatoire.';
    } else if (matricule.length > 20) {
        erreurs.push = 'Le matricule ne doit pas dépasser 20 caractères.';
    }
    if (nom.trim() === '' || typeof nom !== 'string') {
        erreurs.push = 'Le nom est obligatoire.';
    } else if (nom.trim().length > 100) {
        erreurs.push = 'Le nom ne doit pas dépasser 100 caractères.';
    }
    if (!Array.isArray(creneaux) || creneaux.length === 0) {
        erreurs.push = 'Vous devez sélectionner au moins un créneau.';
    }
    return erreurs;
}

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

// GET /api/travaux/:id : un travail et ses créneaux
app.get('/api/travaux/:id', async (req, res) => {
    const [travaux] = await pool.execute(
        'SELECT * FROM travaux WHERE id = ?',
        [req.params.id]
    );
    // Si aucun travail avec cet ID n'est trouvé : 404
    if (travaux.length === 0) {
        return res.status(404).json({ erreurs: ['Travail introuvable.'] });
    }
    // Récupérer les créneaux pour ce travail
    const [creneaux] = await pool.execute(
        'SELECT * FROM creneaux WHERE travail_id = ?',
        [req.params.id]
    );
    const travail = travaux[0];
    travail.ouvert = Boolean(travail.ouvert);
    travail.creneaux = creneaux;

    res.json(travail);
});

// GET /api/travaux/:id/disponibilites : 
// pour chaque créneau, le nombre d'étudiants et leurs noms 
app.get('/api/travaux/:id/disponibilites', async (req, res) => {
    const [travaux] = await pool.execute(
        'SELECT id FROM travaux WHERE id = ?',
        [req.params.id]
    );
    // Si aucun travail avec cet ID n'est trouvé : 404
    if (travaux.length === 0) {
        return res.status(404).json({ erreurs: ['Travail introuvable.'] });
    }
    // Récupérer les créneaux pour ce travail
    const [creneaux] = await pool.execute(
        'SELECT id FROM creneaux WHERE travail_id = ?',
        [req.params.id]
    );
    // Récupérer les étudiants disponibles pour ce travail
    const [dispos] = await pool.execute(
        'SELECT creneau_id, nom FROM disponibilites WHERE travail_id = ?',
        [req.params.id]
    );
    // Pour chaque créneau : les étudiants dispo et leur nombre
    const resultat = creneaux.map((c) => {
        const noms = dispos.filter((d) => d.creneau_id === c.id).map((d) => d.nom);
        return { creneau_id: c.id, nombre: noms.length, noms };
    });

    res.json(resultat);
});

// Aucune route précédente n'a répondu
app.use((req, res) => {
    res.status(404).json({ error: "Route introuvable." });
});
// Centralise les erreurs; les quatre paramètres sont nécessaires
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    console.error(err);
    const status = Number.isInteger(err.status) ? err.status : 500;
    const message = status < 500
        ? "La requête est invalide."
        : "Erreur interne du serveur.";
    res.status(status).json({ erreurs: [message] });
});

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur : http://localhost:3000/api/cours');
});
