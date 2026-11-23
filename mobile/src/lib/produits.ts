import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import type { Produit } from './types';

const CLE_CACHE = 'strata.produits-vus.v1';
const cleDernierePiece = (chantierId: string) => `strata.derniere-piece.${chantierId}`;

type Cache = Record<string, Produit | null>;

async function lireCache(): Promise<Cache> {
  try {
    return JSON.parse((await AsyncStorage.getItem(CLE_CACHE)) ?? '{}') as Cache;
  } catch {
    return {};
  }
}

export type ResultatRecherche =
  | { etat: 'trouve'; produit: Produit }
  | { etat: 'inconnu' }
  | { etat: 'hors-ligne' };

/** Cherche un EAN dans la base produits ; hors connexion, se rabat sur les produits déjà vus. */
export async function chercherProduit(ean: string): Promise<ResultatRecherche> {
  const cache = await lireCache();
  try {
    const { data, error } = await supabase
      .from('produits')
      .select('id, ean, designation, marque')
      .eq('ean', ean)
      .maybeSingle();
    if (error) throw error;
    cache[ean] = (data as Produit | null) ?? null;
    void AsyncStorage.setItem(CLE_CACHE, JSON.stringify(cache));
    return data ? { etat: 'trouve', produit: data as Produit } : { etat: 'inconnu' };
  } catch {
    const connu = cache[ean];
    if (connu) return { etat: 'trouve', produit: connu };
    if (connu === null) return { etat: 'inconnu' };
    return { etat: 'hors-ligne' };
  }
}

export async function dernierePiece(chantierId: string): Promise<string | null> {
  return AsyncStorage.getItem(cleDernierePiece(chantierId));
}

export async function memoriserPiece(chantierId: string, pieceId: string) {
  await AsyncStorage.setItem(cleDernierePiece(chantierId), pieceId);
}
