import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

const CLE = 'strata.invitation-en-attente';

/** Garde le jeton d'un lien d'invitation ouvert avant la connexion. */
export async function memoriserInvitation(jeton: string) {
  await AsyncStorage.setItem(CLE, jeton);
}

/** Accepte l'invitation gardée, s'il y en a une. Renvoie l'id du chantier rejoint. */
export async function accepterInvitationEnAttente(): Promise<string | null> {
  const jeton = await AsyncStorage.getItem(CLE);
  if (!jeton) return null;
  await AsyncStorage.removeItem(CLE);
  const { data, error } = await supabase.rpc('accepter_invitation', { p_jeton: jeton });
  if (error) throw error;
  return data as string;
}

export function lienInvitation(jeton: string): string {
  const base = process.env.EXPO_PUBLIC_LIEN_INVITATION ?? 'strata://invitation/';
  return `${base}${jeton}`;
}
