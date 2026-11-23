import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Bandeau, Bouton, Carte, Chargement, Ecran, Texte } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { euros, montantJalon } from '@/lib/format';
import { messageErreur, supabase } from '@/lib/supabase';
import type { Jalon } from '@/lib/types';
import { useChantier } from '@/lib/use-chantier';

const CONDITIONS: Record<Jalon['condition'], string> = {
  aucune: 'À la signature',
  situation: 'Avancement des travaux',
  reception_dossier_complet: 'Après réception, dossier complet',
  un_an_apres_reception: 'Un an après la réception',
};

const STATUTS: Record<Jalon['statut'], { libelle: string; couleur: string }> = {
  a_venir: { libelle: 'À venir', couleur: C.doux },
  demande: { libelle: 'Demandé', couleur: C.accent },
  valide: { libelle: 'Validé', couleur: C.ok },
  paye: { libelle: 'Payé', couleur: C.ok },
};

// Parcours 3. Le versement réel via le prestataire agréé arrive en P2 :
// ici, l'artisan demande et le client valide ; la base applique les conditions.
export default function Paiements() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees } = useChantier(id);
  const [jalons, setJalons] = useState<Jalon[] | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<{ texte: string; ton: 'info' | 'alerte' } | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase.from('jalons').select('*').eq('chantier_id', id).order('ordre');
    setJalons((data as Jalon[]) ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  if (!donnees || !jalons) return <Chargement />;
  const { chantier, role } = donnees;
  const estClient = role === 'maitre_ouvrage' || role === 'particulier';

  const agir = async (jalon: Jalon, fonction: 'demander_paiement' | 'valider_jalon') => {
    setMessage(null);
    setEnCours(jalon.id);
    const { error } = await supabase.rpc(fonction, { p_jalon: jalon.id });
    setEnCours(null);
    if (error) setMessage({ texte: messageErreur(error), ton: 'alerte' });
    else {
      setMessage({ texte: fonction === 'demander_paiement' ? 'Demande envoyée au client.' : 'Paiement validé.', ton: 'info' });
      await charger();
    }
  };

  return (
    <Ecran>
      <Texte doux>Marché : {euros(chantier.montant_marche_ttc)} TTC</Texte>
      <Bandeau>
        Pilote : le versement passe par le prestataire de paiement agréé, branché en phase 2. Strata ne garde jamais l&apos;argent.
      </Bandeau>
      {message ? <Bandeau ton={message.ton}>{message.texte}</Bandeau> : null}
      {jalons.map((j) => (
        <Carte key={j.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.s }}>
            <Texte gras>
              {j.libelle} · {j.pourcentage} %
            </Texte>
            <Text style={{ color: STATUTS[j.statut].couleur, fontWeight: '600' }}>{STATUTS[j.statut].libelle}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.encre }}>
            {euros(montantJalon(chantier.montant_marche_ttc, j.pourcentage))}
          </Text>
          <Texte doux>{CONDITIONS[j.condition]}</Texte>
          {role === 'artisan' && j.statut === 'a_venir' ? (
            <Bouton titre="Demander le paiement" variante="secondaire" chargement={enCours === j.id} onPress={() => agir(j, 'demander_paiement')} />
          ) : null}
          {estClient && j.statut === 'demande' ? (
            <Bouton titre="Valider ce paiement" chargement={enCours === j.id} onPress={() => agir(j, 'valider_jalon')} />
          ) : null}
        </Carte>
      ))}
    </Ecran>
  );
}
