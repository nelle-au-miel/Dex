# TP2 - Application Dex

Un outil permettant aux étudiants de mettre leurs diponibilités pour chaque travaux et aux professeurs de modifier/supprimer ces travaux et leurs créneaux.

Il y a trois grandes parties à ce projet...
- une API construite avec Expresss (Node.js) qui communique avec la base de données.
- un site PHP qui fournit le cadre commun des pages (en-tête, pied de page) et le routage.
- une interface Vue.js qui affiche les données, gère les interactions utilisateur puis communique avec l'API.

## Fonctionnalités

Un étudiant peut...
- Consulter la liste de travaux ouverts;
- Filtre cette liste par cours;
- Choisir ses disponibilités à l'aide de son matricule, son nom et un choix de disponibilités.

Un enseignant peut...
- Consulter la liste de travaux ouverts;
- Se connecter à son compte en tant qu'administrateur
- Modifier un travail de son propre cours seulement;
- Ajouter, modifier et supprimer un créneau pour un travail.

## Installation / Exécution de init.sql

1. Ouvrir XAMPP -> MySQL (Admin)
2. Dans phpMyAdmin -> Menu en haut à gauche
3. Importer et choisir le fichier .sql qui se trouve dans la racine du dossier du projet.

## Démarrage de l’API

Dans le dossier du projet, ouvrir un terminal et taper...
#### cd dex-ap
#### npm install
#### npm run start

## Comptes de démonstration

Il y a deux comptes enseignants :
|      Nom       |    ID     |    Mdp    |
|----------------|-----------|-----------|
| Claire Dubois  |   prof    |  dex2026  |
| Marc Tremblay  |   prof2   |  web2026  |

---
[JLatortue](https://github.com/nelle-au-miel)
