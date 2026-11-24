-- Strata – conformité des entreprises et du chantier
-- Chaque entreprise dépose ses justificatifs une seule fois ; ils valent sur tous ses chantiers.
-- Le solde reste bloqué tant qu'une entreprise du chantier n'est pas en règle et, pour un
-- marché pro, tant que des justificatifs de chantier manquent.
-- Strata contrôle la présence et les dates des documents, pas leur authenticité.

create type type_doc_entreprise as enum
  ('decennale', 'rc_pro', 'kbis', 'vigilance_urssaf', 'rge', 'qualibat', 'qualifelec', 'autre');
create type type_justificatif as enum
  ('consuel', 'etancheite_air', 'attestation_re2020', 'pv_reception', 'autre');

create table documents_entreprise (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations (id) on delete cascade,
  type type_doc_entreprise not null,
  nom text,
  storage_path text not null, -- stockage « entreprises » : <organisation_id>/<fichier>
  date_emission date not null,
  date_fin date, -- obligatoire, sauf Kbis et vigilance (durée fixe à partir de la date d'émission)
  depose_par uuid not null default auth.uid() references profils (id),
  created_at timestamptz not null default now(),
  check (date_fin is not null or type in ('kbis', 'vigilance_urssaf')),
  check (date_fin is null or date_fin >= date_emission)
);
create index on documents_entreprise (organisation_id, type);

create table justificatifs_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers (id) on delete cascade,
  type type_justificatif not null,
  nom text,
  storage_path text not null, -- stockage « chantiers » : <chantier_id>/justificatifs/<fichier>
  depose_par uuid not null default auth.uid() references profils (id),
  created_at timestamptz not null default now()
);
create index on justificatifs_chantier (chantier_id);

-- ---------------------------------------------------------------------------
-- Règles de validité
-- ---------------------------------------------------------------------------
-- Kbis ou carte d'artisan : moins de 3 mois. Vigilance URSSAF : 6 mois. Les autres : date de fin.
create function fin_validite(p_type type_doc_entreprise, p_emission date, p_fin date) returns date
language sql immutable as $$
  select case p_type
    when 'kbis' then (p_emission + interval '3 months')::date
    when 'vigilance_urssaf' then (p_emission + interval '6 months')::date
    else p_fin
  end;
$$;

-- Décennale et RC pro partout ; Kbis et vigilance en plus sur les marchés pros.
-- RGE, Qualibat, Qualifelec : facultatifs, affichés s'ils sont fournis.
create function docs_entreprise_requis(p_type type_chantier) returns type_doc_entreprise[]
language sql immutable as $$
  select case when p_type = 'pro'
    then array['decennale', 'rc_pro', 'kbis', 'vigilance_urssaf']::type_doc_entreprise[]
    else array['decennale', 'rc_pro']::type_doc_entreprise[]
  end;
$$;

create function justificatifs_requis(p_type type_chantier) returns type_justificatif[]
language sql immutable as $$
  select case when p_type = 'pro'
    then array['consuel', 'etancheite_air', 'attestation_re2020', 'pv_reception']::type_justificatif[]
    else array[]::type_justificatif[]
  end;
$$;

-- ---------------------------------------------------------------------------
-- Vues
-- ---------------------------------------------------------------------------
-- Entreprises présentes sur un chantier : celles des artisans membres et celles qui ont posé.
create view entreprises_chantier with (security_invoker = true) as
select m.chantier_id, m.organisation_id
from membres_chantier m
where m.role = 'artisan' and m.organisation_id is not null
union
select p.chantier_id, p.organisation_id
from poses p
where p.organisation_id is not null;

-- Une ligne par entreprise, chantier et document exigé, avec son statut.
-- Le document le plus récent (date de fin la plus lointaine) fait foi.
create view conformite with (security_invoker = true) as
select
  e.chantier_id,
  e.organisation_id,
  o.nom as entreprise,
  req.type_doc,
  d.fin,
  case
    when d.fin is null then 'manquant'
    when d.fin < current_date then 'expire'
    when d.fin <= current_date + 30 then 'expire_bientot'
    else 'valide'
  end as statut
from entreprises_chantier e
join chantiers c on c.id = e.chantier_id
join organisations o on o.id = e.organisation_id
cross join lateral unnest(docs_entreprise_requis(c.type)) as req (type_doc)
left join lateral (
  select max(fin_validite(de.type, de.date_emission, de.date_fin)) as fin
  from documents_entreprise de
  where de.organisation_id = e.organisation_id and de.type = req.type_doc
) d on true;

create view justificatifs_manquants_chantier with (security_invoker = true) as
select c.id as chantier_id, r.type
from chantiers c
cross join lateral unnest(justificatifs_requis(c.type)) as r (type)
where not exists (select 1 from justificatifs_chantier j where j.chantier_id = c.id and j.type = r.type);

create function chantier_conforme(p_chantier uuid) returns boolean
language sql stable security invoker set search_path = public as $$
  select not exists (
    select 1 from conformite where chantier_id = p_chantier and statut in ('manquant', 'expire')
  );
$$;

