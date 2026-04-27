# Implémentation

Ce document décrit l'intégralité du code implémenté dans le prototype HomeOS, incluant les fonctionnalités pré-existantes et les 7 phases ajoutées lors de la dernière session de développement.

---

## 1. Vue d'ensemble du Projet

L'application est construite avec **React Native + Expo SDK 54** et un backend **Supabase** (PostgreSQL + Auth + Storage + Realtime). Elle supporte deux personas — locataire et propriétaire — chacun avec sa propre navigation en onglets et ses propres écrans.

### Statistiques du Projet

| Métrique | Valeur |
|----------|--------|
| Écrans implémentés | 28 |
| Hooks personnalisés | 4 |
| Contextes React | 2 |
| Composants réutilisables | 8 |
| Fichiers de navigation | 3 |
| Tables Supabase | 12 |
| Langues supportées | 2 (EN/FR) |
| Dépendances natives | 12 |

---

## 2. Infrastructure et Configuration

### 2.1. Point d'Entrée — `App.tsx`

Le fichier racine enveloppe l'application dans deux contextes globaux :

```
AuthProvider          → session, profil, persona, signOut, refreshProfile
  └─ LanguageProvider → locale, setLocale(), t() — traductions EN/FR
       └─ SafeAreaProvider
            └─ AppNavigator
```

### 2.2. Navigation — `AppNavigator.tsx`

Routage conditionnel basé sur :
1. `isLoading` → écran de chargement
2. `!session` → `LoginScreen`
3. `isNewUser` → `OnboardingFlow`
4. `persona === 'tenant'` → `TenantTabs`
5. `persona === 'landlord'` → `LandlordTabs`

Écrans globaux accessibles peu importe le persona : `RequestDetailScreen`, `SecurityPrivacyScreen`, `PaymentMethodsScreen`, `NotificationsScreen`, `NotificationCenterScreen`, `LegalAdvisorScreen`.

### 2.3. Authentification — `AuthContext.tsx`

Fournit via `useAuth()` :
- `user` — objet Supabase Auth
- `session` — JWT actif
- `persona` — `'tenant'` | `'landlord'`
- `profile` — données de `project_profiles`
- `isNewUser` — booléen pour flux d'onboarding
- `signOut()`, `refreshProfile()`, `setPersona()`

### 2.4. Internationalisation — `LanguageContext.tsx` + `i18n/`

- Détection de la langue du dispositif via `expo-localization`
- Dictionnaires : `src/i18n/en.ts` et `src/i18n/fr.ts` (~200 clés couvrant tous les écrans)
- `setLocale(lang)` → re-render instantané de toute l'interface
- La préférence est persistée dans `project_profiles.preferred_language`

---

## 3. Écrans Partagés (Tous Personas)

### 3.1. `LoginScreen.tsx`
- Authentification par email/mot de passe via Supabase Auth
- Sélection du persona (locataire / propriétaire) avec `PersonaToggle`
- Inscription avec création automatique du profil dans `project_profiles`
- Lien magique (passwordless) optionnel

### 3.2. `OnboardingFlow.tsx`
- Flux multi-étapes pour les nouveaux utilisateurs
- Collecte : nom complet, numéro de téléphone, type de logement
- Pour les propriétaires : ajout du premier immeuble
- Marque le profil comme complet (`is_new_user = false`)

### 3.3. `RequestDetailScreen.tsx`
- Affichage détaillé d'une demande de maintenance (titre, description, statut, photos)
- Messagerie asynchrone en temps réel via `useMessages`
- **[Propriétaire]** : bouton « DISPATCH VENDOR » → navigation vers `DispatchVendorScreen`
- Téléchargement d'images depuis Supabase Storage

### 3.4. `NewRequestScreen.tsx`
- Formulaire guidé pour soumettre une demande de maintenance
- Sélecteur de type de problème (plomberie, électricité, chauffage, etc.)
- Prise de photos guidée avec `GuidedCamera`
- Analyse IA préliminaire via `AIScanner`
- Niveau d'urgence (faible / moyen / élevé)
- Création dans `project_requests`

