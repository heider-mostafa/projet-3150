# Titre du Projet : Structuration des Processus Informels de Maintenance Résidentielle par l'Intermédiation Numérique Intelligente

**Domaine :** Informatique appliquée – Systèmes d’Information (SI)  
**Contexte :** Secteur locatif des petits immeubles résidentiels à Montréal  
**Candidat :** Étudiant au Doctorat en Informatique  

---

## 1. Contexte et Justification de la Recherche

À Montréal, la structure du marché locatif présente une anomalie structurelle : la prédominance de la gestion non professionnelle. Contrairement aux marchés américains dominés par de grands complexes, le parc immobilier montréalais est composé à **60-70 %** de "petits plex" (duplex, triplex, blocs de moins de 10 logements), gérés par des propriétaires individuels sans gestionnaire professionnel (source : Association des Propriétaires du Québec - APQ, estimations basées sur recensement Statistique Canada 2021 mis à jour).

### 1.1. État des Lieux et Problématique

Les communications entre locataires et propriétaires pour les problèmes d'entretien (plomberie, électricité, chauffage, bris divers) reposent sur des canaux **informels** (appels, SMS, courriels). Ce manque de structure entraîne :  
1. **Difficulté pour les locataires à signaler clairement et efficacement un problème** : Descriptions verbales imprécises, absence de documentation visuelle.  
2. **Absence de centralisation, de suivi et de priorisation des demandes** : Demandes éparpillées, sans tableau de bord unifié.  
3. **Dépendance forte au réseau personnel et à la disponibilité du propriétaire** : Stress pour constituer un réseau de prestataires ad hoc.  
4. **Peu de traçabilité et de transparence quant aux demandes et aux interventions réalisées** : Manque de preuves en cas de litige, alimentant les **~30 % de disputes** répertoriées par le FRAPRU (Front d'action populaire en réaménagement urbain).  

Cette recherche doctorale explore comment un système d'information peut contribuer à structurer cette réalité, en s'inspirant d'une approche méthodologique en couches (découverte, évaluation, contextualisation, synthèse, mise en œuvre) pour une analyse exhaustive.

### 1.2. Données de Marché (Contextualisation 2025-2026)

Basé sur les rapports SCHL (Société canadienne d'hypothèques et de logement) publiés en décembre 2025, mis à jour pour 2026 (prévisions de hausses modérées dues à l'augmentation de l'offre). Le marché reste polarisé : surabondance en luxe vs. rareté en abordable, exacerbant les besoins en maintenance efficace.

| Métrique | Valeur (2025/2026) | Source | Implication pour le Projet |
|----------|--------------------|--------|----------------------------|
| Unités Locatives Montréal | ~500 000 | SCHL 2025 | Grand marché adressable ; focus sur ~300 000 petits immeubles. |
| Part des Petits Immeubles | 60-70% owner-managed | APQ / SCHL | Niche pour outils non-pro. |
| Taux de Vacance | 2.9% (de 2.1% en 2024 ; abordable : 1.5% ; luxe : 4.5-6.4%) | SCHL 2025 | Maintenance efficiency can reduce turnover in tight segments ; pression sur réparations rapides. |
| Croissance de Loyer | 7.2% (2-chambres : ~1 346 $ ; île Montréal : 11.9% à 1 283 $) | SCHL 2025 / FRAPRU | Affordability strain ; meilleurs systèmes justifient loyers via satisfaction ; prévisions 2026 : hausses modérées. |
| Disputes de Maintenance | ~30% des problèmes locataires | FRAPRU | Données prouvent besoin de traçabilité pour couper disputes. |

Preuves du problème : Marché polarisé SCHL (surabondance luxe vs. rareté abordable) et rapports d'avocature sur retards dans petits immeubles. Citation : « Abordabilité aggravée malgré conditions plus douces » (SCHL 2025). En 2026, avec une offre croissante (31 000 unités neuves en 2025), la plateforme peut améliorer la rétention (~40% de landlords non-pro, Statistique Canada).

---

## 2. Analyse de l'Existant (État de l'Art et Lacunes)

Une revue systématique des logiciels de gestion immobilière (basée sur recherches web en temps réel jusqu'en janvier 2026) révèle un fossé entre les solutions globales et les besoins spécifiques des petits propriétaires montréalais. ~20+ apps existent, mais la plupart U.S.-orientées ; locales comme Building Stack mieux adaptées, mais aucune ne cible explicitement les "informels sans pros".

### 2.1. Catégorisation des Concurrents

- **Globales/Générales (U.S.-centric mais utilisables au Canada)** : Avail, Buildium, DoorLoop, TenantCloud, Innago, TurboTenant, Property Meld, RentRedi, Snapfix.  
- **Canada/Montréal-Spécifiques** : Building Stack (Montréal-based), Yardi Breeze Premier (version canadienne), Propra, Haletale, UpperBee.  

### 2.2. Décomposition et Gaps

| App | Key Offerings | Pricing | Target | Gaps vs. Project |
|-----|---------------|---------|--------|------------------|
| Avail | Maintenance dashboard ; rent/leasing. | Free + ~$9/unit | Small (1-14) | Lacks prioritization/traceability ; U.S.-focused ; not bilingual. |
| Buildium | 24/7 tracking, automation. | ~$58/month+ | Small-mid | Overkill ; no Quebec support ; high cost. |
| DoorLoop | Online requests ; full lifecycle. | ~$69/month+ | Small (1-1,000) | No prioritization ; U.S.-heavy ; no local stats. |
| TenantCloud | Requests assignment ; payments. | Tiered free | Small managers | Basic traceability ; no Quebec ; vendor dependency. |
| Innago | Work orders ; app submissions. | Free | Small (1-1,000) | No advanced prioritization ; U.S.-centric. |
| TurboTenant | Portal submissions ; basics. | Free + ~$10/month | DIY small | Minimal centralization ; no local. |
| Building Stack | Tenant portal ; Canadian leases. | Custom | Canadian small-mid | Assumes scale ; unclear prioritization ; not Montreal-exclusive. |
| Yardi Breeze | Requests ; provincial leases. | Custom | Small-mid | Broad (commercial) ; cost deters ; no informal focus. |

**Lacunes Clés :**  
- **Structuration des Processus Informels** : Pas de migration assistée par IA depuis texts/emails.  
- **Traçabilité/Transparence** : Suivi basique ; manque de logs audit/timelines partagées.  
- **Localisation** : Peu gèrent directives TAL, interfaces françaises, dominance petits immeubles Montréal (60%+ plexes par SCHL).  
- **Échelle & Dépendance** : Orientées usage pro ; surcharge avec marchés fournisseurs (projet met l'accent sur réseaux propriétaires + sourcing auto).  
- **Intégration de Données** : Aucune ne tire stats locales (problèmes abordabilité) pour tableaux de bord.  

Opportunité : App de niche pour les 100 000+ petits immeubles de Montréal, UI ultra-simple, gratuit/bas coût, avec diagnostics IA et sourcing auto-pro.

---

## 3. Architecture du Système Proposé

L'innovation réside dans l'intégration de la **découverte automatique de services** et du **diagnostic assisté par IA**. Architecture client-serveur modulaire, scalable.

### 3.1. Pile Technologique (Tech Stack)

- **Frontend** : React.js (web) + React Native (applications mobiles iOS/Android). Pourquoi ? Rapide, basé sur composants pour une UI simple (formes de demandes, tableaux de bord) ; i18next pour support bilingue (anglais/français).  
- **Backend & Infrastructure (Supabase)** :  
  - **PostgreSQL** : Relationnel pour données structurées (demandes, utilisateurs, baux).  
  - **Supabase Auth** : Authentification sécurisée (JWT/OAuth ; liens magiques pour utilisateurs non-tech).  
  - **Edge Functions** : Logique côté serveur (appels LLM, API Maps).  
  - **Supabase Storage** : Stockage sécurisé pour photos, baux.  
- **Intelligence Artificielle** :  
  - **LLM (GPT-4o-mini ou Mistral open-source)** : Diagnostics préliminaires, chatbot juridique (RAG sur Code civil du Québec/TAL).  
  - **Vision API / OCR (Tesseract/Google Vision)** : Analyse d'images pour problèmes.  
- **Logistique** : API Google Maps (Places) pour sourcing automatique de pros (plombiers, etc.) dans rayon 5-10 km.  
- **Notifications/Temps Réel** : Firebase (push/email/SMS) ou Socket.io.  
- **Auth/Sécurité** : OAuth (Google/Apple) + JWT ; Cloudflare pour DDoS ; Row Level Security (RLS) dans Supabase pour confidentialité des données (RGPD/Loi 25 Québec).  
- **Hébergement/Déploiement** : AWS/Heroku (niveau gratuit pour prototype) ; Supabase pour développement rapide.  
- **Outils Additionnels** : Stripe/PayPal pour premiums ; Google Analytics ; i18n.  
- **Estimation de Coût** : MVP ~0-500 $/mois (niveaux gratuits) ; échelle à 1k $+ avec utilisateurs. Raisonnement : Léger pour dev niveau doctorat (une personne peut construire) ; supporte centralisation (APIs), traçabilité (timestamps/requêtes).  

Structure GitHub (basée sur template préliminaire) : `docs/` pour recherche ; `.gitignore`, `Pipfile`, `README.md` (cette description), `mkdocs.yml`, `requirements.txt`. Utiliser MkDocs avec thème Material pour site/docs.

---

## 4. Fonctionnement Détaillé et Innovations

### 4.1. Onboarding "Zero-Config" (Le pivot stratégique)

1. **Inscription** : Utilisateur (propriétaire/locataire) entre profil, télécharge bail parmi infos.  
2. **Sourcing Auto Pros** : Entrer adresse immeuble ; API Google Maps scanne rayon 5-10 km, sélectionne 3 par catégorie (plomberie, électricité, chauffage, toiture, serrurerie) basé sur >4.2 étoiles, avis élevés.  
3. **Personnalisation** : Propriétaire valide/ajoute réseau personnel.  

### 4.2. Flux de Traitement d'une Demande

1. **Soumission par Locataire** : Formulaire structuré (type problème, description, localisation, urgence) ; téléchargement multiples photos (min 3 angles).  
2. **Analyse IA Préliminaire** : OCR extrait détails (ex. numéros modèles) ; LLM diagnostique (ex. "Fuite d'eau probable – urgence moyenne, coût est. 50-150 $"). Suggère priorisation. Locataire valide/soumet.  
3. **Réception par Propriétaire** : Notification push avec diagnostic, photos, recommandations pros (boutons appel direct).  
4. **Priorisation et Assignation** : Tableau de bord centralise ; priorise auto (urgence, impact, ancienneté) ; propriétaire assigne à pro ou soi-même.  
5. **Traitement et Suivi** : Messagerie asynchrone ; mises à jour statut en temps réel ("Soumise → Diagnostiquée → En cours → Résolue").  
6. **Clôture** : Propriétaire marque résolue avec preuves (photos après réparation, facture) ; locataire confirme/dispute.  
7. **Chatbot Juridique** : Accède bail téléchargé ; prompts maîtres pour lois Québec (Code civil, TAL) ; répond questions (ex. délais réparation).  

Flux Utilisateurs : Locataire signale → reçoit diagnostic préliminaire → suit ; Propriétaire reçoit → agit → met à jour.

---

## 5. Résolution des Problématiques (Tableau de Valeur)

| Problème Identifié | Solution Apportée par l'App | Impact Mesurable |
|--------------------|-----------------------------|------------------|
| Signalement Flou | Photos obligatoires + Diagnostic IA (OCR/LLM) | Réduction 50%+ temps réponse (inspiré Property Meld). |
| Absence Centralisation/Suivi/Priorisation | Tableau de bord unique ; priorisation auto (tags urgence, scoring LLM). | Aucune demande perdue ; structuré depuis informel. |
| Dépendance Réseau/Disponibilité | Sourcing auto pros via API Google Maps ; notifications asynchrones. | Économise 20+ heures/semaine (inspiré TenantCloud) ; réduit épuisement propriétaire. |
| Peu Traçabilité/Transparence | Logs audit/timelines ; export PDF pour TAL. | Réduction 40% disputes (rapports Buildium). |

Différenciation : "Le mainteneur simple de Montréal" ; ajoute tableaux de bord stats locaux (APIs SCHL), migration informel-à-structuré.

---

## 6. Analyse de Risques et Réponses Adversarielles

### 6.1. Fiabilité de l'IA et de l'API Maps

* **Question :** Que faire si l'IA se trompe ou si un pro recommandé par Google est incompétent ? Biais IA ?  
* **Réponse :** Système comme Aide à la Décision (DSS) ; propriétaire valide diagnostic/pro. Boucle feedback : Blacklist pros mauvais (données anonymisées communauté). Fine-tune LLM sur datasets locations Québec pour réduire biais/hallucinations. Cible précision : 80%+ via tests.

### 6.2. Confidentialité et Sécurité (Loi 25 - Québec)

* **Question :** Comment garantir sécurité des baux/photos ?  
* **Réponse :** RLS Supabase : Locataire voit seulement ses données ; propriétaire vérifié (preuve propriété). Chiffré (TLS/AES-256) ; consentement pour téléchargements (conforme PIPEDA/Loi 25). Pas de partage sans permission explicite.

### 6.3. Hallucinations Juridiques

* **Question :** Chatbot peut-il donner mauvais conseils ?  
* **Réponse :** RAG sur base connaissances fermée (Code civil/TAL) ; cite sources ; disclaimer "pas conseil légal". Prompts multiples : Conseils généraux, analyse bail ; escalade complexe à humain si besoin.

### 6.4. Autres (Évaluation, Impact)

* **Question :** Plan d'évaluation ? Impact social ?  
* **Réponse :** Beta pilote avec 10-20 plexes Montréal ; metrics : NPS, réduction temps réponse, taux disputes (A/B vs. informel). Étude impact social (rétention, équité pour non-tech). Open-source post-thèse.

* **Question :** Scalabilité, Monétisation ?  
* **Réponse :** Supabase scale ; freemium (premium : analyses avancées). Intégrations futures : APIs TAL, assureurs.

---

## 7. Conclusion et Perspectives

Ce projet ne se contente pas de numériser des formulaires ; il **structure un écosystème** avec IA pour diagnostics, sourcing auto, et chatbot légal, offrant aux petits propriétaires montréalais une puissance équivalente aux grandes firmes, réduisant friction sociale/légale. Contribution doctorale : Framework pour IA dans logements informels.

**Prochaine étape :** Développement MVP ; test pilote sur 10 duplex à Montréal ; actualisation stats SCHL 2026.