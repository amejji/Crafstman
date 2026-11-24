import { useState } from 'react';
import { View } from 'react-native';

import { Bouton, Champ, Texte } from '@/components/ui';
import { S } from '@/constants/theme';
import { choisirFichier, type FichierChoisi } from '@/lib/fichiers';

export type Depot = { fichier: FichierChoisi; emission: string | null; fin: string | null };

/** Choix du fichier, puis des dates si le document en a. */
export function DepotDocument({
  avecDates,
  dateFinSaisie,
  onValider,
  onAnnuler,
  chargement,
}: {
  avecDates: boolean;
  /** false pour le Kbis et la vigilance : leur fin se calcule depuis la date du document. */
  dateFinSaisie: boolean;
  onValider: (d: { fichier: FichierChoisi; emission: string; fin: string }) => void;
  onAnnuler: () => void;
  chargement?: boolean;
}) {
  const [fichier, setFichier] = useState<FichierChoisi | null>(null);
  const [emission, setEmission] = useState('');
  const [fin, setFin] = useState('');
  return (
    <View style={{ gap: S.s }}>
      <Bouton
        titre={fichier ? `Fichier : ${fichier.nom}` : 'Choisir le fichier (PDF ou photo)'}
        variante="secondaire"
        onPress={async () => setFichier((await choisirFichier()) ?? fichier)}
      />
      {avecDates ? (
        <>
          <Champ libelle="Date du document (JJ/MM/AAAA)" value={emission} onChangeText={setEmission} keyboardType="numbers-and-punctuation" placeholder="15/01/2026" />
          {dateFinSaisie ? (
            <Champ libelle="Valable jusqu'au (JJ/MM/AAAA)" value={fin} onChangeText={setFin} keyboardType="numbers-and-punctuation" placeholder="31/12/2026" />
          ) : null}
        </>
      ) : null}
      {!fichier ? <Texte doux>Un PDF reçu par e-mail, ou une photo nette du document.</Texte> : null}
      <Bouton titre="Enregistrer" onPress={() => fichier && onValider({ fichier, emission, fin })} chargement={chargement} desactive={!fichier} />
      <Bouton titre="Annuler" variante="secondaire" onPress={onAnnuler} />
    </View>
  );
}
