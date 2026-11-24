import { router } from 'expo-router';
import { useState } from 'react';

import { Bandeau, Bouton, Champ, Ecran, Texte } from '@/components/ui';
import { messageErreur, supabase } from '@/lib/supabase';

// Rejoindre un chantier avec le code reçu (par SMS, au téléphone, sur un papier de chantier).
export default function Rejoindre() {
  const [code, setCode] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const propre = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const rejoindre = async () => {
    setErreur(null);
    setChargement(true);
    const { data, error } = await supabase.rpc('accepter_invitation', { p_jeton: propre });
    setChargement(false);
    if (error) {
      const m = messageErreur(error);
      return setErreur(/introuvable/i.test(m) ? 'Code inconnu. Vérifiez les 8 caractères.' : m);
    }
    router.replace(`/chantier/${data as string}`);
  };

  return (
    <Ecran>
      <Texte>Saisissez le code de 8 caractères reçu de l&apos;entreprise ou de l&apos;architecte.</Texte>
      <Champ
        libelle="Code d'invitation"
        value={code}
        onChangeText={setCode}
        placeholder="ABCD 2345"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        onSubmitEditing={rejoindre}
      />
      {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}
      <Bouton titre="Rejoindre le chantier" onPress={rejoindre} chargement={chargement} desactive={propre.length !== 8} />
    </Ecran>
  );
}
