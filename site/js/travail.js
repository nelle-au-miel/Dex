import { createApp, ref, computed, onMounted } from "https://unpkg.com/vue@3.5/dist/vue.esm-browser.js";
import { lireTravail, lireDisponibilites, enregistrerReponse } from "./api.js";

// L'id du travail
const travailId = document.getElementById("app").dataset.travailId;

createApp({
    setup() {
        const travail = ref(null);
        const disponibilites = ref([]);   // pour chaque créneau : nombre d'étudiants et noms
        const matricule = ref("");
        const nom = ref("");
        const choisis = ref([]);          // ids des créneaux cochés
        const chargement = ref(true);
        const erreur = ref("");           // erreur de chargement (ex. travail introuvable)
        const erreursForm = ref([]);      // erreurs du formulaire
        const succes = ref(false);

        // Les créneaux qui ont au moins une réponse
        const avecReponses = computed(() => disponibilites.value.filter((d) => d.noms));

        // Ids des créneaux qui ont le plus d'étudiants (vide si personne n'a répondu)
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

        // Nom de la clé localStorage où on garde les créneaux cochés d'un matricule
        function cleCreneaux(matri) {
            return `dex-creneaux-${travailId}-${matri}`;
        }

        // Remet dans le formulaire le matricule, le nom et les créneaux déjà cochés
        function restaurer() {
            const etudiant = JSON.parse(localStorage.getItem("dex-etudiant"));
            if (!etudiant) {
                return;
            }
            matricule.value = etudiant.matricule;
            nom.value = etudiant.nom;

            const sauvegardes = JSON.parse(localStorage.getItem(cleCreneaux(etudiant.matricule)));
            if (sauvegardes) {
                choisis.value = sauvegardes;
            }
        }

        // Envoie la réponse à l'API, et garde l'étudiant dans localStorage
        async function enregistrer() {
            succes.value = false;
            erreursForm.value = [];

            const matri = matricule.value.trim();
            const nomEtudiant = nom.value.trim();

            // Le matricule est dans l'adresse de la requête : il ne peut pas être vide
            if (!matri || !nomEtudiant) {
                erreursForm.value = ["Le matricule et le nom sont requis."];
                return;
            }

            try {
                await enregistrerReponse(travailId, matri, nomEtudiant, choisis.value);

                // Réponse réussie : on garde l'étudiant et ses choix pour la prochaine visite
                localStorage.setItem("dex-etudiant", JSON.stringify({ matricule: matri, nom: nomEtudiant }));
                localStorage.setItem(cleCreneaux(matri), JSON.stringify(choisis.value));

                succes.value = true;
                disponibilites.value = await lireDisponibilites(travailId);   // met les compteurs à jour
            } catch (e) {
                if (e.messages) {
                    erreursForm.value = e.messages;
                } else {
                    erreursForm.value = ["Impossible de joindre l'API."];
                }
            }
        }

        // Au chargement de la page : on charge le travail et ses disponibilités
        onMounted(async () => {
            try {
                travail.value = await lireTravail(travailId);
                disponibilites.value = await lireDisponibilites(travailId);
                restaurer();
            } catch (e) {
                if (e.messages) {
                    erreur.value = e.messages.join(" ");
                } else {
                    erreur.value = "Impossible de joindre l'API.";
                }
            } finally {
                chargement.value = false;
            }
        });

        return {
            travail, disponibilites, matricule, nom, choisis, chargement, erreur,
            erreursForm, succes, meilleurs, avecReponses, enregistrer
        };
    }
}).mount("#app");