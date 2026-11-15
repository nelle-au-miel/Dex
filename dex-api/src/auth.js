/* ----------------------------------- AUTHENTIFICATION -------------------------------- */

export const jetons = [];  // Liste des jetons actifs (vidée lors du redémarrage de l'API)

// Retire un jeton de la liste

export function retirerJeton(jeton) {
    const position = jetons.findIndex((j) => j.jeton === jeton);
    if (position !== -1) jetons.splice(position, 1);
}

// Vérifie le jeton avant d'exécuter une route protégée

export function authentifier(req, res, next) {
    const entete = req.headers.authorization ?? "";
    const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : "";
    const session = jetons.find((j) => j.jeton === jeton);

    if (!session || session.expiration < Date.now()) {
        retirerJeton(jeton);
        return res.status(401).json({ erreurs: ["Jeton absent, invalide ou expiré."] });
    }
    req.jeton = jeton;
    req.utilisateurId = session.utilisateurId;
    next();
}