import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { DepotDocument } from '@/components/depot-document';
import { Bandeau, Bouton, Carte, Ecran, Pastille, SousTitre, Texte } from '@/components/ui';
import { S } from '@/constants/theme';
import { envoyerFichier } from '@/lib/fichiers';
import { ajouterMois, dateFr, dateSaisie, statutDocument, type StatutDocument } from '@/lib/format';
import { useSession } from '@/lib/session';
import { messageErreur, supabase } from '@/lib/supabase';
import { DOCS_ENTREPRISE, type TypeDocEntreprise } from '@/lib/types';

type Doc = { type: TypeDocEntreprise; date_emission: string; date_fin: string | null };

const LIBELLE_STATUT: Record<StatutDocument, (fin: string | null) => string> = {
  valide: (fin) => `Valide jusqu'au ${dateFr(fin)}`,
  expire_bientot: (fin) => `Expire le ${dateFr(fin)}`,
  expire: (fin) => `Expiré le ${dateFr(fin)}`,
  manquant: () => 'Manquant',
};

const EXIGE = { tous: 'Exigé sur tous les chantiers', pro: 'Exigé sur les marchés pros', facultatif: 'Facultatif, affiché à vos clients' };

// Coffre-fort de l'entreprise : déposés une fois, les documents valent sur tous ses chantiers.
export default function Conformite() {
  const { profil } = useSession();
  const orga = profil?.organisation_id ?? null;
  const [docs, setDocs] = useState<Doc[]>([]);
  const [ouvert, setOuvert] = useState<TypeDocEntreprise | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!orga) return;
    const { data } = await supabase.from('documents_entreprise').select('type, date_emission, date_fin').eq('organisation_id', orga);
    setDocs((data as Doc[]) ?? []);
  }, [orga]);

  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  if (!orga) {
    return (
      <Ecran>
        <Bandeau>Ajoutez d&apos;abord votre entreprise dans « Compte » pour déposer ses documents.</Bandeau>
      </Ecran>
    );
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);

  const deposer = async (type: TypeDocEntreprise, dureeMois: number | undefined, d: { fichier: Parameters<typeof envoyerFichier>[2]; emission: string; fin: string }) => {
    setErreur(null);
    const emission = dateSaisie(d.emission);
    const fin = dureeMois ? null : dateSaisie(d.fin);
    if (!emission) return setErreur('Indiquez la date du document, par exemple 15/01/2026.');
    if (emission > aujourdhui) return setErreur('La date du document ne peut pas être dans le futur.');
    if (!dureeMois && !fin) return setErreur("Indiquez la date de fin de validité, par exemple 31/12/2026.");
    if (fin && fin < emission) return setErreur('La date de fin doit suivre la date du document.');
    setChargement(true);
    try {
      const chemin = await envoyerFichier('entreprises', orga, d.fichier);
      const { error } = await supabase.from('documents_entreprise').insert({
        organisation_id: orga,
        type,
        nom: d.fichier.nom,
        storage_path: chemin,
        date_emission: emission,
        date_fin: fin,
        depose_par: profil?.id,
      });
      if (error) throw error;
      setOuvert(null);
      await charger();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  };

  const groupes = [
    { titre: 'Exigés', defs: DOCS_ENTREPRISE.filter((d) => d.exige !== 'facultatif') },
    { titre: 'Qualifications (facultatives)', defs: DOCS_ENTREPRISE.filter((d) => d.exige === 'facultatif') },
  ];

  return (
    <Ecran>
      <Texte doux>
        Déposés une fois, vos documents valent sur tous vos chantiers. Strata vous prévient 30 jours avant leur expiration.
      </Texte>
      {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}
      {groupes.map((g) => (
        <View key={g.titre} style={{ gap: S.m }}>
          <SousTitre>{g.titre}</SousTitre>
          {g.defs.map((def) => {
            // Le document qui va le plus loin fait foi.
            const fins = docs
              .filter((d) => d.type === def.type)
              .map((d) => (def.dureeMois ? ajouterMois(d.date_emission, def.dureeMois) : d.date_fin))
              .filter((x): x is string => !!x)
              .sort();
            const fin = fins[fins.length - 1] ?? null;
            const statut = statutDocument(fin, aujourdhui);
            if (def.exige === 'facultatif' && statut === 'manquant' && ouvert !== def.type) {
              return (
                <Carte key={def.type}>
                  <Texte gras>{def.libelle}</Texte>
                  <Bouton titre="Ajouter" variante="secondaire" onPress={() => setOuvert(def.type)} />
                </Carte>
              );
            }
            return (
              <Carte key={def.type}>
                <Texte gras>{def.libelle}</Texte>
                <Pastille statut={statut} texte={LIBELLE_STATUT[statut](fin)} />
                <Texte doux>
                  {EXIGE[def.exige]}
                  {def.dureeMois ? ` · valable ${def.dureeMois} mois à partir de sa date` : ''}
                </Texte>
                {ouvert === def.type ? (
                  <DepotDocument
                    avecDates
                    dateFinSaisie={!def.dureeMois}
                    chargement={chargement}
                    onAnnuler={() => setOuvert(null)}
                    onValider={(d) => deposer(def.type, def.dureeMois, d)}
                  />
                ) : statut !== 'valide' ? (
                  <Bouton
                    titre={statut === 'manquant' ? 'Déposer le document' : 'Déposer une version à jour'}
                    variante="secondaire"
                    onPress={() => {
                      setErreur(null);
                      setOuvert(def.type);
                    }}
                  />
                ) : null}
              </Carte>
            );
          })}
        </View>
      ))}
      <Texte doux>
        Strata contrôle la présence et les dates des documents, pas leur authenticité. Vos clients vérifient l&apos;attestation
        de vigilance sur le site de l&apos;URSSAF.
      </Texte>
    </Ecran>
  );
}
