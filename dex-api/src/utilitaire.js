
/* ------------------------------ VALIDATION D'UN TRAVAIL ----------------------------- */
// Retourne la liste des erreurs trouvées (vide si tout est correct)

export function validerTravail(titre, description, type, disponible, remise, ouvert) {
    const erreurs = [];

    // Le titre doit être du texte, non vide, avec 150 caractères max
    if (typeof titre !== "string" || !titre.trim() || titre.length > 150) {
        erreurs.push("Le titre est requis (150 caractères maximum).");
    }
    // La description doit être du texte non vide
    if (typeof description !== "string" || !description.trim()) {
        erreurs.push("La description est requise.");
    }
    // Le type doit être soit "individuel" ou "equipe"
    if (type !== "individuel" && type !== "equipe") {
        erreurs.push("Le type doit être 'individuel' ou 'equipe'.");
    }
    // ouvert doit être soit true ou false
    if (typeof ouvert !== "boolean") {
        erreurs.push("Le champ ouvert doit être un booléen.");
    }
    // Les deux dates doivent être valides, et la remise doit venir après la disponibilité
    // On compare seulement si les deux dates sont valides
    if (!disponible || isNaN(new Date(disponible))) {
        erreurs.push("La date de disponibilité est invalide.");
    }
    else if (!remise || isNaN(new Date(remise))) {
        erreurs.push("La date de remise est invalide.");
    }
    else if (new Date(remise) <= new Date(disponible)) {
        erreurs.push("La remise doit venir après la disponibilité.");
    }
    return erreurs;
}

/* ------------------------------ VALIDATION D'UN CRÉNEAU ----------------------------- */
// Retourne la liste des erreurs trouvées (vide si tout est correct)

export function validerCreneau(debut, fin) {
    const erreurs = [];

    // Les deux dates doivent être valides, et la fin doit venir après le début
    if (!debut || isNaN(new Date(debut))) {
        erreurs.push("La date de début est invalide.");
    }
    else if (!fin || isNaN(new Date(fin))) {
        erreurs.push("La date de fin est invalide.");
    }
    else if (new Date(fin) <= new Date(debut)) {
        erreurs.push("La fin doit venir après le début.");
    }
    return erreurs;
}

/* ---------------------- VALIDATION D'UNE RÉPONSE D'UN ÉTUDIANT ---------------------- */
// Retourne la liste des erreurs trouvées (vide si tout est correct).

export function validerReponse(nom, matricule, creneaux) {
    const erreurs = [];

    // Le nom doit être du texte non vide, avec 100 caractères max
    if (typeof nom !== "string" || !nom.trim() || nom.length > 100) {
        erreurs.push("Le nom est requis (100 caractères maximum).");
    }
    // Le matricule ne peut pas dépasser 20 caractères
    if (matricule.length > 20) {
        erreurs.push("Le matricule est invalide (20 caractères maximum).");
    }
    // créneaux doit être une liste (même vide)
    if (!Array.isArray(creneaux)) {
        erreurs.push("La liste de créneaux est invalide.");
    }
    return erreurs;
}

/* ------------------------------- CHERCHER UN TRAVAIL -------------------------------- */
// Cherche un travail et l'id de l'enseignant propriétaire de son cours
// Retourne rien si le travail n'existe pas

export async function chercherTravail(bd, travailId) {
    const [travaux] = await bd.query(
        `SELECT travaux.id, cours.utilisateur_id
        FROM travaux
        JOIN cours ON travaux.cours_id = cours.id
        WHERE travaux.id = ?`,
        [travailId]
    );
    return travaux[0];
}

/* ------------------------------- CHERCHER UN CRÉNEAU -------------------------------- */
// Cherche un créneau et l'id de l'enseignant propriétaire de son cours
// Il faut passer par le travail pour arriver au cours
// Retourne rien si le créneau n'existe pas

export async function chercherCreneau(bd, creneauId) {
    const [creneaux] = await bd.query(
        `SELECT creneaux.id, cours.utilisateur_id
        FROM creneaux
        JOIN travaux ON creneaux.travail_id = travaux.id
        JOIN cours ON travaux.cours_id = cours.id
        WHERE creneaux.id = ?`,
        [creneauId]
    );
    return creneaux[0];
}

/* ------------------------ GÉNÉRER L'ID D'UN NOUVEAU CRÉNEAU ------------------------- */
// Crée l'id d'un nouveau créneau sous la forme <id du travail>-NN
// On prend le premier numéro qui n'est pas déjà utilisé

export async function genererIdCreneau(bd, travailId) {
    // On lit les ids des créneaux qui existent déjà pour ce travail
    const [existants] = await bd.query("SELECT id FROM creneaux WHERE travail_id = ?", [travailId]);
    const ids = existants.map((c) => c.id);

    // On commence avec le numéro 01
    let numero = 1;
    let nouvelId = `${travailId}-01`;

    // Tant que cet id existe déjà, on essaie le numéro suivant
    // (si le numéro est plus petit que 10, on ajoute un 0 devant : 4 devient 04)
    while (ids.includes(nouvelId)) {
        numero++;
        nouvelId = `${travailId}-${numero < 10 ? "0" + numero : numero}`;
    }
    return nouvelId;
}