import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Bandeau, Bouton, Carte, Chargement, Ecran, Jauge, SousTitre, Texte } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { ecouterFile, type PoseEnAttente } from '@/lib/file-attente';
import { dateFr, euros } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Pose } from '@/lib/types';
import { useChantier } from '@/lib/use-chantier';

export default function VueChantier() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees, erreur } = useChantier(id);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [enAttente, setEnAttente] = useState<PoseEnAttente[]>([]);

  const chargerPoses = useCallback(async () => {
    const { data } = await supabase
      .from('poses')
      .select('id, piece_id, posee_le, lot, designation_saisie, marque_saisie, produits(designation, marque), organisations(nom)')
      .eq('chantier_id', id)
      .order('posee_le', { ascending: false })
      .limit(50);
    setPoses((data as unknown as Pose[]) ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void chargerPoses();
    }, [chargerPoses]),
  );
  // Quand une pose quitte la file d'attente, elle apparaît dans la liste envoyée.
  useEffect(
    () =>
      ecouterFile((l) => {
        setEnAttente(l.filter((p) => p.chantier_id === id));
        void chargerPoses();
      }),
    [id, chargerPoses],
  );

  if (erreur) return <Ecran><Bandeau ton="alerte">{erreur}</Bandeau></Ecran>;
  if (!donnees) return <Chargement />;

  const { chantier, role, pieces, completude } = donnees;
  const nomPiece = new Map(pieces.map((p) => [p.id, p.nom]));
  const estArtisan = role === 'artisan';

  return (
    <Ecran>
      <Stack.Screen options={{ title: chantier.nom }} />
      {chantier.adresse ? <Texte doux>{chantier.adresse}</Texte> : null}

      <Carte>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Texte gras>{chantier.type === 'pro' ? 'DOE' : 'Carnet du logement'}</Texte>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.encre }}>{completude?.taux ?? 0} %</Text>
        </View>
        <Jauge taux={completude?.taux ?? 0} />
        <Texte doux>
          {completude?.poses_completes ?? 0} poses documentées sur {completude?.poses ?? 0}
          {completude?.reserves_ouvertes ? ` · ${completude.reserves_ouvertes} réserve(s) ouverte(s)` : ''}
          {chantier.date_reception ? ` · réception le ${dateFr(chantier.date_reception)}` : ''}
        </Texte>
      </Carte>

      {estArtisan ? (
        <Bouton titre="Scanner une pose" onPress={() => router.push(`/chantier/${id}/scanner`)} style={{ minHeight: 64 }} />
      ) : null}

      <View style={{ flexDirection: 'row', gap: S.s, flexWrap: 'wrap' }}>
        <Bouton titre="Dossier" variante="secondaire" onPress={() => router.push(`/chantier/${id}/dossier`)} style={{ flexGrow: 1 }} />
        <Bouton titre="Réserves" variante="secondaire" onPress={() => router.push(`/chantier/${id}/reserves`)} style={{ flexGrow: 1 }} />
        <Bouton titre="Paiements" variante="secondaire" onPress={() => router.push(`/chantier/${id}/paiements`)} style={{ flexGrow: 1 }} />
        <Bouton titre="Inviter" variante="secondaire" onPress={() => router.push(`/chantier/${id}/inviter`)} style={{ flexGrow: 1 }} />
      </View>

      {chantier.montant_marche_ttc ? <Texte doux>Marché : {euros(chantier.montant_marche_ttc)} TTC</Texte> : null}

      <SousTitre>Dernières poses</SousTitre>
      {enAttente.map((p) => (
        <Carte key={p.id} style={{ borderStyle: 'dashed' }}>
          <Texte gras>{p.designation_saisie ?? `EAN ${p.ean_scanne ?? ''}`}</Texte>
          <Texte doux>
            En attente d&apos;envoi{p.piece_id ? ` · ${nomPiece.get(p.piece_id) ?? ''}` : ''}
            {p.erreur ? ` · ${p.erreur}` : ''}
          </Texte>
        </Carte>
      ))}
      {poses.length === 0 && enAttente.length === 0 ? (
        <Texte doux>{estArtisan ? 'Aucune pose. Touchez « Scanner une pose » au moment de poser un matériau.' : 'Aucune pose enregistrée pour le moment.'}</Texte>
      ) : null}
      {poses.map((p) => (
        <Carte key={p.id}>
          <Texte gras>
            {p.produits?.designation ?? p.designation_saisie}
            {(p.produits?.marque ?? p.marque_saisie) ? ` – ${p.produits?.marque ?? p.marque_saisie}` : ''}
          </Texte>
          <Texte doux>
            {[p.piece_id ? nomPiece.get(p.piece_id) : null, dateFr(p.posee_le), p.organisations?.nom, p.lot ? `lot ${p.lot}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Texte>
        </Carte>
      ))}
    </Ecran>
  );
}
