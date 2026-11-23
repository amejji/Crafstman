import { router } from 'expo-router';
import { useState } from 'react';

import { Bandeau, Bouton, Champ, Ecran, Puce, Puces, SousTitre, Texte } from '@/components/ui';
import { euros, montantJalon } from '@/lib/format';
import { messageErreur, supabase } from '@/lib/supabase';
import type { RoleChantier, TypeChantier } from '@/lib/types';

const PIECES_PROPOSEES = ['Entrée', 'Séjour', 'Cuisine', 'Chambre 1', 'Chambre 2', 'Salle de bains', 'WC', 'Combles', 'Extérieur'];

export default function NouveauChantier() {
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [type, setType] = useState<TypeChantier>('particulier');
  const [role, setRole] = useState<RoleChantier>('artisan');
  const [montant, setMontant] = useState('');
  const [pieces, setPieces] = useState<string[]>(['Séjour', 'Cuisine', 'Salle de bains']);
  const [autrePiece, setAutrePiece] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const montantNombre = Number(montant.replace(/\s/g, '').replace(',', '.')) || 0;
  const echeancier =
    type === 'pro'
      ? [['Acompte', 30], ['Situation de travaux', 40], ['Solde', 25], ['Retenue de garantie (1 an)', 5]]
      : [['Acompte', 30], ['Situation de travaux', 40], ['Solde', 30]];

  const basculer = (p: string) => setPieces((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]));

  const creer = async () => {
    if (!nom.trim()) return setErreur('Donnez un nom au chantier.');
    setErreur(null);
    setChargement(true);
    const { data, error } = await supabase.rpc('creer_chantier', {
      p_nom: nom.trim(),
      p_adresse: adresse.trim() || null,
      p_type: type,
      p_montant: montantNombre,
      p_role: role,
      p_pieces: pieces,
    });
    setChargement(false);
    if (error) return setErreur(messageErreur(error));
    router.replace(`/chantier/${data as string}`);
  };

  return (
    <Ecran>
      <Champ libelle="Nom du chantier" value={nom} onChangeText={setNom} placeholder="Maison Durand – rénovation" />
      <Champ libelle="Adresse" value={adresse} onChangeText={setAdresse} placeholder="12 rue des Lilas, 69003 Lyon" />

      <SousTitre>Type de marché</SousTitre>
      <Puces>
        <Puce libelle="Particulier (carnet)" choisie={type === 'particulier'} onPress={() => setType('particulier')} />
        <Puce libelle="Marché pro (DOE)" choisie={type === 'pro'} onPress={() => setType('pro')} />
      </Puces>

      <SousTitre>Votre rôle sur ce chantier</SousTitre>
      <Puces>
        <Puce libelle="Artisan" choisie={role === 'artisan'} onPress={() => setRole('artisan')} />
        <Puce libelle="Architecte / MOE" choisie={role === 'architecte'} onPress={() => setRole('architecte')} />
      </Puces>

      <SousTitre>Pièces</SousTitre>
      <Puces>
        {[...new Set([...PIECES_PROPOSEES, ...pieces])].map((p) => (
          <Puce key={p} libelle={p} choisie={pieces.includes(p)} onPress={() => basculer(p)} />
        ))}
      </Puces>
      <Champ
        libelle="Ajouter une pièce"
        value={autrePiece}
        onChangeText={setAutrePiece}
        placeholder="Buanderie"
        returnKeyType="done"
        onSubmitEditing={() => {
          if (autrePiece.trim()) setPieces((l) => [...l, autrePiece.trim()]);
          setAutrePiece('');
        }}
      />

      <SousTitre>Montant et échéancier</SousTitre>
      <Champ libelle="Montant du marché TTC (€)" value={montant} onChangeText={setMontant} keyboardType="decimal-pad" placeholder="25 000" />
      {echeancier.map(([libelle, pct]) => (
        <Texte key={libelle as string} doux>
          {libelle} : {pct} %{montantNombre ? ` · ${euros(montantJalon(montantNombre, pct as number))}` : ''}
        </Texte>
      ))}
      <Texte doux>Le solde n&apos;est versé que lorsque le dossier est complet{type === 'pro' ? ' et les réserves levées' : ''}.</Texte>

      {erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}
      <Bouton titre="Créer le chantier" onPress={creer} chargement={chargement} />
    </Ecran>
  );
}
