// Choix d'un fichier (PDF ou photo) et envoi dans le stockage.
import * as DocumentPicker from 'expo-document-picker';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export type FichierChoisi = { uri: string; nom: string; type: string };

/** Ouvre le sélecteur de fichiers. Renvoie null si la personne annule. */
export async function choisirFichier(): Promise<FichierChoisi | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, nom: a.name, type: a.mimeType ?? 'application/pdf' };
}

/** Envoie le fichier dans un espace de stockage, sous le dossier donné, et renvoie son chemin. */
export async function envoyerFichier(bucket: 'entreprises' | 'chantiers', dossier: string, f: FichierChoisi): Promise<string> {
  const extension = f.nom.includes('.') ? f.nom.split('.').pop()!.toLowerCase() : f.type.includes('pdf') ? 'pdf' : 'jpg';
  const chemin = `${dossier}/${randomUUID()}.${extension}`;
  const contenu = Platform.OS === 'web' ? await (await fetch(f.uri)).arrayBuffer() : await new File(f.uri).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(chemin, contenu, { contentType: f.type });
  if (error) throw error;
  return chemin;
}
