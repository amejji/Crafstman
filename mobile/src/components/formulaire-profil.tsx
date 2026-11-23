import { useState } from 'react';
import { View } from 'react-native';

import { Bandeau, Bouton, Champ, Puce, Puces, SousTitre, Texte } from '@/components/ui';
import { S } from '@/constants/theme';
import { normaliserSiret } from '@/lib/format';
import { useSession } from '@/lib/session';
import { messageErreur, supabase } from '@/lib/supabase';

type TypeOrga = 'entreprise' | 'cabinet' | 'maitre_ouvrage' | 'aucune';

/** Nom de la personne, puis son entreprise (SIRET, assurance décennale). */
export function FormulaireProfil({ apresEnregistrement }: { apresEnregistrement?: () => void }) {
  const { session, profil, rechargerProfil } = useSession();
  const orga = profil?.organisations ?? null;

  const [nom, setNom] = useState(profil?.nom ?? '');
  const [typeOrga, setTypeOrga] = useState<TypeOrga>(orga ? 'entreprise' : 'entreprise');
  const [nomOrga, setNomOrga] = useState(orga?.nom ?? '');
  const [siret, setSiret] = useState(orga?.siret ?? '');
  const [assureur, setAssureur] = useState(orga?.assureur_decennale ?? '');
  const [police, setPolice] = useState(orga?.police_decennale ?? '');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const avecOrga = typeOrga !== 'aucune';

  const enregistrer = async () => {
    if (!session) return;
    setErreur(null);
    if (!nom.trim()) return setErreur('Indiquez votre nom.');
    const siretPropre = siret.trim() ? normaliserSiret(siret) : null;
    if (avecOrga && siret.trim() && !siretPropre) return setErreur('Le SIRET doit compter 14 chiffres.');
    if (avecOrga && !nomOrga.trim()) return setErreur('Indiquez le nom de votre structure.');

    setChargement(true);
    try {
      let organisationId = profil?.organisation_id ?? null;
      if (avecOrga) {
        const valeurs = {
          nom: nomOrga.trim(),
          type: typeOrga,
          siret: siretPropre,
          assureur_decennale: assureur.trim() || null,
          police_decennale: police.trim() || null,
        };
        if (organisationId) {
          const { error } = await supabase.from('organisations').update(valeurs).eq('id', organisationId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('organisations')
            .insert({ ...valeurs, created_by: session.user.id })
            .select('id')
            .single();
          if (error) throw error;
          organisationId = data.id;
        }
      }
      const { error } = await supabase
        .from('profils')
        .update({ nom: nom.trim(), organisation_id: avecOrga ? organisationId : null })
        .eq('id', session.user.id);
      if (error) throw error;
      await rechargerProfil();
      apresEnregistrement?.();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  };

  return (
    <View style={{ gap: S.m }}>
      <Champ libelle="Votre nom" value={nom} onChangeText={setNom} placeholder="Prénom Nom" autoComplete="name" />

      <SousTitre>Votre structure</SousTitre>
      <Puces>
        <Puce libelle="Entreprise" choisie={typeOrga === 'entreprise'} onPress={() => setTypeOrga('entreprise')} />
        <Puce libelle="Cabinet d'architecture" choisie={typeOrga === 'cabinet'} onPress={() => setTypeOrga('cabinet')} />
        <Puce libelle="Maître d'ouvrage" choisie={typeOrga === 'maitre_ouvrage'} onPress={() => setTypeOrga('maitre_ouvrage')} />
        <Puce libelle="Particulier" choisie={typeOrga === 'aucune'} onPress={() => setTypeOrga('aucune')} />
      </Puces>

      {avecOrga ? (
        <>
          <Champ libelle="Nom" value={nomOrga} onChangeText={setNomOrga} placeholder="Martin Plâtrerie" />
          <Champ libelle="SIRET" value={siret} onChangeText={setSiret} keyboardType="number-pad" placeholder="14 chiffres" />
          {typeOrga === 'entreprise' ? (
            <>
              <Champ libelle="Assureur décennale" value={assureur} onChangeText={setAssureur} />
              <Champ libelle="N° de police décennale" value={police} onChangeText={setPolice} />
            </>
          ) : null}
        </>
      ) : (
        <Texte doux>Vous consulterez votre carnet et validerez les paiements de vos travaux.</Texte>
      )}

      {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}
      <Bouton titre="Enregistrer" onPress={enregistrer} chargement={chargement} />
    </View>
  );
}
