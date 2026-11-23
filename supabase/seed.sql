-- Données de démonstration pour un environnement local.
-- Ces produits sont fictifs : la vraie base viendra des fabricants et distributeurs.

insert into produits (ean, designation, marque, garantie_fabricant_mois, entretien) values
  ('3760000000017', 'Plaque de plâtre BA13 standard 1200 × 2500 mm', 'Exemple Plâtres', 120, 'Aucun entretien particulier.'),
  ('3760000000024', 'Laine de verre 100 mm R = 3,15', 'Exemple Isolation', 120, 'Vérifier l''absence d''humidité tous les 5 ans.'),
  ('3760000000031', 'Mitigeur thermostatique de douche', 'Exemple Sanitaire', 60, 'Détartrer la cartouche une fois par an.'),
  ('3760000000048', 'Carrelage grès cérame 60 × 60 cm', 'Exemple Céramique', 120, 'Nettoyage au pH neutre.'),
  ('3760000000055', 'Fenêtre PVC double vitrage 1250 × 1350 mm', 'Exemple Menuiseries', 120, 'Graisser les ferrures une fois par an.')
on conflict (ean) do nothing;

-- Les PDF correspondants sont à déposer dans le stockage « produits » sous <produit_id>/<fichier>.pdf,
-- puis à déclarer ici. Exemple pour le premier produit (le fichier doit exister) :
-- insert into documents (produit_id, type, nom, storage_path)
-- select id, 'fiche_technique', 'Fiche technique BA13', id || '/fiche-technique.pdf'
-- from produits where ean = '3760000000017';
