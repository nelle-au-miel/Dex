import express from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { bd } from "../bd.js";
import { jetons } from "../auth.js";
import { validerReponse } from "../utilitaire.js";

/* ----------------------------------- ROUTES PUBLIQUES -------------------------------- */

const router = express.Router();

// GET /api/cours : liste de tous les cours

router.get("/api/cours", async (req, res) => {
  try {
    const [cours] = await bd.query("SELECT * FROM cours");
    res.status(200).json(cours);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// GET /api/travaux : les travaux ouverts avec filtre possible pour un seul cours

router.get("/api/travaux", async (req, res) => {
  let sql = "SELECT * FROM travaux WHERE ouvert = TRUE";
  let valeurs = [];

  // Si l'URL contient ?cours=..., on ajoute le filtre
  if (req.query.cours) {
    sql += " AND cours_id = ?";
    valeurs.push(req.query.cours);
  }
  try {
    const [travaux] = await bd.query(sql, valeurs);
    // MySQL donne 1 ou 0 : on le change en true ou false
    travaux.forEach((t) => {
      t.ouvert = Boolean(t.ouvert);
    });

    res.status(200).json(travaux);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// GET /api/travaux/:id : un travail (ouvert ou fermé) avec ses créneaux

router.get("/api/travaux/:id", async (req, res) => {
  try {
    const [travaux] = await bd.query("SELECT * FROM travaux WHERE id = ?", [req.params.id]);

    if (travaux.length === 0) {
      return res.status(404).json({ erreurs: ["Travail introuvable."] });
    }
    const [creneaux] = await bd.query(
      "SELECT * FROM creneaux WHERE travail_id = ? ORDER BY debut",
      [req.params.id]
    );
    travaux[0].creneaux = creneaux;
    travaux[0].ouvert = Boolean(travaux[0].ouvert);

    res.status(200).json(travaux[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// GET /api/travaux/:id/disponibilites : pour chaque créneau, le nombre d'étudiants disponibles et leurs noms

router.get("/api/travaux/:id/disponibilites", async (req, res) => {
  try {
    const [travaux] = await bd.query("SELECT id FROM travaux WHERE id = ?", [req.params.id]);

    if (travaux.length === 0) {
      return res.status(404).json({ erreurs: ["Travail introuvable."] });
    }
    const [disponibilites] = await bd.query(
      `SELECT c.id, c.debut, c.fin,
        COUNT(d.id) AS nombre_etudiants,
        GROUP_CONCAT(d.nom) AS noms
        FROM creneaux c
        LEFT JOIN disponibilites d ON c.id = d.creneau_id
        WHERE c.travail_id = ?
        GROUP BY c.id
        ORDER BY c.debut`,
      [req.params.id]
    );

    res.status(200).json(disponibilites);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// PUT /api/travaux/:id/disponibilites/:matricule : remplace la réponse d'un étudiant pour ce travail

router.put("/api/travaux/:id/disponibilites/:matricule", async (req, res) => {
  const { id, matricule } = req.params;
  const { nom, creneaux } = req.body ?? {};

  try {
    const [travaux] = await bd.query("SELECT * FROM travaux WHERE id = ?", [id]);

    if (travaux.length === 0) {
      return res.status(404).json({ erreurs: ["Travail introuvable."] });
    }
    if (!travaux[0].ouvert) {
      return res.status(409).json({ erreurs: ["Ce travail est fermé."] });
    }

    const erreurs = validerReponse(nom, matricule, creneaux);

    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs });
    }
    if (creneaux.length > 0) {
      const [resultats] = await bd.query(
        "SELECT id FROM creneaux WHERE travail_id = ? AND id IN (?)", [id, creneaux]);

      if (resultats.length !== creneaux.length) {
        return res.status(400).json({ erreurs: ["Créneaux invalides."] });
      }
    }
    await bd.query(
      "DELETE FROM disponibilites WHERE travail_id = ? AND matricule = ?",
      [id, matricule]
    );

    if (creneaux.length > 0) {
      const valeurs = creneaux.map((c) => [id, c, matricule, nom.trim()]);
      await bd.query(
        "INSERT INTO disponibilites (travail_id, creneau_id, matricule, nom) VALUES ?",
        [valeurs]
      );
    }

    res.status(204).send();
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// POST /api/connexion : vérifie l'identifiant et le mot de passe, puis remet un jeton

router.post("/api/connexion", async (req, res) => {
  const { identifiant, motDePasse } = req.body ?? {};

  if (!identifiant || !motDePasse ||
    typeof identifiant !== "string" || typeof motDePasse !== "string") {
    return res.status(400).json({ erreurs: ["Identifiant et mot de passe requis."] });
  }
  try {
    const [utilisateurs] = await bd.execute(
      "SELECT * FROM utilisateurs WHERE identifiant = ?", [identifiant]);
    const utilisateur = utilisateurs[0];

    let valide = false;
    if (utilisateur) {
      valide = await bcrypt.compare(motDePasse, utilisateur.mot_de_passe_hache);
    }
    if (!valide) {
      return res.status(401).json({ erreurs: ["Identifiants incorrects."] });
    }

    const jeton = randomUUID();
    jetons.push({
      jeton,
      utilisateurId: utilisateur.id,
      expiration: Date.now() + 60 * 60 * 1000
    });

    res.status(200).json({ jeton, nom: utilisateur.nom });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

export default router;