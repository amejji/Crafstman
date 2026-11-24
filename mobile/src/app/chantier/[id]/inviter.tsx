import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, Text, View } from 'react-native';

import { Bandeau, Bouton, Carte, Champ, Ecran, Puce, Puces, Texte } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { lienInvitation } from '@/lib/invitation';
import { messageErreur, supabase } from '@/lib/supabase';
import { LIBELLE_ROLE, type RoleChantier } from '@/lib/types';
import { useChantier } from '@/lib/use-chantier';

/** « ABCD2345 » → « ABCD 2345 », plus facile à dicter. */
const coupe = (code: string) => `${code.slice(0, 4)} ${code.slice(4)}`;

export default function Inviter() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees } = useChantier(id);
  const [role, setRole] = useState<RoleChantier>('artisan');
  const [lotMarche, setLotMarche] = useState('');
  const [chargement, setChargement] = useState(false);
  const [invitation, setInvitation] = useState<{ code: string; lien: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const estPro = donnees?.chantier.type === 'pro';
  const roles: RoleChantier[] = estPro ? ['artisan', 'architecte', 'maitre_ouvrage'] : ['artisan', 'architecte', 'particulier'];

  const creer = async () => {
    setErreur(null);
    setChargement(true);
    const { data, error } = await supabase
      .from('invitations')
      .insert({ chantier_id: id, role, lot_marche: role === 'artisan' ? lotMarche.trim() || null : null })
      .select('jeton, code')
      .single();
    setChargement(false);
    if (error) return setErreur(messageErreur(error));
    const lien = lienInvitation(data.jeton as string);
    const code = data.code as string;
    setInvitation({ code, lien });
    await Share.share({
      message:
        `Rejoignez le chantier « ${donnees?.chantier.nom ?? ''} » sur Strata.\n` +
        `Ouvrez ce lien : ${lien}\nou saisissez le code ${coupe(code)} dans « Rejoindre un chantier ».`,
      title: 'Invitation Strata',
    });
  };

  return (
    <Ecran>
      <Texte>Qui invitez-vous ?</Texte>
      <Puces>
        {roles.map((r) => (
          <Puce
            key={r}
            libelle={LIBELLE_ROLE[r]}
            choisie={role === r}
            onPress={() => {
              setRole(r);
              setInvitation(null);
            }}
          />
        ))}
      </Puces>
      {role === 'artisan' && estPro ? (
        <Champ
          libelle="Lot du marché (facultatif)"
          aide="Le DOE est classé par lot : les matériaux de cette entreprise iront sous ce lot."
          value={lotMarche}
          onChangeText={setLotMarche}
          placeholder="Lot 03 – Plâtrerie"
        />
      ) : null}
      <Texte doux>Le lien et le code sont valables 14 jours et ne servent qu&apos;une fois. Les droits valent pour ce chantier seulement.</Texte>
      {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}
      <Bouton titre="Créer et partager l'invitation" onPress={creer} chargement={chargement} />
      {invitation ? (
        <Carte>
          <Texte doux>Code à saisir dans « Rejoindre un chantier »</Texte>
          <View style={{ alignItems: 'center', paddingVertical: S.s }}>
            <Text selectable style={{ fontSize: 32, fontWeight: '700', letterSpacing: 4, color: C.encre, fontVariant: ['tabular-nums'] }}>
              {coupe(invitation.code)}
            </Text>
          </View>
          <Text selectable style={{ color: C.doux, fontSize: 13 }}>
            {invitation.lien}
          </Text>
        </Carte>
      ) : null}
    </Ecran>
  );
}
