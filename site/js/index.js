import { createApp, ref, onMounted } from "https://unpkg.com/vue@3.5/dist/vue.esm-browser.js";
import { lireCours, lireTravaux } from "./api.js";

createApp({
    setup() {
        const cours = ref([]);
        const travaux = ref([]);
        const coursChoisi = ref("");
        const chargement = ref(true);
        const erreur = ref("");

        // Charger les travaux selon le cours choisi
        async function chargerTravaux() {
            chargement.value = true;
            erreur.value = "";
            try {
                travaux.value = await lireTravaux(coursChoisi.value);
            } catch (e) {
                erreur.value = (e.messages ?? ["Impossible de joindre l'API."]).join(" ");
            } finally {
                chargement.value = false;
            }
        }

        // Clic sur un bouton de filtre : change le cours, et recharge
        function choisirCours(id) {
            coursChoisi.value = id;
            chargerTravaux();
        }

        // Au montage : charger les cours et travaux
        onMounted(async () => {
            try {
                cours.value = await lireCours();
            } catch (e) {
                erreur.value = (e.messages ?? ["Impossible de joindre l'API."]).join(" ");
            }
            chargerTravaux();
        });

        return { cours, travaux, coursChoisi, chargement, erreur, choisirCours };
    }
}).mount("#app");