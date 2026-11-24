import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Chargement } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { FournisseurSession, profilComplet, useSession } from '@/lib/session';
import { configurationManquante } from '@/lib/supabase';

function Navigation() {
  const { chargement, session, profil } = useSession();

  if (configurationManquante) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: S.xl, backgroundColor: C.fond }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.encre, marginBottom: S.s }}>Configuration manquante</Text>
        <Text style={{ color: C.encre }}>
          Renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans mobile/.env (voir .env.example).
        </Text>
      </View>
    );
  }
  if (chargement) return <Chargement />;

  const connecte = !!session;
  const pret = connecte && profilComplet(profil);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.fond },
        headerTintColor: C.accent,
        headerTitleStyle: { color: C.encre },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: C.fond },
      }}>
      <Stack.Protected guard={!connecte}>
        <Stack.Screen name="connexion" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={connecte && !pret}>
        <Stack.Screen name="profil" options={{ title: 'Votre profil' }} />
      </Stack.Protected>
      <Stack.Protected guard={pret}>
        <Stack.Screen name="index" options={{ title: 'Mes chantiers' }} />
        <Stack.Screen name="compte" options={{ title: 'Mon compte' }} />
        <Stack.Screen name="rejoindre" options={{ title: 'Rejoindre un chantier', presentation: 'modal' }} />
        <Stack.Screen name="chantier/nouveau" options={{ title: 'Nouveau chantier', presentation: 'modal' }} />
        <Stack.Screen name="chantier/[id]/index" options={{ title: 'Chantier' }} />
        <Stack.Screen name="chantier/[id]/scanner" options={{ title: 'Scanner une pose', headerShown: false }} />
        <Stack.Screen name="chantier/[id]/dossier" options={{ title: 'Dossier' }} />
        <Stack.Screen name="chantier/[id]/reserves" options={{ title: 'Réserves' }} />
        <Stack.Screen name="chantier/[id]/paiements" options={{ title: 'Paiements' }} />
        <Stack.Screen name="chantier/[id]/inviter" options={{ title: 'Inviter', presentation: 'modal' }} />
      </Stack.Protected>
      {/* Un lien d'invitation s'ouvre même déconnecté : l'écran propose alors de se connecter. */}
      <Stack.Screen name="invitation/[jeton]" options={{ title: 'Invitation' }} />
    </Stack>
  );
}

export default function Racine() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <FournisseurSession>
        <Navigation />
      </FournisseurSession>
    </SafeAreaProvider>
  );
}
