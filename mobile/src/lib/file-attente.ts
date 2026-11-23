// File d'attente des poses : chaque pose est d'abord gardée sur le téléphone,
// puis envoyée dès que le réseau le permet. L'identifiant est créé ici, donc
// un envoi répété après une coupure ne crée pas de doublon côté serveur.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { messageErreur, supabase } from './supabase';

const CLE = 'strata.poses-en-attente.v1';

export type PoseEnAttente = {
  id: string;
  chantier_id: string;
  piece_id: string | null;
  produit_id: string | null;
  organisation_id: string | null;
  ean_scanne: string | null;
  designation_saisie: string | null;
  marque_saisie: string | null;
  lot: string | null;
  posee_le: string;
  photo_uri: string | null;
  photo_etiquette_uri: string | null;
  erreur?: string;
};

type Ecouteur = (poses: PoseEnAttente[]) => void;
const ecouteurs = new Set<Ecouteur>();
let envoiEnCours: Promise<void> | null = null;

async function lire(): Promise<PoseEnAttente[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as PoseEnAttente[]) : [];
  } catch {
    return [];
  }
}

async function ecrire(poses: PoseEnAttente[]) {
  await AsyncStorage.setItem(CLE, JSON.stringify(poses));
  ecouteurs.forEach((e) => e(poses));
}

export function ecouterFile(e: Ecouteur): () => void {
  ecouteurs.add(e);
  lire().then(e);
  return () => {
    ecouteurs.delete(e);
  };
}

/** Copie la photo hors du cache, pour qu'elle survive jusqu'à l'envoi. */
function conserverPhoto(uri: string | null, nom: string): string | null {
  if (!uri || Platform.OS === 'web') return uri;
  try {
    const dossier = new Directory(Paths.document, 'poses-en-attente');
    dossier.create({ idempotent: true, intermediates: true });
    const cible = new File(dossier, nom);
    if (cible.exists) cible.delete();
    new File(uri).copy(cible);
    return cible.uri;
  } catch {
    return uri;
  }
}

function supprimerPhoto(uri: string | null) {
  if (!uri || Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // déjà supprimée
  }
}

async function octets(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

export async function ajouterPose(
  pose: Omit<PoseEnAttente, 'id' | 'posee_le' | 'erreur'>,
): Promise<string> {
  const id = randomUUID();
  const entree: PoseEnAttente = {
    ...pose,
    id,
    posee_le: new Date().toISOString(),
    photo_uri: conserverPhoto(pose.photo_uri, `${id}.jpg`),
    photo_etiquette_uri: conserverPhoto(pose.photo_etiquette_uri, `${id}-etiquette.jpg`),
  };
  await ecrire([...(await lire()), entree]);
  void envoyerFile();
  return id;
}

async function envoyerUne(p: PoseEnAttente) {
  const envoyerPhoto = async (uri: string | null, suffixe: string) => {
    if (!uri) return null;
    const chemin = `${p.chantier_id}/poses/${p.id}${suffixe}.jpg`;
    const { error } = await supabase.storage
      .from('chantiers')
      .upload(chemin, await octets(uri), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    return chemin;
  };

  const photo_path = await envoyerPhoto(p.photo_uri, '');
  const photo_etiquette_path = await envoyerPhoto(p.photo_etiquette_uri, '-etiquette');

  const { error } = await supabase.from('poses').upsert(
    {
      id: p.id,
      chantier_id: p.chantier_id,
      piece_id: p.piece_id,
      produit_id: p.produit_id,
      organisation_id: p.organisation_id,
      ean_scanne: p.ean_scanne,
      designation_saisie: p.designation_saisie,
      marque_saisie: p.marque_saisie,
      lot: p.lot,
      posee_le: p.posee_le,
      photo_path,
      photo_etiquette_path,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

/** Envoie toutes les poses en attente. Sans réseau, elles restent sur le téléphone. */
export function envoyerFile(): Promise<void> {
  if (envoiEnCours) return envoiEnCours;
  envoiEnCours = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      for (const p of await lire()) {
        try {
          await envoyerUne(p);
          supprimerPhoto(p.photo_uri);
          supprimerPhoto(p.photo_etiquette_uri);
          await ecrire((await lire()).filter((x) => x.id !== p.id));
        } catch (e) {
          const message = messageErreur(e);
          await ecrire((await lire()).map((x) => (x.id === p.id ? { ...x, erreur: message } : x)));
          // Coupure réseau : inutile d'essayer les suivantes maintenant.
          if (/network|fetch|timeout|réseau/i.test(message)) break;
        }
      }
    } finally {
      envoiEnCours = null;
    }
  })();
  return envoiEnCours;
}

export async function posesEnAttente(chantierId?: string): Promise<PoseEnAttente[]> {
  const toutes = await lire();
  return chantierId ? toutes.filter((p) => p.chantier_id === chantierId) : toutes;
}
