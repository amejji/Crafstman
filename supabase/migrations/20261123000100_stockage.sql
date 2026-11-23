-- Stockage des fichiers.
-- « chantiers » : photos de pose, de réserve, PDF générés. Chemin : <chantier_id>/...
-- « produits »  : fiches techniques, notices, FDES de la base produits. Chemin : <produit_id>/...

insert into storage.buckets (id, name, public)
values ('chantiers', 'chantiers', false), ('produits', 'produits', false)
on conflict (id) do nothing;

create function public.chantier_du_chemin(p_name text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create policy chantiers_fichiers_lecture on storage.objects for select to authenticated
  using (bucket_id = 'chantiers' and public.est_membre(public.chantier_du_chemin(name)));

create policy chantiers_fichiers_envoi on storage.objects for insert to authenticated
  with check (bucket_id = 'chantiers' and public.est_membre(public.chantier_du_chemin(name)));

create policy produits_fichiers_lecture on storage.objects for select to authenticated
  using (bucket_id = 'produits');

create policy produits_fichiers_admin on storage.objects for all to authenticated
  using (bucket_id = 'produits' and public.est_admin())
  with check (bucket_id = 'produits' and public.est_admin());
