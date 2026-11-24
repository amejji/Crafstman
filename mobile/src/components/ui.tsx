import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, R, S } from '@/constants/theme';
import { couleurTaux } from '@/lib/format';

export function Ecran({ children, defile = true }: { children: ReactNode; defile?: boolean }) {
  return (
    <SafeAreaView style={styles.ecran} edges={['bottom', 'left', 'right']}>
      {defile ? (
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contenu, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Titre({ children }: { children: ReactNode }) {
  return <Text style={styles.titre}>{children}</Text>;
}

export function SousTitre({ children }: { children: ReactNode }) {
  return <Text style={styles.sousTitre}>{children}</Text>;
}

export function Texte({ children, doux, gras }: { children: ReactNode; doux?: boolean; gras?: boolean }) {
  return <Text style={[styles.texte, doux && { color: C.doux }, gras && { fontWeight: '600' }]}>{children}</Text>;
}

type VarianteBouton = 'principal' | 'secondaire' | 'danger';

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  chargement,
  desactive,
  style,
}: {
  titre: string;
  onPress: () => void;
  variante?: VarianteBouton;
  chargement?: boolean;
  desactive?: boolean;
  style?: ViewStyle;
}) {
  const inactif = desactive || chargement;
  const fond = variante === 'principal' ? C.accent : variante === 'danger' ? C.alerte : C.carte;
  const encre = variante === 'secondaire' ? C.accent : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactif }}
      onPress={onPress}
      disabled={inactif}
      style={({ pressed }) => [
        styles.bouton,
        { backgroundColor: fond, opacity: inactif ? 0.5 : pressed ? 0.85 : 1 },
        variante === 'secondaire' && { borderWidth: 1, borderColor: C.accent },
        style,
      ]}>
      {chargement ? <ActivityIndicator color={encre} /> : <Text style={[styles.boutonTexte, { color: encre }]}>{titre}</Text>}
    </Pressable>
  );
}

export function Champ({ libelle, aide, ...props }: TextInputProps & { libelle: string; aide?: string }) {
  return (
    <View style={{ gap: S.xs }}>
      <Text style={styles.libelle}>{libelle}</Text>
      <TextInput placeholderTextColor={C.doux} style={styles.champ} {...props} />
      {aide ? <Text style={styles.aide}>{aide}</Text> : null}
    </View>
  );
}

export function Carte({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.carte, pressed && { backgroundColor: C.accentDoux }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.carte, style]}>{children}</View>;
}

export function Puce({ libelle, choisie, onPress }: { libelle: string; choisie?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!choisie }}
      onPress={onPress}
      style={[styles.puce, choisie && { backgroundColor: C.accent, borderColor: C.accent }]}>
      <Text style={[styles.puceTexte, choisie && { color: '#fff' }]}>{libelle}</Text>
    </Pressable>
  );
}

export function Puces({ children }: { children: ReactNode }) {
  return <View style={styles.puces}>{children}</View>;
}

export function Jauge({ taux }: { taux: number }) {
  const niveau = couleurTaux(taux);
  const couleur = niveau === 'ok' ? C.ok : niveau === 'moyen' ? C.accent : C.alerte;
  return (
    <View style={styles.jaugeFond} accessibilityRole="progressbar" accessibilityValue={{ now: taux, min: 0, max: 100 }}>
      <View style={[styles.jaugeBarre, { width: `${Math.min(100, Math.max(0, taux))}%`, backgroundColor: couleur }]} />
    </View>
  );
}

export function Bandeau({ children, ton = 'info' }: { children: ReactNode; ton?: 'info' | 'alerte' }) {
  return (
    <View style={[styles.bandeau, ton === 'alerte' && { backgroundColor: C.alerteDoux }]}>
      <Text style={[styles.texte, ton === 'alerte' && { color: C.alerte }]}>{children}</Text>
    </View>
  );
}

export function Chargement() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl }}>
      <ActivityIndicator color={C.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: C.fond },
  contenu: { padding: S.l, gap: S.m, width: '100%', maxWidth: 720, alignSelf: 'center' },
  titre: { fontSize: 24, fontWeight: '700', color: C.encre },
  sousTitre: { fontSize: 17, fontWeight: '600', color: C.encre, marginTop: S.s },
  texte: { fontSize: 15, color: C.encre, lineHeight: 21 },
  bouton: { minHeight: 50, borderRadius: R.m, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.l },
  boutonTexte: { fontSize: 16, fontWeight: '600' },
  libelle: { fontSize: 13, fontWeight: '600', color: C.doux },
  aide: { fontSize: 12, color: C.doux },
  champ: {
    backgroundColor: C.carte,
    borderWidth: 1,
    borderColor: C.trait,
    borderRadius: R.s,
    paddingHorizontal: S.m,
    paddingVertical: S.m,
    fontSize: 16,
    color: C.encre,
  },
  carte: { backgroundColor: C.carte, borderRadius: R.m, padding: S.l, gap: S.s, borderWidth: 1, borderColor: C.trait },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: S.s },
  puce: { paddingHorizontal: S.m, paddingVertical: S.s, borderRadius: 999, borderWidth: 1, borderColor: C.trait, backgroundColor: C.carte },
  puceTexte: { fontSize: 14, color: C.encre },
  jaugeFond: { height: 10, borderRadius: 5, backgroundColor: C.trait, overflow: 'hidden' },
  jaugeBarre: { height: '100%', borderRadius: 5 },
  bandeau: { backgroundColor: C.accentDoux, borderRadius: R.s, padding: S.m },
});

const TONS_STATUT = {
  valide: { fond: C.accentDoux, encre: C.ok },
  expire_bientot: { fond: '#FBF0D9', encre: '#8A5A00' },
  expire: { fond: C.alerteDoux, encre: C.alerte },
  manquant: { fond: C.alerteDoux, encre: C.alerte },
} as const;

/** Étiquette de statut d'un document : valide, expire bientôt, expiré, manquant. */
export function Pastille({ statut, texte }: { statut: keyof typeof TONS_STATUT; texte: string }) {
  const t = TONS_STATUT[statut];
  return (
    <View style={{ backgroundColor: t.fond, borderRadius: 999, paddingHorizontal: S.s, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: t.encre, fontSize: 13, fontWeight: '600' }}>{texte}</Text>
    </View>
  );
}
