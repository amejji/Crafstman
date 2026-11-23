-- Strata – schéma initial (V1)
-- Le chantier est le centre : tout ce qui est posé, réservé ou payé lui est rattaché.
-- Les droits sont donnés par chantier, pas par compte (table membres_chantier).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type type_organisation as enum ('entreprise', 'cabinet', 'maitre_ouvrage');
create type type_chantier as enum ('pro', 'particulier');
create type role_chantier as enum ('artisan', 'architecte', 'maitre_ouvrage', 'particulier');
create type type_document as enum ('fiche_technique', 'notice', 'avis_technique', 'fdes', 'garantie', 'autre');
create type statut_reserve as enum ('ouverte', 'levee');
create type condition_jalon as enum ('aucune', 'situation', 'reception_dossier_complet', 'un_an_apres_reception');
create type statut_jalon as enum ('a_venir', 'demande', 'valide', 'paye');

-- ---------------------------------------------------------------------------
-- Comptes
-- ---------------------------------------------------------------------------
create table organisations (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) > 0),
  type type_organisation not null default 'entreprise',
  siret text check (siret is null or siret ~ '^[0-9]{14}$'),
  assureur_decennale text,
  police_decennale text,
  decennale_valide_jusqu_au date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table profils (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nom text,
  organisation_id uuid references organisations (id) on delete set null,
  est_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Crée le profil dès l'inscription (connexion par e-mail).
create function creer_profil_utilisateur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger profil_a_l_inscription
  after insert on auth.users
  for each row execute function creer_profil_utilisateur();

-- ---------------------------------------------------------------------------
-- Chantiers
-- ---------------------------------------------------------------------------
create table chantiers (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) > 0),
  adresse text,
  type type_chantier not null,
  montant_marche_ttc numeric(12, 2) not null default 0 check (montant_marche_ttc >= 0),
  date_reception date,
  organisation_id uuid references organisations (id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table membres_chantier (
  chantier_id uuid not null references chantiers (id) on delete cascade,
  profil_id uuid not null references profils (id) on delete cascade,
  role role_chantier not null,
  organisation_id uuid references organisations (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (chantier_id, profil_id)
);
create index on membres_chantier (profil_id);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers (id) on delete cascade,
  role role_chantier not null,
  jeton text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_by uuid not null default auth.uid() references auth.users (id),
  expire_le timestamptz not null default now() + interval '14 days',
  acceptee_par uuid references profils (id),
  acceptee_le timestamptz,
  created_at timestamptz not null default now()
);

create table pieces (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers (id) on delete cascade,
  nom text not null check (length(trim(nom)) > 0),
  ordre int not null default 0,
  created_at timestamptz not null default now()
);
create index on pieces (chantier_id);

-- ---------------------------------------------------------------------------
-- Base produits et documents
-- ---------------------------------------------------------------------------
create table produits (
  id uuid primary key default gen_random_uuid(),
  ean text not null unique check (ean ~ '^[0-9]{8,14}$'),
  designation text not null,
  marque text,
  garantie_fabricant_mois int check (garantie_fabricant_mois is null or garantie_fabricant_mois >= 0),
  entretien text,
  created_at timestamptz not null default now()
);

create table poses (
  -- L'identifiant est créé sur le téléphone : une pose envoyée deux fois
  -- (reprise après coupure réseau) n'est enregistrée qu'une fois.
  id uuid primary key,
  chantier_id uuid not null references chantiers (id) on delete cascade,
  piece_id uuid references pieces (id) on delete set null,
  produit_id uuid references produits (id),
  organisation_id uuid references organisations (id) on delete set null,
  auteur_id uuid not null default auth.uid() references profils (id),
  ean_scanne text,
  -- Saisie rapide quand le produit est inconnu de la base
  designation_saisie text,
  marque_saisie text,
  lot text,
  photo_path text,
  photo_etiquette_path text,
  posee_le timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (produit_id is not null or designation_saisie is not null or ean_scanne is not null)
);
create index on poses (chantier_id);

-- Scan hors connexion : le téléphone n'envoie que le code-barres, le serveur retrouve le produit.
create function rattacher_produit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.produit_id is null and new.ean_scanne is not null then
    select id into new.produit_id from produits where ean = new.ean_scanne;
  end if;
  return new;
end $$;

create trigger poses_rattacher_produit before insert on poses
  for each row execute function rattacher_produit();

create table documents (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid references produits (id) on delete cascade,
  pose_id uuid references poses (id) on delete cascade,
  type type_document not null,
  nom text not null,
  storage_path text not null,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  check ((produit_id is null) <> (pose_id is null))
);
create index on documents (produit_id);
create index on documents (pose_id);

-- ---------------------------------------------------------------------------
-- Réserves et paiements
-- ---------------------------------------------------------------------------
create table reserves (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers (id) on delete cascade,
  piece_id uuid references pieces (id) on delete set null,
  organisation_id uuid references organisations (id) on delete set null,
  lot text,
  description text not null check (length(trim(description)) > 0),
  photo_path text,
  statut statut_reserve not null default 'ouverte',
  photo_levee_path text,
  levee_le timestamptz,
  created_by uuid not null default auth.uid() references profils (id),
  created_at timestamptz not null default now()
);
create index on reserves (chantier_id);

create table jalons (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers (id) on delete cascade,
  ordre int not null,
  libelle text not null,
  pourcentage numeric(5, 2) not null check (pourcentage > 0 and pourcentage <= 100),
  condition condition_jalon not null default 'aucune',
  statut statut_jalon not null default 'a_venir',
  demande_le timestamptz,
  valide_le timestamptz,
  unique (chantier_id, ordre)
);

create table paiements (
  id uuid primary key default gen_random_uuid(),
  jalon_id uuid not null references jalons (id) on delete restrict,
  montant numeric(12, 2) not null check (montant > 0),
  reference_prestataire text,
  reference_facture text,
  statut text not null default 'en_attente',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fonctions d'accès (utilisées par les règles de sécurité)
-- ---------------------------------------------------------------------------
create function est_membre(p_chantier uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membres_chantier
    where chantier_id = p_chantier and profil_id = auth.uid()
  );
$$;

create function role_sur(p_chantier uuid) returns role_chantier
language sql stable security definer set search_path = public as $$
  select role from membres_chantier
  where chantier_id = p_chantier and profil_id = auth.uid();
$$;

create function est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select est_admin from profils where id = auth.uid()), false);
$$;

