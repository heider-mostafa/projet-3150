# Résultats & Discussion

## 1. Résultat global du projet

Le prototype **HomeOS** est aujourd’hui fonctionnel de bout en bout pour les deux personas ciblés (locataire et propriétaire), avec une architecture unifiée mobile + backend Supabase et des fonctionnalités réellement exploitables en contexte montréalais.

Les livrables finaux couvrent :

- la création et le suivi des demandes de maintenance avec diagnostic IA,
- la gestion propriétaire (portefeuille, dispatch fournisseur, calendrier),
- la couche financière (paiement du loyer et historique),
- les communications in-app (messages, notifications),
- la sécurité des données (RLS),
- l’expérience bilingue FR/EN.

---

## 2. Portée fonctionnelle livrée

### 2.1 Vue d’ensemble chiffrée

Mesuré directement dans le code source (`mobile-app/src`) :

| Indicateur | Valeur |
|---|---:|
| Écrans React Native | 29 |
| Hooks personnalisés | 4 |
| Composants réutilisables | 8 |
| Fichiers de navigation | 3 |
| Tables principales Supabase (`project_*`) | 19 |
| Personas supportés | 2 |
| Langues supportées | 2 (FR/EN) |

### 2.2 Persona locataire (fonctionnel)

Le parcours locataire est opérationnel :

1. Déclarer un incident (catégorie, urgence, description, photos),
2. Obtenir un diagnostic IA structuré (cause probable, gravité, urgence, estimation coût),
3. Soumettre la demande et suivre l’avancement,
4. Payer le loyer et consulter l’historique des paiements,
5. Consulter le guide résidentiel (WiFi, eau, énergie, déchets),
6. Accéder à l’assistant légal IA.

### 2.3 Persona propriétaire (fonctionnel)

Le parcours propriétaire est également complet :

1. Voir les immeubles et unités du portefeuille,
2. Visualiser les demandes prioritaires,
3. Consulter et enrichir le réseau de fournisseurs,
4. Dispatcher un fournisseur (création de work order + rendez-vous + notification),
5. Suivre l’activité opérationnelle en temps réel,
6. Consulter les métriques portefeuille et la trésorerie.

---

## 3. Données et backend : ce qui a réellement été stabilisé

Le backend s’appuie sur Supabase (Auth + PostgreSQL + Storage + Realtime) avec séparation des responsabilités.

### 3.1 Modèle de données

Les tables critiques utilisées en exploitation :

- `project_profiles`, `project_buildings`, `project_units`,
- `project_requests`, `project_work_orders`, `project_appointments`,
- `project_vendors`, `project_landlord_vendors`,
- `project_notifications`, `project_messages`,
- `project_utility_ledger`, `project_building_services`, `project_utility_usage`.

### 3.2 RLS et cohérence de visibilité

Le projet a mis en évidence un point très important : même avec des données présentes en base, un dashboard peut apparaître vide si les politiques RLS ne reflètent pas correctement la logique métier (owner_id, landlord_id, tenant_id).  
La correction des politiques de lecture/écriture a permis d’obtenir une visibilité cohérente des mêmes données entre les deux personas.

### 3.3 Données de démonstration

Un seed idempotent a été introduit pour alimenter les scénarios de démo sans suppression destructive, avec :

- immeuble + unités,
- demandes (pending/in_progress),
- work order dispatché,
- fournisseurs liés au propriétaire,
- notifications et rendez-vous.

Ce point est essentiel pour garantir des démonstrations reproductibles.

---

## 4. Apport de l’IA : utile, mesurable, non cosmétique

L’IA n’a pas été ajoutée comme “gadget”. Elle intervient dans des tâches à forte valeur :

### 4.1 Diagnostic maintenance

Dans `NewRequestScreen`, le modèle Gemini renvoie un JSON structuré :

- `probable_cause`,
- `severity` (1–5),
- `urgency`,
- estimation de coût min/max,
- corps de métier recommandé,
- prochaines actions.

Impact : meilleure priorisation et réduction de l’ambiguïté initiale entre locataire et propriétaire.

### 4.2 Assistant légal locatif

`LegalAdvisorScreen` exploite Gemini avec contraintes explicites :

- contexte CCQ/TAL,
- citation d’article juridique,
- réponse dans la langue de l’utilisateur,
- rappel de non-substitution au conseil juridique.

Impact : amélioration de l’accès à l’information légale de base, surtout pour les utilisateurs non experts.

### 4.3 IA pendant le développement

L’IA a aussi accéléré la livraison côté ingénierie (prototypage de scripts, rédaction structurée, itérations).  
Mais les résultats utiles ont nécessité validation et correction humaine (ex. ajustements SQL, RLS, cohérence des seeds), ce qui confirme une logique “IA assistée, décision humaine”.

---

## 5. Discussion : ce que le prototype prouve

Le prototype démontre qu’il est possible de :

- structurer un flux locatif traditionnellement informel,
- réduire la friction de communication locataire/propriétaire,
- centraliser l’exécution (demande → dispatch → suivi → notification),
- ajouter une couche IA qui améliore la qualité opérationnelle au lieu d’alourdir l’UX.

En pratique, HomeOS se positionne comme un **système opérationnel léger** pour petits propriétaires, plutôt qu’un simple démonstrateur d’interface.

---

## 6. Limites observées

- Pas encore de suite E2E automatisée (validation surtout manuelle/scénarios),
- Certaines dépendances externes (Gemini, Maps) peuvent affecter la stabilité selon les clés/API quotas,
- Le volet paiement reste orienté prototype (pas de pipeline financier certifié en production),
- Le reporting analytique peut être enrichi (comparatifs temporels plus avancés).

---

## 7. Conclusion de la section résultats

Le projet atteint son objectif principal : transformer un problème réel de coordination locative en une application cohérente, bilingue, sécurisée, et suffisamment riche pour soutenir une démonstration crédible de valeur terrain.