create function justificatifs_manquants(p_chantier uuid) returns type_justificatif[]
language sql stable security invoker set search_path = public as $$
  select coalesce(array_agg(type), '{}') from justificatifs_manquants_chantier where chantier_id = p_chantier;
$$;

-- ---------------------------------------------------------------------------
-- Le solde exige aussi des entreprises en règle et, en marché pro, tous les justificatifs.
-- ---------------------------------------------------------------------------
create or replace function demander_paiement(p_jalon uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_jalon jalons;
  v_chantier chantiers;
  v_compl chantiers_completude;
  v_manquants type_justificatif[];
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
    -- Sur les poses, pas sur le taux : 99,6 % s'arrondit à 100 %.
    if v_compl.poses = 0 or v_compl.poses_completes < v_compl.poses then
      raise exception 'Le dossier est incomplet (% %%)', v_compl.taux;
    end if;
    if v_chantier.type = 'pro' and v_compl.reserves_ouvertes > 0 then
      raise exception 'Des réserves sont encore ouvertes';
    end if;
    if not chantier_conforme(v_chantier.id) then
      raise exception 'Une entreprise du chantier n''est pas en règle (assurance, Kbis ou attestation URSSAF)';
    end if;
    v_manquants := justificatifs_manquants(v_chantier.id);
    if cardinality(v_manquants) > 0 then
      raise exception 'Justificatifs du chantier manquants : %', array_to_string(v_manquants, ', ');
    end if;
  elsif v_jalon.condition = 'un_an_apres_reception' then
    if v_chantier.date_reception is null or v_chantier.date_reception + interval '1 year' > now() then
      raise exception 'La retenue de garantie se libère un an après la réception';
    end if;
  end if;

  update jalons set statut = 'demande', demande_le = now() where id = p_jalon;
end $$;

-- ---------------------------------------------------------------------------
-- Accès
-- ---------------------------------------------------------------------------
create function mon_organisation() returns uuid
language sql stable security definer set search_path = public as $$
  select organisation_id from profils where id = auth.uid();
$$;

-- Vrai si l'utilisateur partage au moins un chantier avec cette entreprise.
create function partage_chantier_avec(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membres_chantier moi
    where moi.profil_id = auth.uid()
      and (exists (select 1 from membres_chantier m where m.chantier_id = moi.chantier_id and m.organisation_id = p_org)
           or exists (select 1 from poses p where p.chantier_id = moi.chantier_id and p.organisation_id = p_org))
  );
$$;

-- Garde-fou : sans lui, on pourrait se rattacher à l'entreprise d'un autre (et déposer en son nom)
-- ou attribuer une pose à une autre entreprise (et lire ses attestations).
create function proteger_organisation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_table_name = 'profils' then
    if new.organisation_id is distinct from old.organisation_id and new.organisation_id is not null
       and not exists (select 1 from organisations where id = new.organisation_id and created_by = auth.uid()) then
      raise exception 'Vous ne pouvez rejoindre que l''entreprise que vous avez créée';
    end if;
  elsif tg_table_name = 'poses' then
    if new.organisation_id is not null and new.organisation_id is distinct from mon_organisation()
       and (tg_op = 'INSERT' or new.organisation_id is distinct from old.organisation_id) then
      raise exception 'Une pose ne peut être attribuée qu''à votre entreprise';
    end if;
  end if;
  return new;
end $$;

create trigger profils_organisation before update on profils
  for each row execute function proteger_organisation();
create trigger poses_organisation before insert or update on poses
  for each row execute function proteger_organisation();

alter table documents_entreprise enable row level security;
alter table justificatifs_chantier enable row level security;

create policy documents_entreprise_lecture on documents_entreprise for select to authenticated
  using (organisation_id = mon_organisation() or partage_chantier_avec(organisation_id) or est_admin());
create policy documents_entreprise_depot on documents_entreprise for insert to authenticated
  with check (organisation_id = mon_organisation() and depose_par = auth.uid());
create policy documents_entreprise_suppression on documents_entreprise for delete to authenticated
  using (organisation_id = mon_organisation());

create policy justificatifs_lecture on justificatifs_chantier for select to authenticated
  using (est_membre(chantier_id));
create policy justificatifs_depot on justificatifs_chantier for insert to authenticated
  with check (est_membre(chantier_id) and depose_par = auth.uid());

-- Fichiers des entreprises : stockage « entreprises », chemin <organisation_id>/<fichier>
insert into storage.buckets (id, name, public) values ('entreprises', 'entreprises', false)
on conflict (id) do nothing;

create function organisation_du_chemin(p_name text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create policy entreprises_fichiers_lecture on storage.objects for select to authenticated
  using (bucket_id = 'entreprises'
         and (organisation_du_chemin(name) = mon_organisation() or partage_chantier_avec(organisation_du_chemin(name))));
create policy entreprises_fichiers_depot on storage.objects for insert to authenticated
  with check (bucket_id = 'entreprises' and organisation_du_chemin(name) = mon_organisation());

grant execute on function mon_organisation, chantier_conforme, justificatifs_manquants to authenticated;
