# Strata – application mobile (iOS, Android, web)

Application Expo (React Native, TypeScript) issue du cahier des charges V1.
Un seul code pour l'iPhone, Android et le navigateur (espace web des architectes).

## Ce que fait la V1

| Écran | Rôle | Parcours du cahier des charges |
| --- | --- | --- |
| Connexion par code e-mail | Tous | Inscription, connexion |
| Profil et entreprise (SIRET, décennale) | Tous | Comptes et rôles |
| Mes chantiers (complétude de chaque dossier) | Tous | — |
| Nouveau chantier (pièces, montant, échéancier par défaut) | Artisan, architecte | — |
| Scanner une pose (code-barres → pièce → photo → valider, hors connexion) | Artisan | Parcours 1 |
| Dossier : complétude, documents manquants par entreprise et par produit, relance, réception, PDF | Tous | Parcours 2 |
| Réserves : saisie et levée avec photo | Architecte, maître d'ouvrage, artisan | Parcours 2 |
| Paiements : demande par l'artisan, validation par le client | Artisan, client | Parcours 3 (versement réel en P2) |
| Inviter par lien ou par code de 8 caractères (rôle et lot du marché, valable 14 jours) | Tous | — |
| Rejoindre un chantier avec un code (« J'ai un code ») | Tous | — |

Les règles métier sont appliquées par la base (voir `../supabase`), pas seulement par l'écran :
un utilisateur ne voit que ses chantiers, seul le maître d'ouvrage prononce la réception,
le solde reste bloqué tant que le dossier est incomplet ou que des réserves sont ouvertes.

## Démarrer en local

```bash
cd mobile
cp .env.example .env        # renseigner l'URL et la clé anon du projet Supabase
npm install
npm start                   # puis « i » (iOS), « a » (Android) ou « w » (web)
```

La caméra (scan) demande un build de développement :
`npx eas-cli@latest build --profile development --platform ios` (ou `android`).
Sur le web, le scan propose la saisie du code à la main.

## Vérifications

```bash
npm test            # fonctions pures (EAN, montants des jalons, SIRET)
npm run typecheck   # TypeScript
npm run lint        # ESLint (config Expo)
```

Les règles de la base se testent avec `../supabase/tests/lancer.sh` (voir `../supabase/README.md`).

## Publier sur l'App Store et Google Play

Les builds se font dans le cloud avec EAS : pas besoin de Mac ni d'Android Studio.

1. **Comptes** (à votre nom ou à celui de la société) :
   - Apple Developer Program : 99 $ par an. Créez l'app dans App Store Connect avec l'identifiant `fr.strata.app`.
   - Google Play Console : 25 $ une fois. Créez l'app avec le nom de paquet `fr.strata.app`.
   - Compte Expo (gratuit pour commencer) : `npx eas-cli@latest login`.
2. **Identifiants** : si `fr.strata.app` est pris ou ne correspond pas à votre domaine, changez
   `ios.bundleIdentifier` et `android.package` dans `app.json` avant le premier build (ils ne changent plus ensuite).
3. **Lier le projet** : `npx eas-cli@latest init` (ajoute l'identifiant du projet dans `app.json`).
4. **Variables** : déclarez `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans les
   environnements EAS (`npx eas-cli@latest env:create`), pour les profils `preview` et `production`.
5. **Build** : `npm run build:ios` et `npm run build:android`. EAS crée et garde les certificats de signature.
6. **Envoi** :
   - iOS : remplacez `ascAppId` dans `eas.json` par l'identifiant numérique de l'app App Store Connect, puis `npm run submit:ios`.
     L'app arrive dans TestFlight.
   - Android : créez une clé de compte de service Google Play, enregistrez-la sous `mobile/cle-service-google-play.json`
     (ignorée par git), puis `npm run submit:android`. L'app arrive dans le canal de test interne.
     Le tout premier envoi Android doit souvent se faire à la main dans la Play Console.
7. **Fiches des stores** : captures d'écran, description, politique de confidentialité (URL obligatoire),
   questionnaire sur les données collectées (e-mail, photos, données de chantier), et un compte de démonstration
   pour la revue Apple (le code de connexion arrive par e-mail : prévoyez une adresse que l'équipe peut consulter,
   ou un compte de test avec mot de passe).

Pour le pilote, le build `preview` (`npx eas-cli@latest build --profile preview`) donne une version installable
sans passer par les stores : lien direct sur Android, appareils enregistrés sur iOS.

## Organisation du code

```
src/app/                 écrans (Expo Router : chaque fichier est une route)
src/app/chantier/[id]/   vue chantier, scanner, dossier, réserves, paiements, inviter
src/components/ui.tsx    boutons, champs, cartes, jauge
src/lib/supabase.ts      client Supabase (session gardée sur l'appareil)
src/lib/file-attente.ts  poses gardées hors connexion et envoyées au retour du réseau
src/lib/produits.ts      recherche par EAN, avec cache pour le hors connexion
src/lib/format.ts        fonctions pures testées
```
