import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSession } from './session';
import { messageErreur, supabase } from './supabase';
import type { Chantier, Completude, Piece, RoleChantier } from './types';

export type DonneesChantier = {
  chantier: Chantier;
  role: RoleChantier | null;
  pieces: Piece[];
  completude: Completude | null;
};

/** Charge un chantier et le recharge à chaque retour sur l'écran. */
export function useChantier(id: string | undefined) {
  const { session } = useSession();
  const [donnees, setDonnees] = useState<DonneesChantier | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!id || !session) return;
    const [ch, membre, pieces, compl] = await Promise.all([
      supabase.from('chantiers').select('*').eq('id', id).maybeSingle(),
      supabase.from('membres_chantier').select('role').eq('chantier_id', id).eq('profil_id', session.user.id).maybeSingle(),
      supabase.from('pieces').select('id, nom, ordre').eq('chantier_id', id).order('ordre'),
      supabase.from('chantiers_completude').select('*').eq('chantier_id', id).maybeSingle(),
    ]);
    const err = ch.error ?? membre.error ?? pieces.error ?? compl.error;
    if (err) return setErreur(messageErreur(err));
    if (!ch.data) return setErreur('Chantier introuvable ou accès refusé.');
    setErreur(null);
    setDonnees({
      chantier: ch.data as Chantier,
      role: (membre.data?.role as RoleChantier | undefined) ?? null,
      pieces: (pieces.data as Piece[]) ?? [],
      completude: (compl.data as Completude | null) ?? null,
    });
  }, [id, session]);

  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  return { donnees, erreur, recharger: charger };
}
