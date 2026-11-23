-- Scénario de bout en bout : artisan, architecte, maître d'ouvrage, intrus.
-- Lancer avec : psql -v ON_ERROR_STOP=1 -f stub_supabase.sql -f ../migrations/*.sql -f ../seed.sql -f scenario.sql
\set QUIET on
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'artisan@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'archi@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000c', 'mo@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000d', 'intrus@exemple.fr');

create or replace function pg_temp.devenir(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p::text, false);
  perform set_config('role', 'authenticated', false);
end $$;
create or replace function pg_temp.attendre_erreur(p_sql text, p_motif text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'ÉCHEC : aucune erreur pour %', p_sql;
exception when others then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  if sqlerrm not ilike '%' || p_motif || '%' then
    raise exception 'ÉCHEC : erreur inattendue pour % : %', p_sql, sqlerrm;
  end if;
end $$;

-- 1. L'artisan crée son entreprise et un chantier
select pg_temp.devenir('00000000-0000-0000-0000-00000000000a');
insert into organisations (nom, siret, created_by) values ('Martin Plâtrerie', '12345678900011', auth.uid());
update profils set nom = 'Paul Martin', organisation_id = (select id from organisations where nom = 'Martin Plâtrerie') where id = auth.uid();
select pg_temp.attendre_erreur($$update profils set est_admin = true where id = auth.uid()$$, 'administrateur');
select creer_chantier('Maison Durand', '12 rue des Lilas, Lyon', 'pro', 100000, 'artisan', array['Salon', 'Cuisine', '']) as chantier \gset
do $$ begin
  assert (select count(*) from pieces) = 2, 'deux pièces attendues';
  assert (select sum(pourcentage) from jalons) = 100, 'échéancier à 100 %';
  assert (select count(*) from jalons) = 4, 'quatre jalons sur un marché pro';
end $$;

-- 2. Invitations
insert into invitations (chantier_id, role, jeton) values (:'chantier', 'architecte', 'jeton-archi'), (:'chantier', 'maitre_ouvrage', 'jeton-mo');

-- 3. L'intrus ne voit rien et ne peut rien écrire
select pg_temp.devenir('00000000-0000-0000-0000-00000000000d');
do $$ begin
  assert (select count(*) from chantiers) = 0, 'intrus : aucun chantier visible';
  assert (select count(*) from pieces) = 0, 'intrus : aucune pièce visible';
  assert (select count(*) from produits) = 5, 'la base produits est lisible par tous';
end $$;
select pg_temp.attendre_erreur(format($$insert into poses (id, chantier_id, designation_saisie) values (gen_random_uuid(), %L, 'x')$$, :'chantier'), 'row-level security');
select pg_temp.attendre_erreur($$select accepter_invitation('mauvais')$$, 'introuvable');

-- 4. L'artisan enregistre des poses (dont une renvoyée deux fois, hors connexion)
select pg_temp.devenir('00000000-0000-0000-0000-00000000000a');
insert into poses (id, chantier_id, piece_id, produit_id, organisation_id, ean_scanne, photo_path)
select '11111111-1111-1111-1111-111111111111', :'chantier', (select id from pieces where nom = 'Salon'), p.id,
       (select organisation_id from profils where id = auth.uid()), p.ean, :'chantier' || '/poses/1.jpg'
from produits p where ean = '3760000000017';
insert into poses (id, chantier_id, produit_id) select '11111111-1111-1111-1111-111111111111', :'chantier', id from produits where ean = '3760000000017'
on conflict (id) do nothing;
insert into poses (id, chantier_id, designation_saisie, marque_saisie, lot)
values ('22222222-2222-2222-2222-222222222222', :'chantier', 'Bande à joint', 'Inconnue', 'L42');
-- Pose scannée hors connexion : seul le code part, le produit est retrouvé à l'arrivée
insert into poses (id, chantier_id, ean_scanne) values ('33333333-3333-3333-3333-333333333333', :'chantier', '3760000000017');
do $$ begin
  assert (select produit_id is not null from poses where id = '33333333-3333-3333-3333-333333333333'), 'produit retrouvé par son EAN';
end $$;
delete from poses where id = '33333333-3333-3333-3333-333333333333';
do $$ begin
  assert (select count(*) from poses) = 2, 'la pose renvoyée n''est pas doublée';
  assert (select taux from chantiers_completude) = 0, 'aucun document : dossier à 0 %';
end $$;
insert into storage.objects (bucket_id, name) values ('chantiers', :'chantier' || '/poses/1.jpg');
select pg_temp.attendre_erreur($$insert into storage.objects (bucket_id, name) values ('chantiers', '99999999-9999-9999-9999-999999999999/x.jpg')$$, 'row-level security');

-- 5. Architecte et maître d'ouvrage rejoignent le chantier
select pg_temp.devenir('00000000-0000-0000-0000-00000000000b');
select accepter_invitation('jeton-archi') = :'chantier' as ok \gset
do $$ begin assert (select count(*) from chantiers) = 1, 'l''architecte voit le chantier'; end $$;
insert into reserves (chantier_id, description) values (:'chantier', 'Joint de plinthe à reprendre');
select pg_temp.attendre_erreur(format($$select prononcer_reception(%L)$$, :'chantier'), 'maître d''ouvrage');
select pg_temp.attendre_erreur(format($$update chantiers set date_reception = current_date where id = %L$$, :'chantier'), 'prononcer_reception');

select pg_temp.devenir('00000000-0000-0000-0000-00000000000c');
select accepter_invitation('jeton-mo');
select pg_temp.attendre_erreur($$select accepter_invitation('jeton-archi')$$, 'déjà utilisée');

-- 6. Paiements : acompte libre, solde bloqué tant que tout n'est pas en ordre
select pg_temp.devenir('00000000-0000-0000-0000-00000000000a');
select demander_paiement((select id from jalons where ordre = 1));
select pg_temp.attendre_erreur($$select demander_paiement((select id from jalons where ordre = 3))$$, 'réception');
select pg_temp.devenir('00000000-0000-0000-0000-00000000000c');
select valider_jalon((select id from jalons where ordre = 1));
select prononcer_reception(:'chantier', current_date);
do $$ begin
  assert (select fin_decennale from garanties) = current_date + interval '10 years', 'garantie décennale à 10 ans';
end $$;

select pg_temp.devenir('00000000-0000-0000-0000-00000000000a');
select pg_temp.attendre_erreur($$select demander_paiement((select id from jalons where ordre = 3))$$, 'incomplet');
-- Les documents arrivent (déposés par l'administrateur pour le produit, par l'artisan pour la pose saisie à la main)
reset role;
insert into documents (produit_id, type, nom, storage_path) select id, 'fiche_technique', 'FT', id || '/ft.pdf' from produits where ean = '3760000000017';
select pg_temp.devenir('00000000-0000-0000-0000-00000000000a');
insert into documents (pose_id, type, nom, storage_path) values ('22222222-2222-2222-2222-222222222222', 'notice', 'Notice', :'chantier' || '/docs/n.pdf');
do $$ begin assert (select taux from chantiers_completude) = 100, 'dossier complet'; end $$;
select pg_temp.attendre_erreur($$select demander_paiement((select id from jalons where ordre = 3))$$, 'réserves');
update reserves set statut = 'levee', levee_le = now();
select demander_paiement((select id from jalons where ordre = 3));
select pg_temp.attendre_erreur($$select demander_paiement((select id from jalons where ordre = 4))$$, 'un an');
select pg_temp.attendre_erreur($$select valider_jalon((select id from jalons where ordre = 3))$$, 'client');

reset role;
\echo 'Scénario OK : tous les contrôles sont passés.'
