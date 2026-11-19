<?php
$titre = "Accueil";
include __DIR__ . "/includes/entete.php";
?>

<div id="app" v-cloak>
    <h1>Travaux ouverts</h1>

    <div class="filtres">
        <button :class="{ actif: coursChoisi === '' }" @click="choisirCours('')">Tous</button>
        <button
            v-for="c in cours"
            :key="c.id"
            :class="{ actif: coursChoisi === c.id }"
            @click="choisirCours(c.id)">{{ c.titre }}</button>
    </div>

    <p v-if="chargement">Chargement des travaux…</p>
    <p v-else-if="erreur" class="erreur" role="alert">{{ erreur }}</p>
    <p v-else-if="travaux.length === 0">Aucun travail ouvert pour ce cours.</p>
    <div v-else class="liste">
        <article v-for="t in travaux" :key="t.id" class="carte">
            <h2>{{ t.titre }}</h2>
            <p>{{ t.description }}</p>
            <p class="infos">{{ t.type === 'equipe' ? 'En équipe' : 'Individuel' }}</p>
            <p class="infos">Remise : {{ t.remise.slice(0, 16) }}</p>
            <a :href="'travail.php?id=' + t.id">Choisir mes disponibilités</a>
        </article>
    </div>
</div>

<script type="module" src="js/index.js"></script>

<?php include __DIR__ . "/includes/pied.php"; ?>