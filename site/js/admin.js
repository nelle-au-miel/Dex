import { createApp, ref, onMounted } from "https://unpkg.com/vue@3.5/dist/vue.esm-browser.js";
import { lireTravail, lireDisponibilites, connexion, deconnexion, lireTravauxAdmin, modifierTravail, ajouterCreneau, modifierCreneau, supprimerCreneau } from "./api.js";

createApp({
    setup() {
        // Le jeton reste dans sessionStorage (effacé quand on ferme l'onglet)
        const jeton = ref(sessionStorage.getItem("dex-jeton") ?? "");
        const nomUtilisateur = ref(sessionStorage.getItem("dex-nom") ?? "");
        const identifiant = ref("");
        const motDePasse = ref("");
        const travaux = ref([]);
        const chargement = ref(false);
        const erreurs = ref([]);

        // Travail en cours de modification (une copie)
        const edition = ref(null);
        const erreursEdition = ref([]);
        const succes = ref(false);

        // Créneaux du travail en cours de modification
        const creneaux = ref([]);
        const formCreneau = ref({ id: "", debut: "", fin: "" });   // id vide = ajout
        const erreursCreneaux = ref([]);

        /* --------------------------------- SESSION --------------------------------- */

        // Efface le jeton et remet tout à zéro : on revient au formulaire de connexion
        function effacerSession() {
            sessionStorage.removeItem("dex-jeton");
            sessionStorage.removeItem("dex-nom");
            jeton.value = "";
            nomUtilisateur.value = "";
            travaux.value = [];
            edition.value = null;
            creneaux.value = [];
        }

        // Va chercher les travaux de l'enseignant connecté et les met dans la liste
        async function chargerTravaux() {
            chargement.value = true;
            erreurs.value = [];
            try {
                travaux.value = await lireTravauxAdmin(jeton.value);
            } catch (e) {
                if (e.statut === 401) {
                    effacerSession();   // 401 = jeton expiré
                    erreurs.value = ["Session expirée, reconnectez-vous."];
                } else {
                    erreurs.value = e.messages ?? ["Impossible de joindre l'API."];
                }
            } finally {
                chargement.value = false;
            }
        }

        // Envoie l'identifiant et le mot de passe à l'API, puis garde le jeton reçu
        async function seConnecter() {
            erreurs.value = [];
            try {
                const reponse = await connexion(identifiant.value, motDePasse.value);
                sessionStorage.setItem("dex-jeton", reponse.jeton);
                sessionStorage.setItem("dex-nom", reponse.nom);
                jeton.value = reponse.jeton;
                nomUtilisateur.value = reponse.nom;
                motDePasse.value = "";
                chargerTravaux();
            } catch (e) {
                erreurs.value = e.messages ?? ["Impossible de joindre l'API."];
            }
        }

        // Dit à l'API d'invalider le jeton, puis efface la session
        async function seDeconnecter() {
            try {
                await deconnexion(jeton.value);
            } catch (e) {
                // pas grave si l'API refuse, on efface quand même
            }
            effacerSession();
        }

        /* --------------------------------- TRAVAIL --------------------------------- */

        // Copie un travail dans le formulaire de modification et charge ses créneaux
        function commencerEdition(t) {
            succes.value = false;
            erreursEdition.value = [];
            erreursCreneaux.value = [];
            annulerCreneau();
            edition.value = {
                id: t.id,
                titre: t.titre,
                description: t.description,
                type: t.type,
                disponible: t.disponible,
                remise: t.remise.slice(0, 16).replace(" ", "T"),   // datetime-local veut un T
                ouvert: t.ouvert
            };
            chargerCreneaux();
        }

        // Ferme le formulaire de modification sans rien enregistrer
        function annulerEdition() {
            edition.value = null;
            creneaux.value = [];
        }

        // Envoie les changements du travail à l'API, puis recharge la liste
        async function enregistrerTravail() {
            succes.value = false;
            erreursEdition.value = [];
            try {
                await modifierTravail(jeton.value, edition.value.id, {
                    titre: edition.value.titre,
                    description: edition.value.description,
                    type: edition.value.type,
                    disponible: edition.value.disponible,
                    remise: edition.value.remise.replace("T", " "),   // l'API veut un espace
                    ouvert: edition.value.ouvert
                });
                succes.value = true;
                await chargerTravaux();
            } catch (e) {
                if (e.statut === 401) {
                    effacerSession();
                    erreurs.value = ["Session expirée, reconnectez-vous."];
                } else {
                    erreursEdition.value = e.messages ?? ["Impossible de joindre l'API."];
                }
            }
        }

        /* --------------------------------- CRÉNEAUX -------------------------------- */

        // Relit les créneaux du travail en modification (après un ajout, un changement ou une suppression)
        async function chargerCreneaux() {
            const travail = await lireTravail(edition.value.id);
            creneaux.value = travail.creneaux;
        }

        // Met un créneau dans le formulaire pour pouvoir le modifier
        function commencerCreneau(c) {
            erreursCreneaux.value = [];
            formCreneau.value = {
                id: c.id,
                debut: c.debut.slice(0, 16).replace(" ", "T"),
                fin: c.fin.slice(0, 16).replace(" ", "T")
            };
        }

        // Vide le formulaire de créneau (retour au mode ajout)
        function annulerCreneau() {
            formCreneau.value = { id: "", debut: "", fin: "" };
        }

        // Ajoute le créneau si le formulaire n'a pas d'id, sinon le modifie
        async function enregistrerCreneau() {
            erreursCreneaux.value = [];
            const debut = formCreneau.value.debut.replace("T", " ");
            const fin = formCreneau.value.fin.replace("T", " ");
            try {
                if (formCreneau.value.id) {
                    await modifierCreneau(jeton.value, formCreneau.value.id, debut, fin);
                } else {
                    await ajouterCreneau(jeton.value, edition.value.id, debut, fin);
                }
                annulerCreneau();
                await chargerCreneaux();
            } catch (e) {
                if (e.statut === 401) {
                    effacerSession();
                    erreurs.value = ["Session expirée, reconnectez-vous."];
                } else {
                    erreursCreneaux.value = e.messages ?? ["Impossible de joindre l'API."];
                }
            }
        }

        // Demande confirmation (avec le nombre de réponses), puis supprime le créneau
        async function supprimer(c) {
            erreursCreneaux.value = [];
            try {
                // On cherche combien de réponses ce créneau a
                const disponibilites = await lireDisponibilites(edition.value.id);
                const dispo = disponibilites.find((d) => d.id === c.id);
                const nombre = dispo ? dispo.nombre_etudiants : 0;

                if (!confirm(`Ce créneau a ${nombre} réponse(s). Elles seront supprimées. Continuer ?`)) {
                    return;   // l'enseignant a annulé
                }
                await supprimerCreneau(jeton.value, c.id);
                await chargerCreneaux();
            } catch (e) {
                if (e.statut === 401) {
                    effacerSession();
                    erreurs.value = ["Session expirée, reconnectez-vous."];
                } else {
                    erreursCreneaux.value = e.messages ?? ["Impossible de joindre l'API."];
                }
            }
        }

        // Au chargement de la page : si on a déjà un jeton, on charge les travaux
        onMounted(() => {
            if (jeton.value) {
                chargerTravaux();
            }
        });

        return {
            jeton, nomUtilisateur, identifiant, motDePasse, travaux, chargement, erreurs,
            seConnecter, seDeconnecter,
            edition, erreursEdition, succes, commencerEdition, annulerEdition, enregistrerTravail,
            creneaux, formCreneau, erreursCreneaux,
            commencerCreneau, annulerCreneau, enregistrerCreneau, supprimer
        };
    }
}).mount("#app");