### 3.5. `ActivityScreen.tsx`
- **[Locataire]** : liste des demandes propres avec statut coloré
- **[Propriétaire]** : bons de travail actifs avec boutons d'action (ARRIVÉ / TERMINÉ / ANNULER)
- Résolutions passées dans un onglet séparé
- Mise à jour du statut `project_work_orders` en temps réel

### 3.6. `NotificationCenterScreen.tsx`
- Centre de notifications in-app
- Marquage lu/non-lu individuel et global
- Horodatage relatif ("il y a 5 min")
- Badge de compteur sur l'icône via `useUnreadNotificationCount`

### 3.7. `NotificationsScreen.tsx`
- Paramètres de notifications push (toggles par type d'alerte)
- Persistance dans `project_profiles`

### 3.8. `ProfileScreen.tsx` *(Phase 6 — amélioré)*
- Carte d'identité digitale avec avatar, nom, rôle
- **Mode édition** (toggle crayon) : nom, téléphone, langue
- Upload avatar → Supabase Storage (bucket `avatars`)
- Sélecteur de langue EN/FR avec mise à jour instantanée via `setLocale()`
- Menu vers Security, Digital Keys, Payment Methods, Notifications
- Déconnexion

### 3.9. `SecurityPrivacyScreen.tsx`
- Paramètres de sécurité : Face ID / empreinte digitale
- Droits Loi 25 (vie privée québécoise)
- Historique des connexions

### 3.10. `PaymentMethodsScreen.tsx`
- Gestion des méthodes de paiement sauvegardées
- Affichage des cartes/comptes bancaires liés

### 3.11. `LivingGuideDetailScreen.tsx` *(Phase 5 — complet)*
- Données récupérées depuis `project_building_services` selon catégorie
- **WiFi** : SSID + mot de passe avec affichage/masquage et copie dans le presse-papiers
- **Énergie / Eau** : dernière facture, historique, relevés de compteurs
- **Déchets** : calendrier de collecte, recyclage
- États vides informatifs si non configuré

### 3.12. `LegalAdvisorScreen.tsx`
- Conseiller juridique IA intégré (CCQ + TAL)
- Chat avec LLM pour questions sur les droits et obligations locateur/locataire

### 3.13. `ProSourcingScreen.tsx`
- Sourcing automatique de professionnels via géolocalisation
- Présentation des pros recommandés par catégorie

---

## 4. Écrans Locataire

### 4.1. `TenantHomeScreen.tsx` *(Phase 4 — amélioré)*
- En-tête dynamique avec nom d'unité et immeuble
- Bouton **SIGNALER UN PROBLÈME** → `NewRequestScreen`
- **Carte PAY RENT** : montant réel du loyer depuis `project_units`, navigation → `RentPaymentScreen`
- Raccourcis Guide Résidentiel (WiFi, déchets, énergie, eau, légal)
- Liste des demandes actives avec statut coloré
- Métriques de vitalité de l'unité
- Abonnement Realtime pour mises à jour automatiques
- Multilingue via `useLanguage`

### 4.2. `RentPaymentScreen.tsx` *(Phase 4 — nouveau)*
- Montant dû récupéré depuis `project_units`
- Indicateur "DÉJÀ PAYÉ CE MOIS" si paiement existant dans le ledger
- Sélection méthode : Virement bancaire / Carte de crédit
- Création d'une entrée `project_ledger` au statut `pending`
- Navigation → `PaymentConfirmationScreen`

### 4.3. `PaymentHistoryScreen.tsx` *(Phase 4 — nouveau)*
- Liste chronologique des paiements depuis `project_ledger`
- Badges de statut : setteld (vert), pending (orange), unpaid (rouge)

### 4.4. `PaymentConfirmationScreen.tsx` *(Phase 4 — nouveau)*
- Reçu de paiement : montant, propriété, méthode, date, heure, statut
- Bouton retour vers l'accueil

### 4.5. `DigitalKeycardScreen.tsx`
- Clé numérique de secours avec QR code
- Scan FOB simulé
- Historique des accès

---

## 5. Écrans Propriétaire

### 5.1. `ManagerHomeScreen.tsx` *(Phase 2 — données réelles)*
- **Score Portefeuille** calculé dynamiquement (occupancy × 40 + requests × 20 + finances × 40)
- **Ratio Opex** = dépenses / revenus depuis `project_ledger`
- **Fin de bail** : nombre d'unités avec bail expirant dans 60 jours
- Pool de résolution prioritaire : demandes `pending` avec ancienneté
- Télémétrie : taux d'occupation, bons de travail actifs, revenus, dépenses
- Navigation → `NotificationCenter`, `Calendar`

### 5.2. `PortfolioHubScreen.tsx`
- Liste de tous les immeubles du propriétaire
- Statistiques par immeuble : unités, occupation, revenus
- Navigation → `BuildingDetailScreen`, `AddBuildingScreen`

### 5.3. `BuildingDetailScreen.tsx`
- Détail d'un immeuble : unités, locataires, demandes en cours
- Gestion des unités (ajout, édition)

### 5.4. `AddBuildingScreen.tsx`
- Formulaire d'ajout d'immeuble : nom, adresse, type
- Géocodage de l'adresse pour la carte

### 5.5. `TreasuryTerminalScreen.tsx` *(Phase 3 — données réelles)*
- **Liquidité nette** calculée sur 30 jours depuis `project_ledger`
- Revenus et dépenses mensuels avec tendance vs. mois précédent
- Alertes visuelles si montants pending ou overdue
- Filtres : TOUT / RÉGLÉ / EN ATTENTE / IMPAYÉ
- **Export CSV** via `Share` (liste des transactions filtrées)
- Journal des transactions en temps réel

### 5.6. `VendorNetworkScreen.tsx`
- Réseau de fournisseurs du propriétaire (`project_landlord_vendors`)
- Appel direct, SMS, retrait du réseau

### 5.7. `VendorDiscoveryScreen.tsx` *(Phase 7 — amélioré)*
- Carte interactive (`react-native-maps`) avec marqueurs géolocalisés
- Filtres par catégorie (plombier, électricien, HVAC, etc.) et "Vérifié"
- **Section RECOMMANDÉS** : top 5 fournisseurs scorés (rating × 20 + vérifié : +15 + dans réseau : +10)
- **Bouton IMPORT** (icône Upload) → `ContactPickerScreen`
- Fiche fournisseur : Appeler, SMS, Naviguer, Ajouter au réseau

### 5.8. `DispatchVendorScreen.tsx` *(Phase 1 — nouveau)*
- Sélection fournisseur depuis le réseau personnel
- Planification : sélecteur de date et heure (`@react-native-community/datetimepicker`)
- Coût estimé et notes
- Création simultanée : `project_work_orders` + `project_appointments` + notification locataire

### 5.9. `ContactPickerScreen.tsx` *(Phase 7 — nouveau)*
- Lecture des contacts du téléphone via `expo-contacts`
- Recherche en temps réel par nom ou numéro
- Sélection + choisir une spécialité (Plomberie, Électricité, HVAC, etc.)
- Import → création dans `project_vendors` + ajout dans `project_landlord_vendors`

### 5.10. `CalendarScreen.tsx`
- Calendrier des rendez-vous et des fins de bail
- Vue mensuelle avec indicateurs

---

## 6. Hooks Personnalisés

### `useLandlordMetrics.ts` *(Phase 2)*
Calcule en une seule requête les métriques clés du portefeuille :
- Taux d'occupation (unités occupées / total)
- Ratio opex (dépenses / revenus sur 30 jours)
- Nombre de fins de bail dans 60 jours
- Bons de travail actifs
- Score portefeuille pondéré (0–100)

### `useTreasuryData.ts` *(Phase 3)*
- Liquidité nette sur 30 jours
- Revenus et dépenses mensuels
- Tendance vs. mois précédent (% de variation)
- Totaux pending et overdue
- Filtrage multi-critères
- Génération de CSV pour export

### `useMessages.ts`
- Abonnement Realtime aux messages d'une demande
- Envoi de messages avec création dans Supabase

### `useNotifications.ts`
- Compteur de notifications non lues en temps réel
- Marquage lu/non-lu individuel et global

---

## 7. Composants Réutilisables

| Composant | Description |
|-----------|-------------|
| `GlassCard` | Carte avec effet vitré (`rgba` + border), utilisée dans tous les écrans |
| `StatsCard` | Carte numérique avec label, valeur, tendance (flèche haut/bas) |
| `Button` | Bouton standardisé avec variantes (primary, outline, danger) |
| `Input` | Champ de saisie stylistiquement cohérent avec le thème |
| `Card` | Conteneur générique avec ombre légère |
| `PersonaToggle` | Sélecteur locataire / propriétaire avec animation |
| `AIScanner` | Wrapper d'analyse IA pour les photos de demandes |
| `GuidedCamera` | Caméra avec guide de cadrage pour photos de maintenance |

---

## 8. Schéma de Base de Données

Le fichier `supabase_schema.sql` contient l'intégralité du DDL. Les politiques RLS garantissent que chaque utilisateur n'accède qu'à ses propres données.

### Tables Principales

```sql
project_profiles       -- Profils utilisateurs (nom, téléphone, langue, avatar)
project_buildings      -- Immeubles (landlord_id, adresse, nom)
project_units          -- Unités (building_id, tenant_id, loyer, superficie)
project_requests       -- Demandes de maintenance (tenant_id, unit_id, statut, urgence)
project_work_orders    -- Bons de travail (request_id, vendor_id, coût, horaire)
project_appointments   -- Rendez-vous (work_order_id, vendor_id, date, statut)
project_vendors        -- Fournisseurs (nom, spécialité, GPS, note, is_custom)
project_landlord_vendors-- Réseau propriétaire ↔ fournisseur
project_ledger         -- Registre financier (loyers, dépenses, statut)
project_notifications  -- Notifications in-app (user_id, type, lu)
project_building_services-- Services immeuble (WiFi SSID/MDP, horaires déchets)
project_utility_usage  -- Relevés compteurs (unit_id, type, valeur, date)
```

---

## 9. Séquence d'Intégration (Chronologie)

| Ordre | Fonctionnalité | Statut antérieur | Changement apporté |
|-------|----------------|------------------|--------------------|
| Pré-existant | Login, Onboarding, AuthContext | ✅ Complet | — |
| Pré-existant | Navigation (AppNavigator, TenantTabs, LandlordTabs) | ✅ Complet | +3 écrans tenant, +2 landlord |
| Pré-existant | NewRequestScreen + GuidedCamera + AIScanner | ✅ Complet | — |
| Pré-existant | RequestDetailScreen + messagerie | ✅ Complet | + bouton DISPATCH VENDOR |
| Pré-existant | PortfolioHub, BuildingDetail, AddBuilding | ✅ Complet | — |
| Pré-existant | VendorNetwork, VendorDiscovery (base) | ✅ Complet | + recommandations scorées + IMPORT |
| Pré-existant | Calendar, DigitalKeycard, LegalAdvisor | ✅ Complet | — |
| Pré-existant | SecurityPrivacy, PaymentMethods, Notifications | ✅ Complet | — |
| Pré-existant | NotificationCenter, useNotifications | ✅ Complet | — |
| **Phase 1** | DispatchVendorScreen | 🆕 Nouveau | — |
| **Phase 1** | ActivityScreen landlord (ARRIVÉ/TERMINÉ/ANNULER) | 🔄 Refactorisé | Ancien : lecture seule |
| **Phase 2** | useLandlordMetrics + ManagerHomeScreen (réel) | 🔄 Refactorisé | Ancien : données figées |
| **Phase 3** | useTreasuryData + TreasuryTerminalScreen (réel) | 🔄 Refactorisé | Ancien : données figées |
| **Phase 4** | RentPaymentScreen, PaymentHistory, Confirmation | 🆕 Nouveau | — |
| **Phase 4** | TenantHomeScreen : carte PAY RENT | 🔄 Amélioré | Ajout carte loyer dynamique |
| **Phase 5** | LivingGuideDetailScreen (données réelles) | 🔄 Refactorisé | Ancien : données statiques |
| **Phase 6** | ProfileScreen : edit mode + avatar + i18n | 🔄 Refactorisé | Ancien : lecture seule |
| **Phase 7** | ContactPickerScreen | 🆕 Nouveau | — |
| **Phase 7** | VendorDiscoveryScreen : recommandations + IMPORT | 🔄 Amélioré | Ajout scoring + import |
| **i18n** | LanguageContext + en.ts + fr.ts | 🆕 Nouveau | Bilingue EN/FR temps réel |
