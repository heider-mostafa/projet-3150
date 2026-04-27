# Évaluation & Tests

## 1. Objectif de l’évaluation

L’évaluation a été conçue pour répondre à trois questions :

1. **Fonctionnalité** : les parcours critiques locataire/propriétaire sont-ils réellement exécutables ?
2. **Fiabilité des données** : les informations visibles dans l’app correspondent-elles aux données réelles en base (Supabase) ?
3. **Valeur de l’IA** : les modules IA améliorent-ils la décision opérationnelle (et pas seulement l’apparence) ?

---

## 2. Méthodologie d’évaluation

Approche utilisée :

- **Tests manuels scénarisés** sur les flux end-to-end,
- **Contrôle croisé frontend ↔ SQL** pour valider l’état réel des données,
- **Vérification des politiques RLS** pour confirmer la visibilité selon persona,
- **Tests d’acceptation métier** sur les scénarios de démonstration (dispatch, priorisation, paiement, notifications).

Environnement :

- Mobile : Expo / React Native,
- Backend : Supabase (Auth, PostgreSQL, Storage, Realtime),
- Données de démonstration : seed idempotent dédié.

---

## 3. Matrice de validation fonctionnelle

| Domaine | Scénario testé | Résultat |
|---|---|---|
| Auth & Personas | Connexion avec deux comptes distincts (locataire/propriétaire) | ✅ Validé |
| Profil | Mise à jour avatar + champs profil | ✅ Validé |
| Demandes maintenance | Création d’une demande avec catégorie, urgence, photos | ✅ Validé |
| Diagnostic IA | Génération d’un diagnostic structuré dans la demande | ✅ Validé |
| Dashboard locataire | Affichage des demandes actives et statut | ✅ Validé |
| Dashboard propriétaire | Affichage immeubles + demandes prioritaires | ✅ Validé |
| Réseau fournisseurs | Affichage des fournisseurs liés au propriétaire | ✅ Validé |
| Dispatch fournisseur | Création work order + rendez-vous + notification locataire | ✅ Validé |
| Activité | Visibilité du dispatch côté locataire et propriétaire | ✅ Validé |
| Calendrier propriétaire | Affichage du rendez-vous dispatché | ✅ Validé |
| Paiement loyer | Création/lecture des entrées de ledger | ✅ Validé |
| Notification center | Affichage des notifications in-app | ✅ Validé |
| Living Guide | Lecture des services bâtiment (wifi/eau/énergie/déchets) | ✅ Validé |
| Assistant légal IA | Réponse contextualisée CCQ/TAL avec citation | ✅ Validé |

---

## 4. Évaluation backend et sécurité (RLS)

### 4.1 Ce qui a été observé

Un point clé est apparu durant la validation :

- les données étaient présentes en base,
- mais certains écrans propriétaire restaient vides.

Cause : politiques RLS incomplètes/inadéquates pour certains accès `SELECT/UPDATE` (buildings, requests, work_orders, appointments, landlord_vendors).

### 4.2 Correctifs appliqués

- Réalignement des politiques sur `auth.uid()` et les relations métier (`owner_id`, `landlord_id`, `tenant_id`),
- vérification de la cohérence persona dans `project_profiles`,
- consolidation des données de démo pour correspondre aux contraintes RLS.

### 4.3 Conclusion sécurité

L’architecture RLS est pertinente et robuste, mais impose une discipline stricte :
les politiques font partie du produit, pas seulement de l’infrastructure.

---

## 5. Évaluation de l’apport IA

## 5.1 Diagnostic maintenance

Critères observés :

- sortie structurée exploitable (cause, sévérité, urgence, coûts, trade),
- cohérence globale avec la description utilisateur,
- intégration réelle au flux (urgence suggérée, données persistées).

Résultat : **apport opérationnel concret** pour la priorisation et la communication.

## 5.2 Assistant légal

Critères observés :

- pertinence de la réponse dans le contexte locatif,
- présence de référence juridique (article CCQ/TAL),
- clarté du message et avertissement non-conseil juridique.

Résultat : **utile comme support d’information**, sans remplacer un avis professionnel.

---

## 6. Qualité logicielle et maintenabilité

Points positifs :

- architecture modulaire (screens/hooks/components/context),
- séparation claire des responsabilités frontend/backend,
- centralisation du modèle de données dans `supabase_schema.sql`,
- i18n intégré dès l’architecture (FR/EN),
- hooks analytiques dédiés (`useLandlordMetrics`, `useTreasuryData`).

Points d’attention :

- pas encore de pipeline automatisé de tests E2E/UI,
- certains flux restent sensibles à la qualité des données seed,
- dépendance aux APIs externes (Gemini/Maps).

---

## 7. Limites de l’évaluation

- Évaluation principalement manuelle et orientée scénarios,
- Absence de benchmark de charge à grande échelle,
- Évaluation UX quantitative (SUS/NPS) non formalisée à ce stade,
- Pas de tests d’intrusion sécurité avancés dans le cadre du prototype.

---

## 8. Recommandations pour la suite

1. Ajouter une suite de tests automatisés (unitaires + intégration + E2E),
2. Introduire des tests de non-régression RLS (SQL policy tests),
3. Mettre en place un protocole UX formel (SUS, temps de tâche, taux d’erreur),
4. Ajouter un monitoring applicatif (erreurs, latence, taux d’échec API IA),
5. Renforcer la robustesse du mode dégradé quand l’IA est indisponible.

---

## 9. Synthèse

Le prototype satisfait les objectifs principaux de validation :  
**les flux critiques sont exécutables, la donnée est cohérente, et l’IA apporte une valeur réelle** (diagnostic, guidance, réduction de friction).  
La prochaine étape n’est pas de “prouver l’idée”, mais de professionnaliser la qualité logicielle (tests automatiques, observabilité, hardening production).
