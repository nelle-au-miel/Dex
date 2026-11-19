<?php
$id = $_GET["id"] ?? "";

if (!is_string($id)) {
    $id = "";
}
if (!preg_match('/^[a-z0-9-]{1,30}$/', $id)) {
    http_response_code(404);
    include __DIR__ . "/404.php";
    exit;
}

$titre = "Travail";
include __DIR__ . "/includes/entete.php";
?>

<div id="app" v-cloak data-travail-id="<?= htmlspecialchars($id) ?>">
    <p v-if="chargement">Chargement du travail…</p>
    <p v-else-if="erreur" class="erreur" role="alert">{{ erreur }}</p>

    <template v-else>
        <div class="entete-travail">
            <h1>{{ travail.titre }}</h1>
            <div class="cote">
                <span class="type">{{ travail.type === 'equipe' ? 'En équipe' : 'Individuel' }}</span>
                <span class="remise">Remise : {{ travail.remise.slice(0, 16) }}</span>
            </div>
        </div>
        <p>{{ travail.description }}</p>

        <p v-if="!travail.ouvert" class="erreur">Ce travail est fermé : on ne peut plus répondre.</p>

        <form @submit.prevent="enregistrer">
            <div class="champs">
                <label>Matricule <input v-model="matricule" maxlength="20" :disabled="!travail.ouvert"></label>
                <label>Nom <input v-model="nom" maxlength="100" :disabled="!travail.ouvert"></label>
            </div>

            <h2>Mes disponibilités</h2>
            <p class="infos">Les créneaux qui conviennent au plus grand nombre sont en vert.</p>

            <p v-if="disponibilites.length === 0">Aucun créneau proposé.</p>
            <label v-for="d in disponibilites" :key="d.id" class="creneau"
                :class="{ meilleur: meilleurs.includes(d.id) }">
                <input type="checkbox" :value="d.id" v-model="choisis" :disabled="!travail.ouvert">
                <span class="heure">{{ d.debut.slice(0, 16) }} → {{ d.fin.slice(11, 16) }}</span>
                <span class="nombre">{{ d.nombre_etudiants }} disponible(s)</span>
            </label>

            <ul v-if="erreursForm.length > 0" class="erreur" role="alert">
                <li v-for="m in erreursForm" :key="m">{{ m }}</li>
            </ul>
            <p v-if="succes" class="succes" role="status">Réponse enregistrée.</p>

            <button type="submit" class="bouton" :disabled="!travail.ouvert">Enregistrer</button>
        </form>

        <h2>Toutes les disponibilités</h2>
        <p v-if="avecReponses.length === 0" class="infos">Personne n'a encore répondu.</p>
        <div class="reponses-liste">
            <div v-for="d in avecReponses" :key="d.id" class="reponses">
                <h3>{{ d.debut.slice(0, 16) }} → {{ d.fin.slice(11, 16) }}</h3>
                <ul>
                    <li v-for="n in d.noms.split(',')" :key="n">{{ n }}</li>
                </ul>
            </div>
        </div>
    </template>
</div>

<script type="module" src="js/travail.js"></script>

<?php include __DIR__ . "/includes/pied.php"; ?>