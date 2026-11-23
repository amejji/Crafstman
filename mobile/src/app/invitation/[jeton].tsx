import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Bandeau, Bouton, Ecran, Texte } from '@/components/ui';
import { accepterInvitationEnAttente, memoriserInvitation } from '@/lib/invitation';
import { profilComplet, useSession } from '@/lib/session';
import { messageErreur } from '@/lib/supabase';

// Ouvert depuis un lien strata://invitation/<jeton>.
export default function Invitation() {
  const { jeton } = useLocalSearchParams<{ jeton: string }>();
  const { session, profil } = useSession();
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!jeton) return;
    void (async () => {
      await memoriserInvitation(jeton);
      if (!session) return router.replace('/connexion');
      if (!profilComplet(profil)) return router.replace('/profil');
      try {
        const chantier = await accepterInvitationEnAttente();
        router.replace(chantier ? `/chantier/${chantier}` : '/');
      } catch (e) {
        setErreur(messageErreur(e));
      }
    })();
  }, [jeton, session, profil]);

  return (
    <Ecran>
      {erreur ? (
        <>
          <Bandeau ton="alerte">{erreur}</Bandeau>
          <Bouton titre="Mes chantiers" onPress={() => router.replace('/')} />
        </>
      ) : (
        <Texte doux>Ouverture de l&apos;invitation…</Texte>
      )}
    </Ecran>
  );
}
