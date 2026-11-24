-- Conformité : électricien, maître d'ouvrage, concurrent, intrus.
-- S'exécute après scenario.sql (fonctions pg_temp et droits déjà en place).
\set QUIET on

insert into auth.users values
  ('00000000-0000-0000-0000-0000000000e1', 'elec@exemple.fr'),
  ('00000000-0000-0000-0000-0000000000f1', 'mo2@exemple.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'concurrent@exemple.fr'),
  ('00000000-0000-0000-0000-0000000000d2', 'intrus2@exemple.fr');

-- Fiches produit complètes pour le carrelage (pour isoler la conformité)
insert into documents (produit_id, type, nom, storage_path)
select id, t, t::text, id || '/' || t || '.pdf'
from produits, unnest(array['fiche_technique', 'notice', 'avis_technique', 'fdes']::type_document[]) as t
where ean = '3760000000048';

-- 1. Deux entreprises ; le concurrent ne peut pas se rattacher à celle de l'électricien
select pg_temp.devenir('00000000-0000-0000-0000-0000000000a2');
insert into organisations (nom, created_by) values ('Concurrent SARL', auth.uid());
update profils set nom = 'Concurrent', organisation_id = (select id from organisations where nom = 'Concurrent SARL') where id = auth.uid();

select pg_temp.devenir('00000000-0000-0000-0000-0000000000e1');
insert into organisations (nom, created_by) values ('Élec Lumière', auth.uid()) returning id as org_elec \gset
update profils set nom = 'Élise', organisation_id = :'org_elec' where id = auth.uid();

select pg_temp.devenir('00000000-0000-0000-0000-0000000000a2');
select pg_temp.attendre_erreur(format($$update profils set organisation_id = %L where id = auth.uid()$$, :'org_elec'), 'entreprise que vous avez créée');

-- 2. Chantier pro de l'électricien, une pose complète, réception prononcée
select pg_temp.devenir('00000000-0000-0000-0000-0000000000e1');
select creer_chantier('Groupe scolaire', 'Villeurbanne', 'pro', 60000, 'artisan', array['Préau']) as ch \gset
insert into invitations (chantier_id, role, jeton) values (:'ch', 'maitre_ouvrage', 'jeton-mo2');
insert into poses (id, chantier_id, produit_id, organisation_id)
select '66666666-6666-6666-6666-666666666666', :'ch', id, :'org_elec' from produits where ean = '3760000000048';

select pg_temp.devenir('00000000-0000-0000-0000-0000000000f1');
select accepter_invitation('jeton-mo2');
select prononcer_reception(:'ch', current_date);

-- 3. Le concurrent ne peut ni attribuer une pose à l'électricien, ni déposer en son nom
select pg_temp.devenir('00000000-0000-0000-0000-0000000000a2');
select creer_chantier('Leurre', null, 'particulier', 0, 'artisan') as leurre \gset
select pg_temp.attendre_erreur(format($$insert into poses (id, chantier_id, designation_saisie, organisation_id)
  values (gen_random_uuid(), %L, 'x', %L)$$, :'leurre', :'org_elec'), 'votre entreprise');
select pg_temp.attendre_erreur(format($$insert into documents_entreprise (organisation_id, type, storage_path, date_emission, date_fin)
  values (%L, 'decennale', 'faux.pdf', current_date, current_date + 365)$$, :'org_elec'), 'row-level security');
select pg_temp.attendre_erreur(format($$insert into storage.objects (bucket_id, name) values ('entreprises', %L)$$, :'org_elec' || '/faux.pdf'), 'row-level security');

-- 4. Sans documents, le solde est refusé
select pg_temp.devenir('00000000-0000-0000-0000-0000000000e1');
do $$ begin
  assert (select count(*) from conformite) = 4, 'quatre documents exigés sur un marché pro';
  assert (select bool_and(statut = 'manquant') from conformite), 'tout est manquant';
end $$;
select pg_temp.attendre_erreur($$select demander_paiement((select j.id from jalons j join chantiers c on c.id = j.chantier_id where c.nom = 'Groupe scolaire' and ordre = 3))$$, 'pas en règle');

-- 5. Documents périmés : décennale expirée, Kbis de 4 mois, vigilance de 7 mois
insert into storage.objects (bucket_id, name) values ('entreprises', :'org_elec' || '/decennale.pdf');
insert into documents_entreprise (organisation_id, type, storage_path, date_emission, date_fin) values
  (:'org_elec', 'decennale', 'd1.pdf', current_date - 400, current_date - 1),
  (:'org_elec', 'rc_pro', 'rc.pdf', current_date - 30, current_date + 335),
  (:'org_elec', 'kbis', 'k1.pdf', current_date - interval '4 months', null),
  (:'org_elec', 'vigilance_urssaf', 'v1.pdf', current_date - interval '7 months', null);
do $$ begin
  assert (select statut from conformite where type_doc = 'decennale') = 'expire', 'décennale expirée';
  assert (select statut from conformite where type_doc = 'kbis') = 'expire', 'Kbis de plus de 3 mois';
  assert (select statut from conformite where type_doc = 'vigilance_urssaf') = 'expire', 'vigilance de plus de 6 mois';
  assert (select statut from conformite where type_doc = 'rc_pro') = 'valide', 'RC pro valide';
end $$;
select pg_temp.attendre_erreur($$select demander_paiement((select j.id from jalons j join chantiers c on c.id = j.chantier_id where c.nom = 'Groupe scolaire' and ordre = 3))$$, 'pas en règle');

-- 6. Le maître d'ouvrage voit les attestations ; le concurrent et l'intrus ne voient rien
select pg_temp.devenir('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  assert (select count(*) from documents_entreprise) = 4, 'le maître d''ouvrage voit les 4 documents';
  assert (select count(*) from storage.objects where bucket_id = 'entreprises') = 1, 'et le fichier';
  assert (select count(*) from conformite) = 4, 'et la conformité du chantier';
end $$;
select pg_temp.devenir('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  assert (select count(*) from documents_entreprise) = 0, 'le concurrent ne voit rien';
  assert (select count(*) from storage.objects where bucket_id = 'entreprises') = 0, 'ni les fichiers';
end $$;
select pg_temp.devenir('00000000-0000-0000-0000-0000000000d2');
do $$ begin
  assert (select count(*) from documents_entreprise) = 0, 'l''intrus ne voit rien';
  assert (select count(*) from conformite) = 0, 'ni la conformité';
end $$;

-- 7. Documents à jour, un par un : le blocage tient jusqu'au dernier
select pg_temp.devenir('00000000-0000-0000-0000-0000000000e1');
insert into documents_entreprise (organisation_id, type, storage_path, date_emission, date_fin) values
  (:'org_elec', 'decennale', 'd2.pdf', current_date - 345, current_date + 20),
  (:'org_elec', 'kbis', 'k2.pdf', current_date - 10, null);
do $$ begin
  assert (select statut from conformite where type_doc = 'decennale') = 'expire_bientot', 'alerte 30 jours avant';
end $$;
select pg_temp.attendre_erreur($$select demander_paiement((select j.id from jalons j join chantiers c on c.id = j.chantier_id where c.nom = 'Groupe scolaire' and ordre = 3))$$, 'pas en règle');
insert into documents_entreprise (organisation_id, type, storage_path, date_emission) values
  (:'org_elec', 'vigilance_urssaf', 'v2.pdf', current_date - 20);
do $$ begin assert chantier_conforme((select id from chantiers where nom = 'Groupe scolaire')), 'entreprise en règle'; end $$;

-- 8. Justificatifs du chantier (marché pro)
select pg_temp.attendre_erreur($$select demander_paiement((select j.id from jalons j join chantiers c on c.id = j.chantier_id where c.nom = 'Groupe scolaire' and ordre = 3))$$, 'consuel');
insert into justificatifs_chantier (chantier_id, type, storage_path)
select :'ch', t, :'ch' || '/justificatifs/' || t || '.pdf'
from unnest(array['consuel', 'etancheite_air', 'attestation_re2020']::type_justificatif[]) as t;
select pg_temp.attendre_erreur($$select demander_paiement((select j.id from jalons j join chantiers c on c.id = j.chantier_id where c.nom = 'Groupe scolaire' and ordre = 3))$$, 'pv_reception');
select pg_temp.devenir('00000000-0000-0000-0000-0000000000a2');
select pg_temp.attendre_erreur(format($$insert into justificatifs_chantier (chantier_id, type, storage_path) values (%L, 'pv_reception', 'x.pdf')$$, :'ch'), 'row-level security');
select pg_temp.devenir('00000000-0000-0000-0000-0000000000f1');
insert into justificatifs_chantier (chantier_id, type, storage_path) values (:'ch', 'pv_reception', :'ch' || '/justificatifs/pv.pdf');
select pg_temp.devenir('00000000-0000-0000-0000-0000000000e1');
select demander_paiement((select j.id from jalons j join chantiers c on c.id = j.chantier_id where c.nom = 'Groupe scolaire' and ordre = 3));
do $$ begin
  assert (select statut from jalons j join chantiers c on c.id = j.chantier_id where c.nom = 'Groupe scolaire' and ordre = 3) = 'demande',
    'solde débloqué quand tout est fourni';
end $$;

-- 9. Chez un particulier : décennale et RC pro seulement, aucun justificatif de chantier
select creer_chantier('Maison Petit', null, 'particulier', 9000, 'artisan') as part \gset
do $$ begin
  assert (select count(*) from conformite c join chantiers ch on ch.id = c.chantier_id where ch.nom = 'Maison Petit') = 2,
    'deux documents exigés chez un particulier';
  assert cardinality(justificatifs_manquants((select id from chantiers where nom = 'Maison Petit'))) = 0,
    'aucun justificatif de chantier chez un particulier';
end $$;

reset role;
\echo 'Conformité OK : tous les contrôles sont passés.'