create function partage_un_chantier(p_profil uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membres_chantier a
    join membres_chantier b on a.chantier_id = b.chantier_id
    where a.profil_id = auth.uid() and b.profil_id = p_profil
  );
$$;

-- ---------------------------------------------------------------------------
-- Vues calculées
-- ---------------------------------------------------------------------------

-- Une pose est complète si son produit (ou la pose elle-même) a au moins une
-- fiche technique ou une notice.
create view poses_completude with (security_invoker = true) as
select
  p.id as pose_id,
  p.chantier_id,
  p.organisation_id,
  coalesce(pr.designation, p.designation_saisie, 'EAN ' || p.ean_scanne) as designation,
  exists (
    select 1 from documents d
    where (d.produit_id = p.produit_id or d.pose_id = p.id)
      and d.type in ('fiche_technique', 'notice')
  ) as complete
from poses p
left join produits pr on pr.id = p.produit_id;

create view chantiers_completude with (security_invoker = true) as
select
  c.id as chantier_id,
  count(pc.pose_id)::int as poses,
  count(pc.pose_id) filter (where pc.complete)::int as poses_completes,
  case when count(pc.pose_id) = 0 then 0
       else round(100.0 * count(pc.pose_id) filter (where pc.complete) / count(pc.pose_id))::int
  end as taux,
  (select count(*) from reserves r where r.chantier_id = c.id and r.statut = 'ouverte')::int as reserves_ouvertes
