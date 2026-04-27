# Conception

## 1. Architecture du Système

L'innovation réside dans l'intégration de la **découverte automatique de services** et du **diagnostic assisté par IA**. Architecture client-serveur modulaire, scalable.

### 1.1. Pile Technologique (Tech Stack)

- **Frontend** : React.js (web) + React Native (applications mobiles iOS/Android). Pourquoi ? Rapide, basé sur composants pour une UI simple (formes de demandes, tableaux de bord) ; i18next pour support bilingue (anglais/français).  
- **Backend & Infrastructure (Supabase)** :  
  - **PostgreSQL** : Relationnel pour données structurées (demandes, utilisateurs, baux).  
  - **Supabase Auth** : Authentification sécurisée (JWT/OAuth ; liens magiques pour utilisateurs non-tech).  
  - **Edge Functions** : Logique côté serveur (appels LLM, API Maps).  
  - **Supabase Storage** : Stockage sécurisé pour photos, baux.  
- **Intelligence Artificielle** :  
  - **LLM (GPT-4o-mini ou Mistral open-source)** : Diagnostics préliminaires avec rapports.  
  - **Vision API / OCR (Tesseract/Google Vision)** : Analyse d'images pour problèmes.  
- **Logistique** : API Google Maps (Places) pour sourcing automatique de pros (plombiers, etc.) dans rayon 5-10 km.  
- **Notifications/Temps Réel** : Firebase (push/email/SMS) ou Socket.io.  
- **Auth/Sécurité** : OAuth (Google/Apple) + JWT ; Cloudflare pour DDoS ; Row Level Security (RLS) dans Supabase pour confidentialité des données (RGPD/Loi 25 Québec).  
- **Hébergement/Déploiement** : AWS/Heroku (niveau gratuit pour prototype) ; Supabase pour développement rapide.  
- **Outils Additionnels** : Stripe/PayPal pour premiums ; Google Analytics ; i18n.  

---

## 2. Fonctionnement Détaillé et Innovations

### 2.1. Onboarding "Zero-Config" (Le pivot stratégique)

1. **Inscription** : Utilisateur (propriétaire/locataire) entre profil.  
2. **Sourcing Auto Pros** : Entrer adresse immeuble ; API Google Maps scanne rayon 5-10 km, sélectionne 3 par catégorie (plomberie, électricité, chauffage, toiture, serrurerie) basé sur avis élevés.  
3. **Personnalisation** : Propriétaire valide/ajoute réseau personnel.  

### 2.2. Flux de Traitement d'une Demande

1. **Soumission par Locataire** : Formulaire structuré (type problème, description, localisation, urgence) ; téléchargement multiples photos (min 3 angles).  
2. **Analyse IA Préliminaire** : OCR extrait détails (ex. numéros modèles) ; LLM diagnostique (ex. "Fuite d'eau probable – urgence moyenne, coût est. 50-150 $"). Suggère priorisation. Locataire valide/soumet.  
3. **Réception par Propriétaire** : Notification push avec diagnostic, photos, recommandations pros (boutons appel direct).  
4. **Priorisation et Assignation** : Tableau de bord centralise ; priorise auto (urgence, impact, ancienneté) ; propriétaire assigne à pro ou soi-même.  
5. **Traitement et Suivi** : Messagerie asynchrone ; mises à jour statut en temps réel ("Soumise → Diagnostiquée → En cours → Résolue").  
6. **Clôture** : Propriétaire marque résolue avec preuves (photos après réparation, facture) ; locataire confirme/dispute.  

---

## 3. Schéma de Base de Données (Implémenté)

Le schéma PostgreSQL est hébergé sur Supabase avec Row Level Security (RLS) activé sur chaque table. Les tables principales sont :

