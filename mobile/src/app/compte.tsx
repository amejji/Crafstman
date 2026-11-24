import { router } from 'expo-router';

import { FormulaireProfil } from '@/components/formulaire-profil';
import { Bouton, Ecran, Texte } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export default function Compte() {
  const { session } = useSession();
  return (
    <Ecran>
      <Texte doux>Connecté avec {session?.user.email}</Texte>
      <Bouton titre="Mes documents (assurances, Kbis, URSSAF)" variante="secondaire" onPress={() => router.push('/conformite')} />
      <FormulaireProfil apresEnregistrement={() => router.back()} />
      <Bouton titre="Se déconnecter" variante="secondaire" onPress={() => supabase.auth.signOut()} />
    </Ecran>
  );
}
