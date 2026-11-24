import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { DepotDocument } from '@/components/depot-document';
import { Bandeau, Bouton, Carte, Chargement, Ecran, Pastille, SousTitre, Texte } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { envoyerFichier } from '@/lib/fichiers';
import { ajouterMois, dateFr } from '@/lib/format';
import { useSession } from '@/lib/session';
import { messageErreur, supabase } from '@/lib/supabase';
import {
  LIBELLE_DOC_ENTREPRISE,
  LIBELLE_JUSTIFICATIF,
  type LigneConformite,
  type TypeDocEntreprise,
  type TypeJustificatif,
} from '@/lib/types';
import { useChantier } from '@/lib/use-chantier';

type DocFichier = { organisation_id: string; type: TypeDocEntreprise; storage_path: string; date_emission: string; date_fin: string | null };
type Justificatif = { type: TypeJustificatif; storage_path: string; created_at: string };

const TEXTE_STATUT: Record<LigneConformite['statut'], (fin: string | null) => string> = {
  valide: (fin) => `Valide jusqu'au ${dateFr(fin)}`,
  expire_bientot: (fin) => `Expire le ${dateFr(fin)}`,
  expire: (fin) => `Expiré le ${dateFr(fin)}`,
  manquant: () => 'Manquant',
};

const finDe = (d: DocFichier) =>
  d.type === 'kbis' ? ajouterMois(d.date_emission, 3) : d.type === 'vigilance_urssaf' ? ajouterMois(d.date_emission, 6) : d.date_fin;

async function ouvrir(bucket: 'entreprises' | 'chantiers', chemin: string) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(chemin, 600);
  if (data?.signedUrl) await WebBrowser.openBrowserAsync(data.signedUrl);
}

