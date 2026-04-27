# Références

## 1. Sources de Données et Rapports

| Source | Titre | Année | Utilisation |
|--------|-------|-------|-------------|
| SCHL (Société canadienne d'hypothèques et de logement) | *Rapport sur le marché locatif — Grand Montréal* | 2025 | Données sur les taux de vacance, croissance des loyers, volume d'unités |
| FRAPRU (Front d'action populaire en réaménagement urbain) | *État du logement social au Québec* | 2025 | Statistiques sur les conflits de maintenance (30 % des disputes) |
| APQ (Association des propriétaires du Québec) | *Profil des propriétaires québécois* | 2024 | Part des petits immeubles owner-managed (60–70 %) |
| Statistique Canada | *Recensement 2021 — Logement* | 2021 | Proportion de propriétaires non-professionnels (~40 %) |
| Tribunal administratif du logement (TAL) | *Code civil du Québec — Obligations du locateur* | 2024 | Cadre légal des délais de maintenance |

---

## 2. Bibliothèques et Frameworks Utilisés

### Frontend / Mobile
| Bibliothèque | Version | Rôle |
|---|---|---|
| React Native | 0.81.5 | Framework mobile cross-platform (iOS/Android) |
| Expo SDK | 54.0.0 | Toolchain et APIs natives (caméra, contacts, localisation) |
| React Navigation | 7.x | Navigation entre écrans (Stack + Bottom Tabs) |
| Lucide React Native | latest | Icônes vectorielles |
| i18n-js | 4.x | Internationalisation (EN/FR) |
| expo-localization | SDK 54 | Détection de la langue du dispositif |
| expo-image-picker | SDK 54 | Sélection et upload de photos de profil |
| expo-contacts | SDK 54 | Import de contacts téléphoniques (fournisseurs) |
| expo-clipboard | SDK 54 | Copie des identifiants WiFi dans le presse-papiers |
| expo-location | SDK 54 | Géolocalisation pour la carte des fournisseurs |
| react-native-maps | latest | Carte interactive (MapView, Marker) |
| @react-native-community/datetimepicker | latest | Sélecteur de date/heure pour le dispatch |

### Backend / Infrastructure
| Service | Rôle |
|---|---|
| Supabase (PostgreSQL) | Base de données relationnelle + authentification + Row Level Security |
| Supabase Storage | Stockage des photos de profil (bucket `avatars`) |
| Supabase Realtime | Abonnements temps réel (mises à jour des demandes) |

### Outils de Développement
| Outil | Rôle |
|---|---|
| TypeScript | Typage statique |
| ESLint | Analyse statique du code |
| npx expo | CLI de build et démarrage du serveur de développement |

---

## 3. APIs Externes

| API | Fournisseur | Usage |
|---|---|---|
| Google Maps / MapView | Google | Affichage des fournisseurs géolocalisés sur carte |
| Google Places (prévu) | Google | Sourcing automatique de fournisseurs locaux |
| Gemini API | Google DeepMind | Diagnostic IA des demandes de maintenance |

---

## 4. Références Académiques et Techniques

- Supabase Documentation. (2024). *Row Level Security*. https://supabase.com/docs/guides/auth/row-level-security  
- Expo Documentation. (2025). *Expo SDK 54 API Reference*. https://docs.expo.dev  
- React Navigation. (2025). *React Navigation v7 Documentation*. https://reactnavigation.org/docs  
- i18n-js. (2024). *i18n-js — A small library to provide the Rails I18n translations on the JavaScript*. https://github.com/fnando/i18n-js  
- React Native Community. (2025). *React Native 0.81 Release Notes*. https://reactnative.dev/blog  
