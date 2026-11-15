import { API_URL } from "./config.js";

/* ------------------------------------ UTILITAIRE ------------------------------------- */

// Faire la requête et lire la réponse
// Lance une erreur avec les erreurs de l'API si la requête n'est pas valide
async function requete(chemin, options = {}) {
    const reponse = await fetch(API_URL + chemin, options);

    // 204 : succès sans contenu
    if (reponse.status === 204) {
        return null;
    }

    const donnees = await reponse.json();

    if (!reponse.ok) {
        const erreur = new Error("Erreur de l'API");
        erreur.statut = reponse.status;
        erreur.messages = donnees.erreurs ?? ["Erreur inattendue."];
        throw erreur;
    }
    return donnees;
}

// En-têtes pour les routes protégées
function entetesAuth(jeton) {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jeton}`
    };
}

/* ---------------------------------- ROUTES PUBLIQUES --------------------------------- */

export function lireCours() {
    return requete("/cours");
}

export function lireTravaux(coursId = "") {
    return requete(coursId ? `/travaux?cours=${coursId}` : "/travaux");
}

export function lireTravail(id) {
    return requete(`/travaux/${id}`);
}

export function lireDisponibilites(id) {
    return requete(`/travaux/${id}/disponibilites`);
}

export function enregistrerReponse(travailId, matricule, nom, creneaux) {
    return requete(`/travaux/${travailId}/disponibilites/${matricule}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, creneaux })
    });
}

export function connexion(identifiant, motDePasse) {
    return requete("/connexion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, motDePasse })
    });
}

/* ---------------------------------- ROUTES PROTÉGÉES --------------------------------- */

export function deconnexion(jeton) {
    return requete("/deconnexion", { method: "POST", headers: entetesAuth(jeton) });
}

export function lireTravauxAdmin(jeton) {
    return requete("/admin/travaux", { headers: entetesAuth(jeton) });
}

export function modifierTravail(jeton, id, travail) {
    return requete(`/travaux/${id}`, {
        method: "PUT",
        headers: entetesAuth(jeton),
        body: JSON.stringify(travail)
    });
}

export function ajouterCreneau(jeton, travailId, debut, fin) {
    return requete(`/travaux/${travailId}/creneaux`, {
        method: "POST",
        headers: entetesAuth(jeton),
        body: JSON.stringify({ debut, fin })
    });
}

export function modifierCreneau(jeton, id, debut, fin) {
    return requete(`/creneaux/${id}`, {
        method: "PUT",
        headers: entetesAuth(jeton),
        body: JSON.stringify({ debut, fin })
    });
}

export function supprimerCreneau(jeton, id) {
    return requete(`/creneaux/${id}`, {
        method: "DELETE",
        headers: entetesAuth(jeton)
    });
}