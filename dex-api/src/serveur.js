
/* ------------------------------ CRÉATION DE L'APPLICATION ---------------------------- */


import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { validerTravail, validerCreneau, validerReponse, chercherTravail, chercherCreneau, genererIdCreneau } from "./utilitaire.js";

const app = express();

app.use(express.json());  // Permet de lire le corps JSON des requêtes (req.body)


/* ---------------------------- CONNEXION À LA BASE DE DONNÉES ------------------------- */


const bd = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "DexAppBD",
  dateStrings: true
});

let jetons = [];  // Liste des jetons actifs (vidée lors du redémarrage de l'API)


/* ----------------------------------- ROUTES PUBLIQUES -------------------------------- */


// GET /api/cours : liste de tous les cours

app.get("/api/cours", async (req, res) => {
  try {
    const [cours] = await bd.query("SELECT * FROM cours");
    res.status(200).json(cours);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// GET /api/travaux : les travaux ouverts avec filtre possible pour un seul cours

app.get("/api/travaux", async (req, res) => {
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

app.get("/api/travaux/:id", async (req, res) => {
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

app.get("/api/travaux/:id/disponibilites", async (req, res) => {
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

app.put("/api/travaux/:id/disponibilites/:matricule", async (req, res) => {
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
/* ---------------------------------- CONNEXION ET JETON ------------------------------- */


// POST /api/connexion : vérifie l'identifiant et le mot de passe, puis remet un jeton

app.post("/api/connexion", async (req, res) => {
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

// Vérifier le jeton avant d'exécuter une route protégée

function authentifier(req, res, next) {
  // enlever "Bearer " pour garder seulement le jeton
  const entete = req.headers.authorization ?? "";
  const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : "";
  const session = jetons.find((j) => j.jeton === jeton);

  // jeton absent, inconnu ou expiré (on le retire de la liste)
  if (!session || session.expiration < Date.now()) {
    jetons = jetons.filter((j) => j.jeton !== jeton);
    return res.status(401).json({ erreurs: ["Jeton absent, invalide ou expiré."] });
  }
  req.jeton = jeton;
  req.utilisateurId = session.utilisateurId;
  next();
}

// POST /api/deconnexion : retire le jeton de la liste (ne fonctionne plus après)

app.post("/api/deconnexion", authentifier, (req, res) => {
  jetons = jetons.filter((j) => j.jeton !== req.jeton);
  res.status(204).send();
});

/* ----------------------------------- ROUTES PROTÉGÉES -------------------------------- */


// GET /api/admin/travaux : travaux (ouverts et fermés) des cours de l'enseignant connecté

app.get("/api/admin/travaux", authentifier, async (req, res) => {
  try {
    const [travaux] = await bd.query(
      `SELECT travaux.*, cours.titre AS cours_titre
       FROM travaux
       JOIN cours ON travaux.cours_id = cours.id
       WHERE cours.utilisateur_id = ?
       ORDER BY cours.id, travaux.disponible`,
      [req.utilisateurId]
    );
    travaux.forEach((t) => {
      t.ouvert = Boolean(t.ouvert);
    });

    res.status(200).json(travaux);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// PUT /api/travaux/:id : modifie un travail

app.put("/api/travaux/:id", authentifier, async (req, res) => {
  const { titre, description, type, disponible, remise, ouvert } = req.body ?? {};

  try {
    const travail = await chercherTravail(bd, req.params.id);

    if (!travail) {
      return res.status(404).json({ erreurs: ["Travail introuvable."] });
    }
    if (travail.utilisateur_id !== req.utilisateurId) {
      return res.status(403).json({ erreurs: ["Ce travail appartient au cours d'un autre enseignant."] });
    }

    const erreurs = validerTravail(titre, description, type, disponible, remise, ouvert);

    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs });
    }

    await bd.query(
      `UPDATE travaux
       SET titre = ?, description = ?, type = ?, disponible = ?, remise = ?, ouvert = ?
       WHERE id = ?`,
      [titre.trim(), description.trim(), type, disponible, remise, ouvert, req.params.id]
    );

    const [misAJour] = await bd.query("SELECT * FROM travaux WHERE id = ?", [req.params.id]);
    misAJour[0].ouvert = Boolean(misAJour[0].ouvert);

    res.status(200).json(misAJour[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// POST /api/travaux/:id/creneaux : ajoute un créneau à un travail

app.post("/api/travaux/:id/creneaux", authentifier, async (req, res) => {
  const { debut, fin } = req.body ?? {};

  try {
    const travail = await chercherTravail(bd, req.params.id);

    if (!travail) {
      return res.status(404).json({ erreurs: ["Travail introuvable."] });
    }
    if (travail.utilisateur_id !== req.utilisateurId) {
      return res.status(403).json({ erreurs: ["Ce travail appartient au cours d'un autre enseignant."] });
    }
    const erreurs = validerCreneau(debut, fin);
    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs });
    }

    const nouvelId = await genererIdCreneau(bd, req.params.id);

    await bd.query(
      "INSERT INTO creneaux (id, travail_id, debut, fin) VALUES (?, ?, ?, ?)",
      [nouvelId, req.params.id, debut, fin]
    );

    const [creneaux] = await bd.query("SELECT * FROM creneaux WHERE id = ?", [nouvelId]);

    res.status(201).json(creneaux[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// PUT /api/creneaux/:id : modifie les heures d'un créneau

app.put("/api/creneaux/:id", authentifier, async (req, res) => {
  const { debut, fin } = req.body ?? {};

  try {
    const creneau = await chercherCreneau(bd, req.params.id);

    if (!creneau) {
      return res.status(404).json({ erreurs: ["Créneau introuvable."] });
    }
    if (creneau.utilisateur_id !== req.utilisateurId) {
      return res.status(403).json({ erreurs: ["Ce créneau appartient au cours d'un autre enseignant."] });
    }

    const erreurs = validerCreneau(debut, fin);

    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs });
    }

    await bd.query("UPDATE creneaux SET debut = ?, fin = ? WHERE id = ?",
      [debut, fin, req.params.id]
    );

    const [misAJour] = await bd.query("SELECT * FROM creneaux WHERE id = ?", [req.params.id]);

    res.status(200).json(misAJour[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});

// DELETE /api/creneaux/:id : supprime un créneau

app.delete("/api/creneaux/:id", authentifier, async (req, res) => {
  try {

    const creneau = await chercherCreneau(bd, req.params.id);

    if (!creneau) {
      return res.status(404).json({ erreurs: ["Créneau introuvable."] });
    }
    if (creneau.utilisateur_id !== req.utilisateurId) {
      return res.status(403).json({ erreurs: ["Ce créneau appartient au cours d'un autre enseignant."] });
    }

    await bd.query("DELETE FROM creneaux WHERE id = ?", [req.params.id]);

    res.status(204).send();
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreurs: ["Erreur inattendue du serveur."] });
  }
});
/* -------------------------------- DÉMARRAGE DU SERVEUR ------------------------------- */


app.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});
