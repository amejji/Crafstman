import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bandeau, Bouton, Champ, Ecran, Puce, Puces, Texte } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { ajouterPose } from '@/lib/file-attente';
import { eanValide } from '@/lib/format';
import { chercherProduit, dernierePiece, memoriserPiece } from '@/lib/produits';
import { useSession } from '@/lib/session';
import { messageErreur } from '@/lib/supabase';
import type { Produit } from '@/lib/types';
import { useChantier } from '@/lib/use-chantier';

type Etat =
  | { etape: 'scan' }
  | { etape: 'recherche'; ean: string }
  | { etape: 'produit'; ean: string; produit: Produit | null; horsLigne: boolean }
  | { etape: 'manuel'; ean: string | null };

// Parcours 1 : ouvrir, viser le code-barres, choisir la pièce, photo, valider. Moins de 10 secondes.
export default function Scanner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees } = useChantier(id);
  const { profil } = useSession();
  const [permission, demanderPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const dernierCode = useRef<{ code: string; t: number } | null>(null);

  const [etat, setEtat] = useState<Etat>({ etape: 'scan' });
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [lot, setLot] = useState('');
  const [designation, setDesignation] = useState('');
  const [marque, setMarque] = useState('');
  const [codeSaisi, setCodeSaisi] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ton: 'info' | 'alerte' } | null>(null);
  const [compteur, setCompteur] = useState(0);

  const pieces = useMemo(() => donnees?.pieces ?? [], [donnees]);
  const pieceChoisie = pieceId ?? pieces[0]?.id ?? null;

  useEffect(() => {
    if (!id) return;
    void dernierePiece(id).then((p) => p && setPieceId(p));
  }, [id]);

  const traiterCode = async (ean: string) => {
    setMessage(null);
    setEtat({ etape: 'recherche', ean });
    const r = await chercherProduit(ean);
    if (r.etat === 'trouve') setEtat({ etape: 'produit', ean, produit: r.produit, horsLigne: false });
    else if (r.etat === 'hors-ligne') setEtat({ etape: 'produit', ean, produit: null, horsLigne: true });
    else {
      setDesignation('');
      setMarque('');
      setEtat({ etape: 'manuel', ean });
    }
  };

  const surCode = ({ data }: BarcodeScanningResult) => {
    if (etat.etape !== 'scan') return;
    const maintenant = Date.now();
    // Évite de relire le même code juste après l'avoir enregistré.
    if (dernierCode.current && dernierCode.current.code === data && maintenant - dernierCode.current.t < 4000) return;
    dernierCode.current = { code: data, t: maintenant };
    void traiterCode(data);
  };

  const photographier = async (): Promise<string | null> => {
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.5, skipProcessing: Platform.OS === 'android' });
      return photo?.uri ?? null;
    } catch {
      return null;
    }
  };

  const valider = async () => {
    if (!id || etat.etape === 'scan' || etat.etape === 'recherche') return;
    if (etat.etape === 'manuel' && !designation.trim()) {
      setMessage({ texte: 'Indiquez au moins la désignation du produit.', ton: 'alerte' });
      return;
    }
    setEnregistrement(true);
    try {
      const uri = await photographier();
      const manuel = etat.etape === 'manuel';
      await ajouterPose({
        chantier_id: id,
        piece_id: pieceChoisie,
        produit_id: !manuel ? (etat.produit?.id ?? null) : null,
        organisation_id: profil?.organisation_id ?? null,
        ean_scanne: etat.ean,
        designation_saisie: manuel ? designation.trim() : null,
        marque_saisie: manuel ? marque.trim() || null : null,
        lot: lot.trim() || null,
        photo_uri: manuel ? null : uri,
        photo_etiquette_uri: manuel ? uri : null,
      });
      if (pieceChoisie) void memoriserPiece(id, pieceChoisie);
      setCompteur((n) => n + 1);
      setLot('');
      setMessage({
        texte: manuel ? 'Pose enregistrée · documents marqués « à fournir »' : 'Pose enregistrée',
        ton: 'info',
      });
      setEtat({ etape: 'scan' });
    } catch (e) {
      setMessage({ texte: messageErreur(e), ton: 'alerte' });
    } finally {
      setEnregistrement(false);
    }
  };

  if (!permission) return <Ecran><Texte doux>Accès à la caméra…</Texte></Ecran>;
  if (!permission.granted) {
    return (
      <Ecran>
        <Texte gras>Strata a besoin de la caméra</Texte>
        <Texte doux>Pour lire le code-barres des matériaux et photographier chaque pose.</Texte>
        <Bouton titre="Autoriser la caméra" onPress={demanderPermission} />
        <Bouton titre="Retour" variante="secondaire" onPress={() => router.back()} />
      </Ecran>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={etat.etape === 'scan' ? surCode : undefined}
      />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }} edges={['top', 'bottom']}>
        <View style={styles.haut}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.hautTexte}>Fermer</Text>
          </Pressable>
          <Text style={styles.hautTexte}>{compteur ? `${compteur} pose${compteur > 1 ? 's' : ''} ce passage` : donnees?.chantier.nom}</Text>
        </View>

        {etat.etape === 'scan' ? <View style={styles.viseur} pointerEvents="none" /> : null}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.panneau} contentContainerStyle={{ gap: S.m, padding: S.l }} keyboardShouldPersistTaps="handled">
            {message ? <Bandeau ton={message.ton}>{message.texte}</Bandeau> : null}

            {etat.etape === 'scan' ? (
              <>
                <Texte gras>Visez le code-barres du produit</Texte>
                <View style={{ flexDirection: 'row', gap: S.s, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <Champ
                      libelle="Ou saisissez le code"
                      value={codeSaisi}
                      onChangeText={(t) => setCodeSaisi(t.replace(/\D/g, ''))}
                      keyboardType="number-pad"
                      placeholder="3760000000017"
                    />
                  </View>
                  <Bouton
                    titre="OK"
                    desactive={!eanValide(codeSaisi)}
                    onPress={() => {
                      void traiterCode(codeSaisi);
                      setCodeSaisi('');
                    }}
                  />
                </View>
                <Bouton titre="Produit sans code-barres" variante="secondaire" onPress={() => setEtat({ etape: 'manuel', ean: null })} />
              </>
            ) : null}

            {etat.etape === 'recherche' ? <Texte doux>Recherche du produit {etat.ean}…</Texte> : null}

            {etat.etape === 'produit' ? (
              <>
                <Text style={styles.produit}>
                  {etat.produit ? etat.produit.designation : `Code ${etat.ean}`}
                </Text>
                <Texte doux>
                  {etat.produit
                    ? [etat.produit.marque, `EAN ${etat.ean}`].filter(Boolean).join(' · ')
                    : 'Hors connexion : le produit sera identifié à l’envoi.'}
                </Texte>
              </>
            ) : null}

            {etat.etape === 'manuel' ? (
              <>
                <Texte gras>{etat.ean ? `Produit inconnu (${etat.ean})` : 'Produit sans code-barres'}</Texte>
                <Champ libelle="Désignation" value={designation} onChangeText={setDesignation} placeholder="Bande à joint papier" />
                <Champ libelle="Marque" value={marque} onChangeText={setMarque} />
                <Texte doux>La photo prise en validant sera celle de l&apos;étiquette.</Texte>
              </>
            ) : null}

            {etat.etape === 'produit' || etat.etape === 'manuel' ? (
              <>
                <Puces>
                  {pieces.map((p) => (
                    <Puce key={p.id} libelle={p.nom} choisie={pieceChoisie === p.id} onPress={() => setPieceId(p.id)} />
                  ))}
                </Puces>
                <Champ libelle="N° de lot (facultatif)" value={lot} onChangeText={setLot} />
                <Bouton titre="Photo et valider" onPress={valider} chargement={enregistrement} style={{ minHeight: 60 }} />
                <Bouton titre="Annuler" variante="secondaire" onPress={() => setEtat({ etape: 'scan' })} />
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  haut: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: S.l, paddingVertical: S.s },
  hautTexte: { color: '#fff', fontSize: 16, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
  viseur: { alignSelf: 'center', width: '75%', maxWidth: 360, height: 140, borderWidth: 3, borderColor: '#fff', borderRadius: R.m, opacity: 0.9 },
  panneau: { backgroundColor: C.fond, borderTopLeftRadius: R.l, borderTopRightRadius: R.l, maxHeight: 460 },
  produit: { fontSize: 19, fontWeight: '700', color: C.encre },
});
