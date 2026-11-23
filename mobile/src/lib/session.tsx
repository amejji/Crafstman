import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { envoyerFile } from './file-attente';
import { supabase } from './supabase';
import type { Profil } from './types';

type Etat = {
  chargement: boolean;
  session: Session | null;
  profil: Profil | null;
  rechargerProfil: () => Promise<void>;
};

const Contexte = createContext<Etat>({
  chargement: true,
  session: null,
  profil: null,
  rechargerProfil: async () => {},
});

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);

  const chargerProfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const { data } = await supabase
      .from('profils')
      .select('id, email, nom, organisation_id, organisations(*)')
      .eq('id', s.user.id)
      .maybeSingle();
    setProfil((data as Profil | null) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await chargerProfil(data.session);
      setChargement(false);
      void envoyerFile();
    });
    const { data: abonnement } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      void chargerProfil(s);
    });
    // Au retour au premier plan, on retente l'envoi des poses gardées hors connexion.
    const app = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') void envoyerFile();
    });
    const minuterie = setInterval(() => void envoyerFile(), 60_000);
    return () => {
      abonnement.subscription.unsubscribe();
      app.remove();
      clearInterval(minuterie);
    };
  }, [chargerProfil]);

  const rechargerProfil = useCallback(() => chargerProfil(session), [chargerProfil, session]);

  return (
    <Contexte.Provider value={{ chargement, session, profil, rechargerProfil }}>{children}</Contexte.Provider>
  );
}

export const useSession = () => useContext(Contexte);

/** Le profil est prêt quand la personne a donné son nom. */
export const profilComplet = (p: Profil | null) => !!p?.nom;
