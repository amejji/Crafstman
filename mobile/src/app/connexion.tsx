import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { Bandeau, Bouton, Champ, Ecran, Texte } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { messageErreur, supabase } from '@/lib/supabase';

// Connexion par e-mail : un code à 6 chiffres est envoyé, pas de mot de passe à retenir.
export default function Connexion() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [etape, setEtape] = useState<'email' | 'code'>('email');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const envoyerCode = async () => {
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
    setChargement(false);
    if (error) setErreur(messageErreur(error));
    else setEtape('code');
  };

  const verifier = async () => {
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setChargement(false);
    if (error) setErreur('Code incorrect ou expiré.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Ecran>
        <View style={{ marginTop: S.xxl * 2, gap: S.s }}>
          <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 2, color: C.accent }}>STRATA</Text>
          <Text style={{ fontSize: 30, fontWeight: '700', color: C.encre }}>Chaque pose, documentée.</Text>
          <Texte doux>Scannez les matériaux au moment de la pose, remettez le DOE ou le carnet du logement en un clic.</Texte>
        </View>

        {etape === 'email' ? (
          <View style={{ gap: S.m, marginTop: S.xl }}>
            <Champ
              libelle="Adresse e-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="vous@entreprise.fr"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              onSubmitEditing={envoyerCode}
            />
            <Bouton titre="Recevoir un code" onPress={envoyerCode} chargement={chargement} desactive={!email.includes('@')} />
          </View>
        ) : (
          <View style={{ gap: S.m, marginTop: S.xl }}>
            <Texte>Un code à 6 chiffres a été envoyé à {email}.</Texte>
            <Champ
              libelle="Code reçu"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              placeholder="123456"
              onSubmitEditing={verifier}
            />
            <Bouton titre="Se connecter" onPress={verifier} chargement={chargement} desactive={code.length < 6} />
            <Bouton titre="Changer d'adresse" variante="secondaire" onPress={() => setEtape('email')} />
          </View>
        )}
        {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}
      </Ecran>
    </KeyboardAvoidingView>
  );
}
