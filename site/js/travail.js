import { createApp, ref, computed, onMounted } from "https://unpkg.com/vue@3.5/dist/vue.esm-browser.js";
import { lireTravail, lireDisponibilites, enregistrerReponse } from "./api.js";

// L'id du travail, transmis par PHP dans l'attribut data-travail-id
const travailId = document.getElementById("app").dataset.travailId;

createApp({
    setup() {
        const travail = ref(null);
        const disponibilites = ref([]);
        const matricule = ref("");
        const nom = ref("");
        const choisis = ref([]);
        const chargement = ref(true);
        const erreur = ref("");
        const erreursForm = ref([]);
        const succes = ref(false);

        // Ids des créneaux qui conviennent au plus grand nombre (vide si personne n'a répondu)
        const meilleurs = computed(() => {
            let max = 0;
            disponibilites.value.forEach((d) => {
                if (d.nombre_etudiants > max) {
                    max = d.nombre_etudiants;
                }
            });
            if (max === 0) {
                return [];
            }
            return disponibilites.value
                .filter((d) => d.nombre_etudiants === max)
                .map((d) => d.id);
        });

        // Clé localStorage des créneaux choisis par un matricule pour ce travail
        function cleCreneaux(mat) {
            return `dex-creneaux-${travailId}-${mat}`;
        }

        // Relit matricule, nom et créneaux cochés depuis le navigateur
        function restaurer() {
            const etudiant = JSON.parse(localStorage.getItem("dex-etudiant"));
            if (etudiant) {
                matricule.value = etudiant.matricule;
                nom.value = etudiant.nom;
                const sauvegardes = JSON.parse(localStorage.getItem(cleCreneaux(etudiant.matricule)));
                if (sauvegardes) {
                    choisis.value = sauvegardes;
                }
            }
        }

        async function enregistrer() {
            succes.value = false;
            erreursForm.value = [];

            // Sans matricule, l'adresse de la requête serait incomplète
            if (!matricule.value.trim() || !nom.value.trim()) {
                erreursForm.value = ["Le matricule et le nom sont requis."];
                return;
            }

            try {
                await enregistrerReponse(travailId, matricule.value.trim(), nom.value.trim(), choisis.value);

                // Réponse réussie : on garde l'étudiant et ses choix dans le navigateur
                localStorage.setItem("dex-etudiant", JSON.stringify({
                    matricule: matricule.value.trim(),
                    nom: nom.value.trim()
                }));
                localStorage.setItem(cleCreneaux(matricule.value.trim()), JSON.stringify(choisis.value));

                succes.value = true;
                disponibilites.value = await lireDisponibilites(travailId);   // met la grille à jour
            } catch (e) {
                erreursForm.value = e.messages ?? ["Impossible de joindre l'API."];
            }
        }

        onMounted(async () => {
            try {
                travail.value = await lireTravail(travailId);
                disponibilites.value = await lireDisponibilites(travailId);
                restaurer();
            } catch (e) {
                // 404 : le travail n'existe pas (PHP n'a vérifié que le format de l'id)
                erreur.value = (e.messages ?? ["Impossible de joindre l'API."]).join(" ");
            } finally {
                chargement.value = false;
            }
        });

        return {
            travail, disponibilites, matricule, nom, choisis, chargement, erreur,
            erreursForm, succes, meilleurs, enregistrer
        };
    }
}).mount("#app");
