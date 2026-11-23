import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bandeau, Bouton, Carte, Jauge, Texte } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { ecouterFile, type PoseEnAttente } from '@/lib/file-attente';
import { accepterInvitationEnAttente } from '@/lib/invitation';
import { messageErreur, supabase } from '@/lib/supabase';
import { LIBELLE_ROLE, type Chantier, type Completude, type RoleChantier } from '@/lib/types';

type Ligne = Chantier & { role: RoleChantier; completude: Completude | null };

export default function MesChantiers() {
  const [chantiers, setChantiers] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rafraichit, setRafraichit] = useState(false);
  const [enAttente, setEnAttente] = useState<PoseEnAttente[]>([]);

  useEffect(() => ecouterFile(setEnAttente), []);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const rejoint = await accepterInvitationEnAttente();
      if (rejoint) router.push(`/chantier/${rejoint}`);
    } catch (e) {
      setErreur(`Invitation : ${messageErreur(e)}`);
    }
    const [{ data, error }, { data: compl }] = await Promise.all([
      supabase
        .from('membres_chantier')
        .select('role, chantiers(id, nom, adresse, type, montant_marche_ttc, date_reception, created_at)')
        .order('created_at', { ascending: false }),
      supabase.from('chantiers_completude').select('*'),
    ]);
    if (error) {
      setErreur(messageErreur(error));
      setChantiers([]);
      return;
    }
    const parId = new Map((compl as Completude[] | null)?.map((c) => [c.chantier_id, c]) ?? []);
    setChantiers(
      (data ?? [])
        .map((m) => {
          const c = m.chantiers as unknown as Chantier | null;
          return c ? { ...c, role: m.role as RoleChantier, completude: parId.get(c.id) ?? null } : null;
        })
        .filter((x): x is Ligne => !!x),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  const enErreur = enAttente.filter((p) => p.erreur);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.fond }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={() => router.push('/compte')} hitSlop={12}>
              <Text style={{ color: C.accent, fontSize: 16 }}>Compte</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: S.l, gap: S.m, width: '100%', maxWidth: 720, alignSelf: 'center' }}
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={async () => {
              setRafraichit(true);
              await charger();
              setRafraichit(false);
            }}
          />
        }>
        {enAttente.length ? (
          <Bandeau ton={enErreur.length ? 'alerte' : 'info'}>
            {enAttente.length} pose{enAttente.length > 1 ? 's' : ''} en attente d&apos;envoi
            {enErreur.length ? ` · dernière erreur : ${enErreur[enErreur.length - 1].erreur}` : ' · envoi dès le retour du réseau'}
          </Bandeau>
        ) : null}
        {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}

        <Bouton titre="Nouveau chantier" onPress={() => router.push('/chantier/nouveau')} />

        {chantiers === null ? (
          <Texte doux>Chargement…</Texte>
        ) : chantiers.length === 0 ? (
          <Carte>
            <Texte gras>Aucun chantier pour l&apos;instant</Texte>
            <Texte doux>Créez votre premier chantier, ou ouvrez le lien d&apos;invitation reçu d&apos;un confrère.</Texte>
          </Carte>
        ) : (
          chantiers.map((c) => (
            <Carte key={c.id} onPress={() => router.push(`/chantier/${c.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.s }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: C.encre, flex: 1 }}>{c.nom}</Text>
                <Text style={{ color: C.doux, fontSize: 13 }}>{c.type === 'pro' ? 'Marché pro' : 'Particulier'}</Text>
              </View>
              {c.adresse ? <Texte doux>{c.adresse}</Texte> : null}
              <Jauge taux={c.completude?.taux ?? 0} />
              <Text style={{ color: C.doux, fontSize: 13 }}>
                Dossier à {c.completude?.taux ?? 0} % · {c.completude?.poses ?? 0} poses · {LIBELLE_ROLE[c.role]}
                {c.date_reception ? ' · réceptionné' : ''}
              </Text>
            </Carte>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