from chantiers c
left join poses_completude pc on pc.chantier_id = c.id
group by c.id;

-- Garanties légales à partir de la date de réception.
create view garanties with (security_invoker = true) as
select
  c.id as chantier_id,
  c.date_reception,
  (c.date_reception + interval '1 year')::date as fin_parfait_achevement,
  (c.date_reception + interval '2 years')::date as fin_biennale,
  (c.date_reception + interval '10 years')::date as fin_decennale
from chantiers c
where c.date_reception is not null;

-- ---------------------------------------------------------------------------
-- Actions (RPC)
-- ---------------------------------------------------------------------------

-- Crée un chantier, ajoute le créateur comme membre et pose l'échéancier par défaut :
-- acompte 30 %, situation 40 %, solde 25 % (30 % particulier), retenue 5 % (pro).
create function creer_chantier(
  p_nom text,
  p_adresse text,
  p_type type_chantier,
  p_montant numeric,
  p_role role_chantier,
  p_pieces text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_org uuid;
  v_piece text;
  v_ordre int := 0;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  select organisation_id into v_org from profils where id = auth.uid();

  insert into chantiers (nom, adresse, type, montant_marche_ttc, organisation_id, created_by)
  values (p_nom, p_adresse, p_type, coalesce(p_montant, 0), v_org, auth.uid())
  returning id into v_id;

  insert into membres_chantier (chantier_id, profil_id, role, organisation_id)
  values (v_id, auth.uid(), p_role, v_org);

  foreach v_piece in array coalesce(p_pieces, '{}') loop
    if length(trim(v_piece)) > 0 then
      insert into pieces (chantier_id, nom, ordre) values (v_id, trim(v_piece), v_ordre);
      v_ordre := v_ordre + 1;
    end if;
  end loop;

  if p_type = 'pro' then
    insert into jalons (chantier_id, ordre, libelle, pourcentage, condition) values
      (v_id, 1, 'Acompte', 30, 'aucune'),
      (v_id, 2, 'Situation de travaux', 40, 'situation'),
      (v_id, 3, 'Solde', 25, 'reception_dossier_complet'),
      (v_id, 4, 'Retenue de garantie', 5, 'un_an_apres_reception');
  else
    insert into jalons (chantier_id, ordre, libelle, pourcentage, condition) values
      (v_id, 1, 'Acompte', 30, 'aucune'),
      (v_id, 2, 'Situation de travaux', 40, 'situation'),
      (v_id, 3, 'Solde', 30, 'reception_dossier_complet');
  end if;

  return v_id;
end $$;

create function accepter_invitation(p_jeton text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_inv invitations;
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  select * into v_inv from invitations where jeton = p_jeton for update;
  if not found then
    raise exception 'Invitation introuvable';
  end if;
  if v_inv.expire_le < now() then
    raise exception 'Invitation expirée';
  end if;
  if v_inv.acceptee_par is not null and v_inv.acceptee_par <> auth.uid() then
    raise exception 'Invitation déjà utilisée';
  end if;

  select organisation_id into v_org from profils where id = auth.uid();
  insert into membres_chantier (chantier_id, profil_id, role, organisation_id)
  values (v_inv.chantier_id, auth.uid(), v_inv.role, v_org)
  on conflict (chantier_id, profil_id) do nothing;

  update invitations set acceptee_par = auth.uid(), acceptee_le = now() where id = v_inv.id;
  return v_inv.chantier_id;
end $$;

-- Seul le maître d'ouvrage (ou le particulier) prononce la réception.
create function prononcer_reception(p_chantier uuid, p_date date default current_date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if role_sur(p_chantier) is distinct from 'maitre_ouvrage'
     and role_sur(p_chantier) is distinct from 'particulier' then
    raise exception 'Seul le maître d''ouvrage peut prononcer la réception';
  end if;
  perform set_config('strata.reception', 'on', true);
  update chantiers set date_reception = p_date where id = p_chantier;
end $$;

-- L'artisan demande un paiement ; le solde reste bloqué tant que le dossier
-- est incomplet ou, pour un marché pro, que des réserves sont ouvertes.
create function demander_paiement(p_jalon uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_jalon jalons;
  v_chantier chantiers;
  v_compl chantiers_completude;
begin
  select * into v_jalon from jalons where id = p_jalon;
  if not found then raise exception 'Jalon introuvable'; end if;
  if role_sur(v_jalon.chantier_id) is distinct from 'artisan' then
    raise exception 'Seul l''artisan peut demander un paiement';
  end if;
  if v_jalon.statut <> 'a_venir' then
    raise exception 'Ce paiement a déjà été demandé';
  end if;
  select * into v_chantier from chantiers where id = v_jalon.chantier_id;
  select * into v_compl from chantiers_completude where chantier_id = v_jalon.chantier_id;

  if v_jalon.condition = 'reception_dossier_complet' then
    if v_chantier.date_reception is null then
      raise exception 'La réception n''est pas encore prononcée';
    end if;
    if v_compl.poses = 0 or v_compl.taux < 100 then
      raise exception 'Le dossier est incomplet (% %%)', v_compl.taux;
    end if;
    if v_chantier.type = 'pro' and v_compl.reserves_ouvertes > 0 then
      raise exception 'Des réserves sont encore ouvertes';
    end if;
  elsif v_jalon.condition = 'un_an_apres_reception' then
    if v_chantier.date_reception is null or v_chantier.date_reception + interval '1 year' > now() then
      raise exception 'La retenue de garantie se libère un an après la réception';
    end if;
  end if;

  update jalons set statut = 'demande', demande_le = now() where id = p_jalon;
end $$;

-- Le client valide le jalon. Le versement réel passe par le prestataire de
-- paiement (P2) : une fonction serveur passera le jalon à « payé ».
create function valider_jalon(p_jalon uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_jalon jalons;
begin
  select * into v_jalon from jalons where id = p_jalon;
  if not found then raise exception 'Jalon introuvable'; end if;
  if role_sur(v_jalon.chantier_id) not in ('maitre_ouvrage', 'particulier') then
    raise exception 'Seul le client valide un paiement';
  end if;
  if v_jalon.statut <> 'demande' then
    raise exception 'Ce paiement n''a pas été demandé';
  end if;
  update jalons set statut = 'valide', valide_le = now() where id = p_jalon;
end $$;

-- ---------------------------------------------------------------------------
-- Garde-fous : champs qu'un utilisateur ne peut pas changer directement
-- ---------------------------------------------------------------------------
create function proteger_champs() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then
    return new; -- clé de service, migrations, back-office
  end if;
  if tg_table_name = 'profils' then
    if new.est_admin is distinct from old.est_admin then
      raise exception 'Le rôle administrateur ne se modifie pas depuis l''appli';
    end if;
  end if;
  if tg_table_name = 'chantiers' then
    if new.date_reception is distinct from old.date_reception
       and coalesce(current_setting('strata.reception', true), '') <> 'on' then
      raise exception 'La réception se prononce avec prononcer_reception()';
    end if;
    if new.created_by is distinct from old.created_by then
      raise exception 'Le créateur du chantier ne se modifie pas';
    end if;
  end if;
  return new;
end $$;

create trigger profils_garde before update on profils
  for each row execute function proteger_champs();
create trigger chantiers_garde before update on chantiers
  for each row execute function proteger_champs();

-- ---------------------------------------------------------------------------
-- Règles d'accès (sécurité au niveau des lignes)
-- ---------------------------------------------------------------------------
alter table organisations enable row level security;
alter table profils enable row level security;
alter table chantiers enable row level security;
alter table membres_chantier enable row level security;
alter table invitations enable row level security;
alter table pieces enable row level security;
alter table produits enable row level security;
alter table poses enable row level security;
alter table documents enable row level security;
alter table reserves enable row level security;
alter table jalons enable row level security;
alter table paiements enable row level security;

-- Organisations : visibles par tout utilisateur connecté (nom des entreprises sur un chantier).
create policy organisations_lecture on organisations for select to authenticated using (true);
create policy organisations_creation on organisations for insert to authenticated
  with check (created_by = auth.uid());
create policy organisations_modification on organisations for update to authenticated
  using (created_by = auth.uid() or id = (select organisation_id from profils where id = auth.uid()));

-- Profils : le sien, et ceux des personnes avec qui on partage un chantier.
create policy profils_lecture on profils for select to authenticated
  using (id = auth.uid() or partage_un_chantier(id) or est_admin());
create policy profils_modification on profils for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Chantiers : membres uniquement. La création passe par creer_chantier().
create policy chantiers_lecture on chantiers for select to authenticated using (est_membre(id));
create policy chantiers_modification on chantiers for update to authenticated
  using (est_membre(id) and role_sur(id) in ('artisan', 'architecte'));

create policy membres_lecture on membres_chantier for select to authenticated using (est_membre(chantier_id));

create policy invitations_lecture on invitations for select to authenticated using (est_membre(chantier_id));
create policy invitations_creation on invitations for insert to authenticated
  with check (est_membre(chantier_id) and created_by = auth.uid());

create policy pieces_lecture on pieces for select to authenticated using (est_membre(chantier_id));
create policy pieces_ecriture on pieces for insert to authenticated with check (est_membre(chantier_id));
create policy pieces_modification on pieces for update to authenticated using (est_membre(chantier_id));

-- Base produits : lecture pour tous, écriture par l'administrateur Strata.
create policy produits_lecture on produits for select to authenticated using (true);
create policy produits_admin on produits for all to authenticated using (est_admin()) with check (est_admin());

create policy poses_lecture on poses for select to authenticated using (est_membre(chantier_id));
create policy poses_creation on poses for insert to authenticated
  with check (est_membre(chantier_id) and auteur_id = auth.uid());
create policy poses_modification on poses for update to authenticated
  using (auteur_id = auth.uid()) with check (auteur_id = auth.uid() and est_membre(chantier_id));
create policy poses_suppression on poses for delete to authenticated using (auteur_id = auth.uid());

create policy documents_lecture on documents for select to authenticated
  using (produit_id is not null or exists (select 1 from poses p where p.id = pose_id and est_membre(p.chantier_id)));
create policy documents_pose on documents for insert to authenticated
  with check (pose_id is not null and exists (select 1 from poses p where p.id = pose_id and est_membre(p.chantier_id)));
create policy documents_admin on documents for all to authenticated using (est_admin()) with check (est_admin());

create policy reserves_lecture on reserves for select to authenticated using (est_membre(chantier_id));
create policy reserves_creation on reserves for insert to authenticated
  with check (est_membre(chantier_id) and created_by = auth.uid());
create policy reserves_modification on reserves for update to authenticated using (est_membre(chantier_id));

-- Jalons : lecture par les membres ; les changements de statut passent par les fonctions.
create policy jalons_lecture on jalons for select to authenticated using (est_membre(chantier_id));
create policy jalons_echeancier on jalons for update to authenticated
  using (est_membre(chantier_id) and role_sur(chantier_id) in ('artisan', 'architecte') and statut = 'a_venir')
  with check (statut = 'a_venir');

create policy paiements_lecture on paiements for select to authenticated
  using (exists (select 1 from jalons j where j.id = jalon_id and est_membre(j.chantier_id)));

grant execute on function creer_chantier, accepter_invitation, prononcer_reception,
  demander_paiement, valider_jalon to authenticated;
