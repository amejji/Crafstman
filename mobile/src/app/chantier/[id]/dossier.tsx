import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, Platform, Share, Text, View } from 'react-native';

import { Bandeau, Bouton, Carte, Chargement, Ecran, Jauge, SousTitre, Texte } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { dateFr } from '@/lib/format';
import { messageErreur, supabase } from '@/lib/supabase';
import type { Garanties } from '@/lib/types';
import { useChantier } from '@/lib/use-chantier';

type Manquant = { pose_id: string; designation: string; organisation_id: string | null };
type Groupe = { organisation: string; items: Manquant[] };

// Parcours 2 : complétude, pièces manquantes par entreprise, relance, réception, PDF.
export default function Dossier() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees, erreur, recharger } = useChantier(id);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [garanties, setGaranties] = useState<Garanties | null>(null);
  const [generation, setGeneration] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ton: 'info' | 'alerte' } | null>(null);

  const charger = useCallback(async () => {
    const [{ data: manquants }, { data: g }] = await Promise.all([
      supabase.from('poses_completude').select('pose_id, designation, organisation_id').eq('chantier_id', id).eq('complete', false),
      supabase.from('garanties').select('*').eq('chantier_id', id).maybeSingle(),
    ]);
    setGaranties((g as Garanties | null) ?? null);
    const liste = (manquants as Manquant[] | null) ?? [];
    const ids = [...new Set(liste.map((m) => m.organisation_id).filter((x): x is string => !!x))];
    const { data: orgas } = ids.length
      ? await supabase.from('organisations').select('id, nom').in('id', ids)
      : { data: [] as { id: string; nom: string }[] };
    const noms = new Map((orgas ?? []).map((o) => [o.id, o.nom]));
    const parOrga = new Map<string, Manquant[]>();
    for (const m of liste) {
      const cle = (m.organisation_id && noms.get(m.organisation_id)) || 'Entreprise non renseignée';
      parOrga.set(cle, [...(parOrga.get(cle) ?? []), m]);
    }
    setGroupes([...parOrga].map(([organisation, items]) => ({ organisation, items })));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  if (erreur) return <Ecran><Bandeau ton="alerte">{erreur}</Bandeau></Ecran>;
  if (!donnees) return <Chargement />;
  const { chantier, role, completude } = donnees;
  const estClient = role === 'maitre_ouvrage' || role === 'particulier';
  const nomDossier = chantier.type === 'pro' ? 'DOE' : 'carnet du logement';

  const relancer = (g: Groupe) => {
    const texte =
      `Bonjour,\n\nPour le chantier « ${chantier.nom} », il manque les documents suivants pour compléter le ${nomDossier} :\n` +
      g.items.map((i) => `- ${i.designation}`).join('\n') +
      `\n\nMerci de les ajouter dans Strata.\n`;
    void Share.share({ message: texte, title: `Pièces manquantes – ${chantier.nom}` });
  };

  const prononcerReception = () => {
    const confirmer = async () => {
      const { error } = await supabase.rpc('prononcer_reception', { p_chantier: id });
      if (error) setMessage({ texte: messageErreur(error), ton: 'alerte' });
      else {
        setMessage({ texte: 'Réception prononcée. Les garanties courent à partir d’aujourd’hui.', ton: 'info' });
        await recharger();
        await charger();
      }
    };
    if (Platform.OS === 'web') return void confirmer();
    Alert.alert('Prononcer la réception ?', 'La date du jour sera la date de réception. Les garanties légales partent de cette date.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Prononcer', onPress: () => void confirmer() },
    ]);
  };

  const generer = async () => {
    setMessage(null);
    setGeneration(true);
    const { data, error } = await supabase.functions.invoke<{ url: string; pages: number }>('generer-dossier', {
      body: { chantier_id: id },
    });
    setGeneration(false);
    if (error || !data) return setMessage({ texte: `Génération impossible : ${messageErreur(error)}`, ton: 'alerte' });
    setMessage({ texte: `PDF prêt (${data.pages} pages).`, ton: 'info' });
    await WebBrowser.openBrowserAsync(data.url);
  };

  return (
    <Ecran>
      <Carte>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Texte gras>Complétude du {nomDossier}</Texte>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.encre }}>{completude?.taux ?? 0} %</Text>
        </View>
        <Jauge taux={completude?.taux ?? 0} />
        <Texte doux>
          {completude?.poses_completes ?? 0} sur {completude?.poses ?? 0} poses ont leur fiche technique ou leur notice.
        </Texte>
      </Carte>

      {message ? <Bandeau ton={message.ton}>{message.texte}</Bandeau> : null}

      <Bouton titre={`Générer le ${nomDossier} (PDF)`} onPress={generer} chargement={generation} />

      <SousTitre>Pièces manquantes</SousTitre>
      {groupes.length === 0 ? (
        <Texte doux>{completude?.poses ? 'Rien ne manque.' : 'Aucune pose enregistrée.'}</Texte>
      ) : (
        groupes.map((g) => (
          <Carte key={g.organisation}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.s }}>
              <Texte gras>{g.organisation}</Texte>
              <Text style={{ color: C.alerte, fontWeight: '600' }}>{g.items.length} à fournir</Text>
            </View>
            {g.items.slice(0, 6).map((i) => (
              <Texte key={i.pose_id} doux>· {i.designation}</Texte>
            ))}
            {g.items.length > 6 ? <Texte doux>et {g.items.length - 6} autre(s)</Texte> : null}
            {role === 'architecte' || estClient ? <Bouton titre="Relancer" variante="secondaire" onPress={() => relancer(g)} /> : null}
          </Carte>
        ))
      )}

      <SousTitre>Réception et garanties</SousTitre>
      {garanties ? (
        <Carte>
          <Texte>Réception le {dateFr(garanties.date_reception)}</Texte>
          <Texte doux>Parfait achèvement : jusqu&apos;au {dateFr(garanties.fin_parfait_achevement)}</Texte>
          <Texte doux>Biennale : jusqu&apos;au {dateFr(garanties.fin_biennale)}</Texte>
          <Texte doux>Décennale : jusqu&apos;au {dateFr(garanties.fin_decennale)}</Texte>
        </Carte>
      ) : estClient ? (
        <>
          <Texte doux>
            {completude?.reserves_ouvertes
              ? `${completude.reserves_ouvertes} réserve(s) ouverte(s) : vous pouvez prononcer la réception avec réserves.`
              : 'Quand les travaux sont terminés, prononcez la réception.'}
          </Texte>
          <Bouton titre="Prononcer la réception" variante="secondaire" onPress={prononcerReception} />
        </>
      ) : (
        <Texte doux>Le maître d&apos;ouvrage prononce la réception ; les dates de garantie seront alors calculées.</Texte>
      )}
    </Ecran>
  );
}
