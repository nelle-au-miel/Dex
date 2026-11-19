import { createApp, ref, onMounted } from "https://unpkg.com/vue@3.5/dist/vue.esm-browser.js";
import { lireCours, lireTravaux } from "./api.js";

createApp({
    setup() {
        const cours = ref([]);          // les cours (boutons de filtre)
        const travaux = ref([]);        // les travaux affichés
        const coursChoisi = ref("");    // "" = tous les cours
        const chargement = ref(true);
        const erreur = ref("");

        // Transforme une erreur en texte pour l'afficher
        function messageErreur(e) {
            if (e.messages) {
                return e.messages.join(" ");
            }
            return "Impossible de joindre l'API.";
        }

        // Va chercher les travaux du cours choisi (ou de tous les cours)
        async function chargerTravaux() {
            chargement.value = true;
            erreur.value = "";
            try {
                travaux.value = await lireTravaux(coursChoisi.value);
            } catch (e) {
                erreur.value = messageErreur(e);
            } finally {
                chargement.value = false;
            }
        }

        // Va chercher la liste des cours pour les boutons de filtre
        async function chargerCours() {
            try {
                cours.value = await lireCours();
            } catch (e) {
                erreur.value = messageErreur(e);
            }
        }

        // Clic sur un bouton de filtre : on change le cours et on recharge les travaux
        function choisirCours(id) {
            coursChoisi.value = id;
            chargerTravaux();
        }

        // Au chargement de la page : cours et travaux
        onMounted(() => {
            chargerCours();
            chargerTravaux();
        });

        return { cours, travaux, coursChoisi, chargement, erreur, choisirCours };
    }
}).mount("#app");