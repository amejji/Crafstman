# Strata – serveur (Supabase)

Base Postgres avec règles d'accès, stockage des fichiers et une fonction serveur, à héberger dans une région de l'Union européenne.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `migrations/20261123000000_schema_initial.sql` | Tables du cahier des charges, vues de complétude et de garanties, actions (création de chantier, invitation, réception, paiements) et règles d'accès |
| `migrations/20261124000000_conformite.sql` | Conformité : documents d'entreprise, justificatifs de chantier, vues `conformite` et `justificatifs_manquants_chantier`, `chantier_conforme()`, `justificatifs_manquants()`, condition du solde, stockage `entreprises` |
| `migrations/20261123000100_stockage.sql` | Espaces de stockage `chantiers` (photos, PDF) et `produits` (fiches techniques), avec leurs droits |
| `functions/generer-dossier/index.ts` | Génère le DOE (classé par lot du marché) ou le carnet (classé par pièce) en PDF : page de garde, garanties, documents à fournir, photos, puis les fiches techniques jointes |
| `seed.sql` | Cinq produits fictifs pour essayer le scan |
| `tests/` | Scénario de bout en bout sur un Postgres local |

## Mettre en ligne

1. Créez un projet sur supabase.com, région **Europe (Francfort ou Paris)**.
2. Installez la CLI Supabase, puis depuis la racine du dépôt :
   ```bash
   supabase link --project-ref <identifiant-du-projet>
   supabase db push                      # applique les migrations
   supabase functions deploy generer-dossier
   ```
3. Dans Authentication > Providers > Email : activez la connexion par code (OTP) et personnalisez l'e-mail en français.
   Pour la production, branchez un service d'envoi d'e-mails (SMTP) : l'envoi intégré de Supabase est limité.
4. Donnez le rôle administrateur à l'équipe Strata (gestion de la base produits) :
   `update profils set est_admin = true where email = '...';` depuis l'éditeur SQL.

## Règles appliquées par la base

- Un utilisateur ne voit que les chantiers dont il est membre ; les droits sont donnés par chantier.
- Une pose a un identifiant créé sur le téléphone : renvoyée deux fois, elle n'est enregistrée qu'une fois.
- Scannée hors connexion, une pose ne porte que son code-barres ; le produit est retrouvé à l'arrivée.
- Une pose est « complète » quand tous ses documents sont là, sur le produit ou sur la pose : pour un marché pro, fiche technique,
  notice, avis technique et FDES ; pour un particulier, fiche technique et notice. Dans les deux cas, la garantie : durée connue
  dans la base produits, ou document de garantie joint. Le taux du dossier compte les documents présents sur les documents exigés.
- Un produit inconnu saisi par un artisan (code-barres + désignation) entre dans la base, marqué « non vérifié » :
  le scan suivant du même code le retrouve.
- Une invitation se rejoint par lien ou par un code de 8 caractères ; elle peut porter le lot du marché de l'entreprise invitée.
- Seul le maître d'ouvrage (ou le particulier) prononce la réception ; les garanties de 1, 2 et 10 ans en découlent.
- Le solde ne peut être demandé qu'après la réception, avec toutes les poses complètes et, pour un marché pro, sans réserve ouverte.
  La retenue de garantie se libère un an après la réception.
- Le rôle administrateur et la date de réception ne se modifient pas directement depuis l'appli.
- Conformité des entreprises (déposée une fois, valable sur tous les chantiers) :
  décennale et RC pro sur tous les chantiers ; en plus sur un marché pro, Kbis ou carte d'artisan de moins de 3 mois
  et attestation de vigilance URSSAF de moins de 6 mois. RGE, Qualibat, Qualifelec : facultatifs.
  Statuts : valide, expire bientôt (30 jours), expiré, manquant. Le document qui va le plus loin fait foi.
- Le solde exige aussi des entreprises en règle et, sur un marché pro, les justificatifs du chantier
  (Consuel, étanchéité à l'air, attestation RE2020, PV de réception).
- Une entreprise ne dépose qu'en son nom ; on ne peut se rattacher qu'à l'entreprise qu'on a créée,
  et une pose ne s'attribue qu'à sa propre entreprise. Le maître d'ouvrage et les autres membres d'un chantier
  voient les attestations des entreprises de ce chantier ; personne d'autre.
- Strata contrôle la présence et les dates, pas l'authenticité : la vigilance se vérifie sur le site de l'URSSAF.

## Tester

Deux scénarios vérifient chaque règle ci-dessus : `scenario.sql` rejoue les trois parcours (artisan, architecte,
maître d'ouvrage, intrus) ; `conformite.sql` teste les attestations périmées (Kbis de 4 mois, vigilance de 7 mois,
décennale expirée), le dépôt au nom d'une autre entreprise, la visibilité et le déblocage du solde quand tout est fourni. Il tourne sur n'importe quel Postgres 15 ou plus, grâce à une imitation minimale
des schémas `auth` et `storage` de Supabase :

```bash
PGHOST=localhost PGUSER=postgres supabase/tests/lancer.sh
# Scénario OK : tous les contrôles sont passés.
# Conformité OK : tous les contrôles sont passés.
```

## Reste à faire (P2)

- Prestataire de paiement : une fonction serveur qui crée le paiement chez le prestataire,
  reçoit sa confirmation et passe le jalon à « payé » (table `paiements`).
- Facture électronique via une plateforme agréée, à chaque versement.
- Relances automatiques par e-mail, alertes d'expiration des attestations, tableau de bord multi-chantiers, rappels d'entretien.
- Suppression du compte depuis l'appli (exigée par l'App Store et Google Play).
- Back-office de la base produits (import des fiches fabricants).
