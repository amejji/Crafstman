# Strata – serveur (Supabase)

Base Postgres avec règles d'accès, stockage des fichiers et une fonction serveur, à héberger dans une région de l'Union européenne.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `migrations/20261123000000_schema_initial.sql` | Tables du cahier des charges, vues de complétude et de garanties, actions (création de chantier, invitation, réception, paiements) et règles d'accès |
| `migrations/20261123000100_stockage.sql` | Espaces de stockage `chantiers` (photos, PDF) et `produits` (fiches techniques), avec leurs droits |
| `functions/generer-dossier/index.ts` | Génère le DOE ou le carnet en PDF : page de garde, garanties, poses par pièce, photos, puis les fiches techniques jointes |
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
- Une pose est « complète » quand son produit, ou la pose elle-même, a une fiche technique ou une notice.
- Seul le maître d'ouvrage (ou le particulier) prononce la réception ; les garanties de 1, 2 et 10 ans en découlent.
- Le solde ne peut être demandé qu'après la réception, avec un dossier à 100 % et, pour un marché pro, sans réserve ouverte.
  La retenue de garantie se libère un an après la réception.
- Le rôle administrateur et la date de réception ne se modifient pas directement depuis l'appli.

## Tester

Le scénario rejoue les trois parcours avec quatre utilisateurs (artisan, architecte, maître d'ouvrage, intrus)
et vérifie chaque règle ci-dessus. Il tourne sur n'importe quel Postgres 15 ou plus, grâce à une imitation minimale
des schémas `auth` et `storage` de Supabase :

```bash
PGHOST=localhost PGUSER=postgres supabase/tests/lancer.sh
# Scénario OK : tous les contrôles sont passés.
```

## Reste à faire (P2)

- Prestataire de paiement : une fonction serveur qui crée le paiement chez le prestataire,
  reçoit sa confirmation et passe le jalon à « payé » (table `paiements`).
- Facture électronique via une plateforme agréée, à chaque versement.
- Relances automatiques par e-mail, tableau de bord multi-chantiers, rappels d'entretien.
- Back-office de la base produits (import des fiches fabricants).
