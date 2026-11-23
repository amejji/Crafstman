import { CameraView, useCameraPermissions } from 'expo-camera';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bandeau, Bouton, Carte, Chargement, Champ, Ecran, Puce, Puces, SousTitre, Texte } from '@/components/ui';
import { S } from '@/constants/theme';
import { dateFr } from '@/lib/format';
import { useSession } from '@/lib/session';
import { messageErreur, supabase } from '@/lib/supabase';
import type { Reserve } from '@/lib/types';
import { useChantier } from '@/lib/use-chantier';

async function envoyerPhoto(chantierId: string, uri: string): Promise<string> {
  const chemin = `${chantierId}/reserves/${randomUUID()}.jpg`;
  const corps = Platform.OS === 'web' ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer();
  const { error } = await supabase.storage.from('chantiers').upload(chemin, corps, { contentType: 'image/jpeg' });
  if (error) throw error;
  return chemin;
}

/** Appareil photo plein écran, renvoie l'URI de la photo. */
function PrisePhoto({ visible, onPhoto, onFermer }: { visible: boolean; onPhoto: (uri: string) => void; onFermer: () => void }) {
  const camera = useRef<CameraView>(null);
  const [permission, demander] = useCameraPermissions();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onFermer}>
      {permission?.granted ? (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView ref={camera} style={{ flex: 1 }} facing="back" />
          <SafeAreaView edges={['bottom']} style={{ padding: S.l, gap: S.s, backgroundColor: '#000' }}>
            <Bouton
              titre="Prendre la photo"
              onPress={async () => {
                const p = await camera.current?.takePictureAsync({ quality: 0.5 });
                if (p?.uri) onPhoto(p.uri);
              }}
            />
            <Bouton titre="Annuler" variante="secondaire" onPress={onFermer} />
          </SafeAreaView>
        </View>
      ) : (
        <Ecran>
          <Texte>La caméra est nécessaire pour photographier la réserve.</Texte>
          <Bouton titre="Autoriser la caméra" onPress={demander} />
          <Bouton titre="Annuler" variante="secondaire" onPress={onFermer} />
        </Ecran>
      )}
    </Modal>
  );
}

export default function Reserves() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees, recharger } = useChantier(id);
  const { session } = useSession();
  const [reserves, setReserves] = useState<Reserve[] | null>(null);
  const [description, setDescription] = useState('');
  const [lot, setLot] = useState('');
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [camera, setCamera] = useState<null | 'nouvelle' | string>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase.from('reserves').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    setReserves((data as Reserve[]) ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  if (!donnees || reserves === null) return <Chargement />;
  const nomPiece = new Map(donnees.pieces.map((p) => [p.id, p.nom]));

  const ajouter = async () => {
    if (!description.trim() || !session) return;
    setErreur(null);
    setChargement(true);
    try {
      const photo_path = photoUri ? await envoyerPhoto(id, photoUri) : null;
      const { error } = await supabase.from('reserves').insert({
        chantier_id: id,
        piece_id: pieceId,
        lot: lot.trim() || null,
        description: description.trim(),
        photo_path,
        created_by: session.user.id,
      });
      if (error) throw error;
      setDescription('');
      setLot('');
      setPhotoUri(null);
      await charger();
      await recharger();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  };

  const lever = async (reserveId: string, uri: string) => {
    setErreur(null);
    try {
      const photo_levee_path = await envoyerPhoto(id, uri);
      const { error } = await supabase
        .from('reserves')
        .update({ statut: 'levee', levee_le: new Date().toISOString(), photo_levee_path })
        .eq('id', reserveId);
      if (error) throw error;
      await charger();
      await recharger();
    } catch (e) {
      setErreur(messageErreur(e));
    }
  };

  const ouvertes = reserves.filter((r) => r.statut === 'ouverte');
  const levees = reserves.filter((r) => r.statut === 'levee');

  return (
    <Ecran>
      <PrisePhoto
        visible={camera !== null}
        onFermer={() => setCamera(null)}
        onPhoto={(uri) => {
          if (camera === 'nouvelle') setPhotoUri(uri);
          else if (camera) void lever(camera, uri);
          setCamera(null);
        }}
      />
      {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}

      <SousTitre>Nouvelle réserve</SousTitre>
      <Champ libelle="Description" value={description} onChangeText={setDescription} placeholder="Joint de plinthe à reprendre" multiline />
      <Champ libelle="Lot (facultatif)" value={lot} onChangeText={setLot} placeholder="Plâtrerie" />
      <Puces>
        {donnees.pieces.map((p) => (
          <Puce key={p.id} libelle={p.nom} choisie={pieceId === p.id} onPress={() => setPieceId(pieceId === p.id ? null : p.id)} />
        ))}
      </Puces>
      <Bouton titre={photoUri ? 'Photo prise · reprendre' : 'Ajouter une photo'} variante="secondaire" onPress={() => setCamera('nouvelle')} />
      <Bouton titre="Enregistrer la réserve" onPress={ajouter} chargement={chargement} desactive={!description.trim()} />

      <SousTitre>Ouvertes ({ouvertes.length})</SousTitre>
      {ouvertes.length === 0 ? <Texte doux>Aucune réserve ouverte.</Texte> : null}
      {ouvertes.map((r) => (
        <Carte key={r.id}>
          <Texte gras>{r.description}</Texte>
          <Texte doux>{[r.lot, r.piece_id ? nomPiece.get(r.piece_id) : null, `le ${dateFr(r.created_at)}`].filter(Boolean).join(' · ')}</Texte>
          <Bouton titre="Lever avec une photo" variante="secondaire" onPress={() => setCamera(r.id)} />
        </Carte>
      ))}

      {levees.length ? <SousTitre>Levées ({levees.length})</SousTitre> : null}
      {levees.map((r) => (
        <Carte key={r.id}>
          <Texte>{r.description}</Texte>
          <Texte doux>Levée le {dateFr(r.levee_le)}</Texte>
        </Carte>
      ))}
    </Ecran>
  );
}
