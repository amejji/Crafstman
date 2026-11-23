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
