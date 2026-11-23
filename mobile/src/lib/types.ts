export type TypeChantier = 'pro' | 'particulier';
export type RoleChantier = 'artisan' | 'architecte' | 'maitre_ouvrage' | 'particulier';

export const LIBELLE_ROLE: Record<RoleChantier, string> = {
  artisan: 'Artisan',
  architecte: "Architecte / maître d'œuvre",
  maitre_ouvrage: "Maître d'ouvrage",
  particulier: 'Particulier',
};

export type Organisation = {
  id: string;
  nom: string;
  siret: string | null;
  assureur_decennale: string | null;
  police_decennale: string | null;
  decennale_valide_jusqu_au: string | null;
};

export type Profil = {
  id: string;
  email: string;
  nom: string | null;
  organisation_id: string | null;
  organisations?: Organisation | null;
};

export type Chantier = {
  id: string;
  nom: string;
  adresse: string | null;
  type: TypeChantier;
  montant_marche_ttc: number;
  date_reception: string | null;
};

export type Piece = { id: string; nom: string; ordre: number };

export type Produit = {
  id: string;
  ean: string;
  designation: string;
  marque: string | null;
};

export type Pose = {
  id: string;
  piece_id: string | null;
  posee_le: string;
  lot: string | null;
  designation_saisie: string | null;
  marque_saisie: string | null;
  produits: { designation: string; marque: string | null } | null;
  organisations: { nom: string } | null;
};

export type Completude = {
  chantier_id: string;
  poses: number;
  poses_completes: number;
  taux: number;
  reserves_ouvertes: number;
};

export type Reserve = {
  id: string;
  description: string;
  lot: string | null;
  statut: 'ouverte' | 'levee';
  piece_id: string | null;
  photo_path: string | null;
  levee_le: string | null;
  created_at: string;
};

export type Jalon = {
  id: string;
  ordre: number;
  libelle: string;
  pourcentage: number;
  condition: 'aucune' | 'situation' | 'reception_dossier_complet' | 'un_an_apres_reception';
  statut: 'a_venir' | 'demande' | 'valide' | 'paye';
};

export type Garanties = {
  date_reception: string;
  fin_parfait_achevement: string;
  fin_biennale: string;
  fin_decennale: string;
};
