// Fonctions pures, testées par `npm test`.

export function dateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function euros(montant: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(montant)} €`;
}

/** Montant d'un jalon, arrondi au centime. */
export function montantJalon(montantMarche: number, pourcentage: number): number {
  return Math.round(montantMarche * pourcentage) / 100;
}

/** Un EAN-8 / EAN-13 / GTIN-14 dont la clé de contrôle est juste. */
export function eanValide(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const chiffres = code.split('').map(Number);
  const cle = chiffres.pop()!;
  const somme = chiffres
    .reverse()
    .reduce((acc, c, i) => acc + c * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (somme % 10)) % 10 === cle;
}

/** SIRET : 14 chiffres (espaces tolérés à la saisie). */
export function normaliserSiret(saisie: string): string | null {
  const s = saisie.replace(/\s+/g, '');
  return /^\d{14}$/.test(s) ? s : null;
}

export function couleurTaux(taux: number): 'ok' | 'moyen' | 'bas' {
  if (taux >= 100) return 'ok';
  if (taux >= 60) return 'moyen';
  return 'bas';
}

/** Ajoute des mois à une date AAAA-MM-JJ (le 31 devient le dernier jour du mois si besoin). */
export function ajouterMois(iso: string, mois: number): string {
  const [a, m, j] = iso.split('-').map(Number);
  const fin = new Date(Date.UTC(a, m - 1 + mois + 1, 0)).getUTCDate();
  const d = new Date(Date.UTC(a, m - 1 + mois, Math.min(j, fin)));
  return d.toISOString().slice(0, 10);
}

/** « 15/03/2026 » → « 2026-03-15 », ou null si la date n'existe pas. */
export function dateSaisie(texte: string): string | null {
  const m = texte.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

export type StatutDocument = 'valide' | 'expire_bientot' | 'expire' | 'manquant';

/** Même règle que la base : expiré avant aujourd'hui, alerte 30 jours avant. */
export function statutDocument(fin: string | null, aujourdhui: string): StatutDocument {
  if (!fin) return 'manquant';
  if (fin < aujourdhui) return 'expire';
  const [a, m, j] = aujourdhui.split('-').map(Number);
  const dans30 = new Date(Date.UTC(a, m - 1, j + 30)).toISOString().slice(0, 10);
  return fin <= dans30 ? 'expire_bientot' : 'valide';
}
