import express from "express";
import { bd } from "../bd.js";
import { authentifier, retirerJeton } from "../auth.js";
import { validerTravail, validerCreneau, chercherTravail, chercherCreneau, genererIdCreneau } from "../utilitaire.js";

/* ----------------------------------- ROUTES PROTÉGÉES -------------------------------- */

const router = express.Router();

// POST /api/deconnexion : retire le jeton de la liste (ne fonctionne plus après)

router.post("/api/deconnexion", authentifier, (req, res) => {
  retirerJeton(req.jeton);
  res.status(204).send();
});

// GET /api/admin/travaux : travaux (ouverts et fermés) des cours de l'enseignant connecté

router.get("/api/admin/travaux", authentifier, async (req, res) => {
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

router.put("/api/travaux/:id", authentifier, async (req, res) => {
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

router.post("/api/travaux/:id/creneaux", authentifier, async (req, res) => {
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

router.put("/api/creneaux/:id", authentifier, async (req, res) => {
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

router.delete("/api/creneaux/:id", authentifier, async (req, res) => {
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

export default router;