| Table | Rôle | Clef(s) étrangère(s) principale(s) |
|-------|------|------------------------------------|
| `project_profiles` | Profils utilisateurs (nom, téléphone, langue, avatar) | `id → auth.users` |
| `project_buildings` | Immeubles (adresse, nom) | `landlord_id → profiles` |
| `project_units` | Unités locatives (numéro, loyer, superficie) | `building_id`, `tenant_id` |
| `project_requests` | Demandes de maintenance (description, statut, urgence) | `unit_id`, `tenant_id` |
| `project_work_orders` | Bons de travail (dispatch fournisseur, coût, horaire) | `request_id`, `vendor_id`, `landlord_id` |
| `project_vendors` | Fournisseurs (nom, spécialité, coordonnées GPS, note) | `created_by` |
| `project_landlord_vendors` | Réseau de fournisseurs par propriétaire | `landlord_id`, `vendor_id` |
| `project_ledger` | Registre financier (loyers, dépenses, statut) | `user_id`, `unit_id` |
| `project_notifications` | Notifications in-app | `user_id` |
| `project_appointments` | Rendez-vous de dispatch | `work_order_id`, `vendor_id` |
| `project_building_services` | Services par immeuble (WiFi SSID/MDP, collecte déchets) | `building_id` |
| `project_utility_usage` | Relevés de compteurs (énergie, eau) | `unit_id` |

### Politique RLS (principes)
- **Locataires** : accès lecture à leur unité, immeuble, demandes propres ; écriture sur leurs demandes.
- **Propriétaires** : accès total à leurs immeubles, unités, bons de travail, trésorerie.
- **Publique** : aucun accès sans authentification.

---

## 4. Architecture de Navigation (Implémentée)

```
App.tsx
├── AuthProvider
│   └── LanguageProvider
│       └── AppNavigator
│           ├── (Non authentifié) → LoginScreen, OnboardingFlow
│           ├── (Locataire) → TenantTabs
│           │   ├── Tab: HomeHub → TenantHomeScreen
│           │   ├── Tab: Activity → ActivityScreen
│           │   ├── Tab: Identity → ProfileScreen
│           │   └── Stack: NewRequest, LivingGuideDetail,
│           │             DigitalKeycard, RentPayment,
│           │             PaymentHistory, PaymentConfirmation
│           └── (Propriétaire) → LandlordTabs
│               ├── Tab: Executive → ManagerHomeScreen
│               ├── Tab: Assets → PortfolioHubScreen
│               ├── Tab: Treasury → TreasuryTerminalScreen
│               ├── Tab: Network → VendorNetworkScreen
│               └── Stack: BuildingDetail, AddBuilding,
│                         VendorDiscovery, Calendar,
│                         DispatchVendor, ContactPicker
```

---

## 5. Composants Réutilisables

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `GlassCard` | `components/GlassCard.tsx` | Carte vitrée omniprésente dans tous les écrans |
| `StatsCard` | `components/StatsCard.tsx` | Métriques chiffrées (dashboard propriétaire) |
| `useAuth` | `context/AuthContext.tsx` | Accès session, profil, persona dans tout écran |
| `useLanguage` | `context/LanguageContext.tsx` | Accès `t()` et `setLocale()` — traductions EN/FR |
| `useLandlordMetrics` | `hooks/useLandlordMetrics.ts` | Score portefeuille, occupation, opex, revenus |
| `useTreasuryData` | `hooks/useTreasuryData.ts` | Liquidité nette, flux mensuel, filtres, CSV |
| `useNotifications` | `hooks/useNotifications.ts` | Compteur de notifications non lues |

---

## 6. Internationalisation (i18n)

Support bilingue anglais/français implémenté via `i18n-js` + `expo-localization` :

- **Détection automatique** : La langue du dispositif est détectée au premier lancement via `expo-localization`.
- **Préférence persistée** : Le choix de l'utilisateur (`preferred_language`) est sauvegardé dans `project_profiles`.
- **Basculement instantané** : Le sélecteur de langue dans le profil appelle `setLocale()` → tous les écrans abonnés via `useLanguage()` re-renderisent immédiatement sans redémarrage.
- **Dictionnaires** : `src/i18n/en.ts` et `src/i18n/fr.ts` couvrent ~200 clés de traduction pour tous les écrans.