// Conformité d'un chantier : les entreprises sont-elles en règle, les justificatifs sont-ils là ?
export default function ConformiteChantier() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees } = useChantier(id);
  const { profil } = useSession();
  const [lignes, setLignes] = useState<LigneConformite[] | null>(null);
  const [fichiers, setFichiers] = useState<DocFichier[]>([]);
  const [justificatifs, setJustificatifs] = useState<Justificatif[]>([]);
  const [manquants, setManquants] = useState<TypeJustificatif[]>([]);
  const [ouvert, setOuvert] = useState<TypeJustificatif | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [conf, just, manq] = await Promise.all([
      supabase.from('conformite').select('organisation_id, entreprise, type_doc, fin, statut').eq('chantier_id', id),
      supabase.from('justificatifs_chantier').select('type, storage_path, created_at').eq('chantier_id', id).order('created_at'),
      supabase.from('justificatifs_manquants_chantier').select('type').eq('chantier_id', id),
    ]);
    const l = (conf.data as LigneConformite[] | null) ?? [];
    setLignes(l);
    setJustificatifs((just.data as Justificatif[] | null) ?? []);
    setManquants(((manq.data as { type: TypeJustificatif }[] | null) ?? []).map((m) => m.type));
    const orgas = [...new Set(l.map((x) => x.organisation_id))];
    if (orgas.length) {
      const { data } = await supabase
        .from('documents_entreprise')
        .select('organisation_id, type, storage_path, date_emission, date_fin')
        .in('organisation_id', orgas);
      setFichiers((data as DocFichier[] | null) ?? []);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  if (!donnees || lignes === null) return <Chargement />;
  const { chantier, role } = donnees;
  const estPro = chantier.type === 'pro';
  const peutRelancer = role === 'architecte' || role === 'maitre_ouvrage' || role === 'particulier';

  const parEntreprise = new Map<string, LigneConformite[]>();
  for (const l of lignes) parEntreprise.set(l.organisation_id, [...(parEntreprise.get(l.organisation_id) ?? []), l]);
  const enRegle = (ls: LigneConformite[]) => ls.every((l) => l.statut === 'valide' || l.statut === 'expire_bientot');
  const toutEnRegle = [...parEntreprise.values()].every(enRegle);

  // Le fichier qui va le plus loin, pour « Voir ».
  const fichierDe = (org: string, type: TypeDocEntreprise) =>
    fichiers
      .filter((f) => f.organisation_id === org && f.type === type)
      .sort((a, b) => (finDe(a) ?? '').localeCompare(finDe(b) ?? ''))
      .pop();

  const relancer = (ls: LigneConformite[]) => {
    const aRegler = ls.filter((l) => l.statut !== 'valide');
    void Share.share({
      title: `Documents à mettre à jour – ${chantier.nom}`,
      message:
        `Bonjour,\n\nPour le chantier « ${chantier.nom} », merci de déposer dans Strata :\n` +
        aRegler.map((l) => `- ${LIBELLE_DOC_ENTREPRISE[l.type_doc]} (${TEXTE_STATUT[l.statut](l.fin).toLowerCase()})`).join('\n') +
        `\n\nLe solde du chantier reste bloqué tant que ces documents ne sont pas à jour.\n`,
    });
  };

  const deposerJustificatif = async (type: TypeJustificatif, fichier: Parameters<typeof envoyerFichier>[2]) => {
    setErreur(null);
    setChargement(true);
    try {
      const chemin = await envoyerFichier('chantiers', `${id}/justificatifs`, fichier);
      const { error } = await supabase
        .from('justificatifs_chantier')
        .insert({ chantier_id: id, type, nom: fichier.nom, storage_path: chemin, depose_par: profil?.id });
      if (error) throw error;
      setOuvert(null);
      await charger();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  };

  const justificatifsAffiches: TypeJustificatif[] = estPro
    ? ['consuel', 'etancheite_air', 'attestation_re2020', 'pv_reception']
    : [...new Set(justificatifs.map((j) => j.type))];

  return (
    <Ecran>
      {lignes.length === 0 ? (
        <Bandeau>Aucune entreprise sur ce chantier pour l&apos;instant. Invitez les artisans pour suivre leurs documents.</Bandeau>
      ) : toutEnRegle && manquants.length === 0 ? (
        <Bandeau>Tout est en règle : le solde pourra être versé une fois le dossier complet.</Bandeau>
      ) : (
        <Bandeau ton="alerte">Le solde reste bloqué tant que les documents signalés ne sont pas à jour.</Bandeau>
      )}
      {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}

      <SousTitre>Entreprises</SousTitre>
      {[...parEntreprise].map(([org, ls]) => (
        <Carte key={org}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.s }}>
            <Texte gras>{ls[0].entreprise}</Texte>
            <Text style={{ color: enRegle(ls) ? C.ok : C.alerte, fontWeight: '600' }}>{enRegle(ls) ? 'En règle' : 'À régulariser'}</Text>
          </View>
          {ls.map((l) => {
            const f = fichierDe(org, l.type_doc);
            return (
              <View key={l.type_doc} style={{ gap: S.xs, paddingVertical: S.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.s }}>
                  <Text style={{ color: C.encre, fontSize: 15, flex: 1 }}>{LIBELLE_DOC_ENTREPRISE[l.type_doc]}</Text>
                  {f ? (
                    <Pressable accessibilityRole="link" onPress={() => ouvrir('entreprises', f.storage_path)} hitSlop={8}>
                      <Text style={{ color: C.accent, fontWeight: '600' }}>Voir</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Pastille statut={l.statut} texte={TEXTE_STATUT[l.statut](l.fin)} />
              </View>
            );
          })}
          {!enRegle(ls) && peutRelancer ? <Bouton titre="Relancer l'entreprise" variante="secondaire" onPress={() => relancer(ls)} /> : null}
        </Carte>
      ))}

      {justificatifsAffiches.length ? <SousTitre>Justificatifs du chantier</SousTitre> : null}
      {estPro ? <Texte doux>Exigés pour le solde d&apos;un marché pro, et joints au DOE.</Texte> : null}
      {justificatifsAffiches.map((t) => {
        const fournis = justificatifs.filter((j) => j.type === t);
        const dernier = fournis[fournis.length - 1];
        return (
          <Carte key={t}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.s }}>
              <Texte gras>{LIBELLE_JUSTIFICATIF[t]}</Texte>
              {dernier ? (
                <Pressable accessibilityRole="link" onPress={() => ouvrir('chantiers', dernier.storage_path)} hitSlop={8}>
                  <Text style={{ color: C.accent, fontWeight: '600' }}>Voir</Text>
                </Pressable>
              ) : null}
            </View>
            <Pastille statut={dernier ? 'valide' : 'manquant'} texte={dernier ? `Fourni le ${dateFr(dernier.created_at)}` : 'Manquant'} />
            {ouvert === t ? (
              <DepotDocument
                avecDates={false}
                dateFinSaisie={false}
                chargement={chargement}
                onAnnuler={() => setOuvert(null)}
                onValider={(d) => deposerJustificatif(t, d.fichier)}
              />
            ) : !dernier ? (
              <Bouton titre="Déposer" variante="secondaire" onPress={() => setOuvert(t)} />
            ) : null}
          </Carte>
        );
      })}

      <Texte doux>
        Strata contrôle la présence et les dates des documents, pas leur authenticité. Vérifiez l&apos;attestation de vigilance
        sur le site de l&apos;URSSAF.
      </Texte>
    </Ecran>
  );
}
