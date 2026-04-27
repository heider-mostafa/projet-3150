# Introduction

## 1. Contexte et Problématique

Le marché locatif montréalais est dominé à 60–70 % par de petits propriétaires gérant leurs immeubles de façon informelle — par messages textes, appels et courriels non structurés. Cette réalité génère des inefficacités majeures : demandes de maintenance perdues ou oubliées, absence de traçabilité pour les deux parties, retards de paiement, et disputes légales évitables.

Selon la SCHL (2025), environ 500 000 unités locatives existent à Montréal, dont ~30 % des conflits locataires–propriétaires sont liés à des problèmes de maintenance non documentés (FRAPRU). Les outils existants (Buildium, Avail, DoorLoop) ciblent principalement le marché américain et s'adressent à des gestionnaires professionnels avec des budgets significatifs.

## 2. Objectif du Projet

**HomeOS** est une application mobile (iOS/Android) conçue pour les petits propriétaires et leurs locataires à Montréal. Elle vise à :

1. **Structurer** le processus informel de maintenance résidentielle bout en bout.
2. **Centraliser** la communication, la gestion des demandes, le dispatch de fournisseurs et la comptabilité dans une seule interface.
3. **Automatiser** les tâches répétitives : métriques de portefeuille en temps réel, flux de paiement de loyer, découverte de fournisseurs géolocalisés.
4. **Respecter** le cadre légal québécois (Loi 25, TAL) avec support bilingue (français/anglais).

## 3. Portée du Prototype

Le prototype implémenté couvre deux personas distincts :

- **Locataire** : Soumission de demandes de maintenance, paiement de loyer, guide résidentiel (WiFi, énergie, eau, déchets), profil éditable.
- **Propriétaire** : Tableau de bord de portefeuille temps réel, gestion des bons de travail, dispatch de fournisseurs, trésorerie avec export CSV, réseau de fournisseurs géolocalisé.

## 4. Structure du Rapport

| Section | Contenu |
|---------|---------|
| [Analyse](analyse.md) | Données de marché, état de l'art, lacunes identifiées |
| [Conception](conception.md) | Architecture technique, schéma de BD, flux de données |
| [Implémentation](implementation.md) | Détail des 7 phases de développement |
| [Résultats](resultat.md) | Fonctionnalités livrées, démonstration, limitations |
| [Évaluation](evaluation.md) | Stratégie de test, résultats, métriques qualité |
| [Références](references.md) | Sources, bibliothèques, APIs utilisées |

## Version LaTeX du rapport final

Une version consolidée en LaTeX est disponible ici :

- `docs/rapport/rapport_final.tex`

Compilation locale (exemple) :

```bash
cd docs/rapport
pdflatex rapport_final.tex
```
