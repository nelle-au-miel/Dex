<?php
$titre = "Administration";
include __DIR__ . "/includes/entete.php";
?>

<div id="app" v-cloak>
    <div class="entete-admin">
        <h1>Administration</h1>
        <div v-if="jeton" class="session">
            <span class="infos">Connecté : {{ nomUtilisateur }}</span>
            <button class="bouton" @click="seDeconnecter">Se déconnecter</button>
        </div>
    </div>

    <form v-if="!jeton" @submit.prevent="seConnecter" class="formulaire">
        <div class="champs">
            <label>Identifiant <input v-model="identifiant"></label>
            <label>Mot de passe <input type="password" v-model="motDePasse"></label>
        </div>
        <ul v-if="erreurs.length > 0" class="erreur" role="alert">
            <li v-for="m in erreurs" :key="m">{{ m }}</li>
        </ul>
        <button type="submit" class="bouton">Se connecter</button>
    </form>

    <template v-else>
        <form v-if="edition" @submit.prevent="enregistrerTravail" class="formulaire">
            <h2>Modifier : {{ edition.id }}</h2>
            <div class="champs">
                <label>Titre <input v-model="edition.titre" maxlength="150"></label>
                <label>Type
                    <select v-model="edition.type">
                        <option value="individuel">Individuel</option>
                        <option value="equipe">En équipe</option>
                    </select>
                </label>
                <label>Disponible <input type="date" v-model="edition.disponible"></label>
                <label>Remise <input type="datetime-local" v-model="edition.remise"></label>
                <label><input type="checkbox" v-model="edition.ouvert"> Ouvert</label>
            </div>
            <label>Description <textarea v-model="edition.description" rows="4"></textarea></label>

            <ul v-if="erreursEdition.length > 0" class="erreur" role="alert">
                <li v-for="m in erreursEdition" :key="m">{{ m }}</li>
            </ul>
            <p v-if="succes" class="succes" role="status">Travail enregistré.</p>

            <button type="submit" class="bouton">Enregistrer</button>
            <button type="button" class="bouton" @click="annulerEdition">Annuler</button>
        </form>

        <section v-if="edition" class="formulaire section-creneaux">
            <h2>Créneaux de {{ edition.id }}</h2>
            <p v-if="creneaux.length === 0" class="infos">Aucun créneau.</p>

            <div v-for="c in creneaux" :key="c.id" class="creneau">
                <span>{{ c.debut.slice(0, 16) }} → {{ c.fin.slice(11, 16) }}</span>
                <div class="actions">
                    <button class="bouton" @click="commencerCreneau(c)">Modifier</button>
                    <button class="bouton" @click="supprimer(c)">Supprimer</button>
                </div>
            </div>

            <h3>{{ formCreneau.id ? 'Modifier le créneau' : 'Ajouter un créneau' }}</h3>
            <form @submit.prevent="enregistrerCreneau" class="champs">
                <label>Début <input type="datetime-local" v-model="formCreneau.debut"></label>
                <label>Fin <input type="datetime-local" v-model="formCreneau.fin"></label>
                <button type="submit" class="bouton">{{ formCreneau.id ? 'Enregistrer' : 'Ajouter' }}</button>
                <button v-if="formCreneau.id" type="button" class="bouton" @click="annulerCreneau">Annuler</button>
            </form>

            <ul v-if="erreursCreneaux.length > 0" class="erreur" role="alert">
                <li v-for="m in erreursCreneaux" :key="m">{{ m }}</li>
            </ul>
        </section>

        <template v-if="!edition">
            <p v-if="chargement">Chargement des travaux…</p>
            <p v-else-if="erreurs.length > 0" class="erreur" role="alert">{{ erreurs.join(" ") }}</p>
            <p v-else-if="travaux.length === 0">Aucun travail.</p>

            <div v-else class="liste">
                <article v-for="t in travaux" :key="t.id" class="carte">
                    <h2>{{ t.titre }}</h2>
                    <p class="infos">{{ t.cours_titre }}</p>
                    <p class="infos">{{ t.ouvert ? 'Ouvert' : 'Fermé' }}</p>
                    <p class="infos">Remise : {{ t.remise.slice(0, 16) }}</p>
                    <button class="bouton" @click="commencerEdition(t)">Modifier</button>
                </article>
            </div>
        </template>
    </template>
</div>

<script type="module" src="js/admin.js"></script>

<?php include __DIR__ . "/includes/pied.php"; ?>