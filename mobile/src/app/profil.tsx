import { FormulaireProfil } from '@/components/formulaire-profil';
import { Ecran, Texte, Titre } from '@/components/ui';

export default function Profil() {
  return (
    <Ecran>
      <Titre>Bienvenue sur Strata</Titre>
      <Texte doux>Deux minutes pour présenter votre activité. Ces informations figurent dans les dossiers générés.</Texte>
      <FormulaireProfil />
    </Ecran>
  );
}
