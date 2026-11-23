import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, Text } from 'react-native';

import { Bandeau, Bouton, Ecran, Puce, Puces, Texte } from '@/components/ui';
import { lienInvitation } from '@/lib/invitation';
import { messageErreur, supabase } from '@/lib/supabase';
import { LIBELLE_ROLE, type RoleChantier } from '@/lib/types';
import { useChantier } from '@/lib/use-chantier';

export default function Inviter() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees } = useChantier(id);
  const [role, setRole] = useState<RoleChantier>('artisan');
  const [chargement, setChargement] = useState(false);
  const [lien, setLien] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const roles: RoleChantier[] =
    donnees?.chantier.type === 'particulier' ? ['artisan', 'architecte', 'particulier'] : ['artisan', 'architecte', 'maitre_ouvrage'];

  const creer = async () => {
    setErreur(null);
    setChargement(true);
    const { data, error } = await supabase.from('invitations').insert({ chantier_id: id, role }).select('jeton').single();
    setChargement(false);
    if (error) return setErreur(messageErreur(error));
    const url = lienInvitation(data.jeton as string);
    setLien(url);
    await Share.share({
      message: `Rejoignez le chantier « ${donnees?.chantier.nom ?? ''} » sur Strata : ${url}`,
      title: 'Invitation Strata',
    });
  };

  return (
    <Ecran>
      <Texte>Qui invitez-vous ?</Texte>
      <Puces>
        {roles.map((r) => (
          <Puce key={r} libelle={LIBELLE_ROLE[r]} choisie={role === r} onPress={() => setRole(r)} />
        ))}
      </Puces>
      <Texte doux>Le lien est valable 14 jours et ne sert qu&apos;une fois. Les droits valent pour ce chantier seulement.</Texte>
      {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}
      <Bouton titre="Créer et partager le lien" onPress={creer} chargement={chargement} />
      {lien ? <Text selectable>{lien}</Text> : null}
    </Ecran>
  );
}
