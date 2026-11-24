// Génère le DOE (marché pro) ou le carnet du logement (particulier) en PDF, côté serveur.
// Appel : supabase.functions.invoke('generer-dossier', { body: { chantier_id } })
// Les lectures se font avec le jeton de l'utilisateur : les règles d'accès de la base s'appliquent.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const A4: [number, number] = [595.28, 841.89];
const MARGE = 48;
const ENCRE = rgb(0.11, 0.13, 0.16);
const GRIS = rgb(0.4, 0.43, 0.47);
const ACCENT = rgb(0.12, 0.37, 0.33);

const LIBELLES_DOC: Record<string, string> = {
  fiche_technique: 'Fiche technique',
  notice: 'Notice',
  avis_technique: 'Avis technique',
  fdes: 'FDES',
  garantie: 'Garantie',
  autre: 'Document',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

// Les polices standard du PDF ne couvrent que le jeu WinAnsi.
function propre(t: string | null | undefined): string {
  return (t ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E -ÿŒœ€]/g, '?');
}

function dateFr(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

class Redacteur {
  page!: PDFPage;
  y = 0;
  constructor(private doc: PDFDocument, private regular: PDFFont, private bold: PDFFont) {
    this.nouvellePage();
  }
  nouvellePage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - MARGE;
  }
  place(h: number) {
    if (this.y - h < MARGE) this.nouvellePage();
  }
  lignes(texte: string, taille: number, police: PDFFont, largeur: number): string[] {
    const mots = propre(texte).split(/\s+/);
    const res: string[] = [];
    let cur = '';
    for (const m of mots) {
      const essai = cur ? `${cur} ${m}` : m;
      if (police.widthOfTextAtSize(essai, taille) > largeur && cur) {
        res.push(cur);
        cur = m;
      } else cur = essai;
    }
    if (cur) res.push(cur);
    return res.length ? res : [''];
  }
  texte(t: string, opts: { taille?: number; gras?: boolean; couleur?: ReturnType<typeof rgb>; x?: number; largeur?: number; apres?: number } = {}) {
    const taille = opts.taille ?? 10;
    const police = opts.gras ? this.bold : this.regular;
    const x = opts.x ?? MARGE;
    const largeur = opts.largeur ?? A4[0] - MARGE - x;
    for (const l of this.lignes(t, taille, police, largeur)) {
      this.place(taille * 1.4);
      this.page.drawText(l, { x, y: this.y - taille, size: taille, font: police, color: opts.couleur ?? ENCRE });
      this.y -= taille * 1.4;
    }
    this.y -= opts.apres ?? 0;
  }
  filet() {
    this.place(10);
    this.page.drawLine({ start: { x: MARGE, y: this.y }, end: { x: A4[0] - MARGE, y: this.y }, thickness: 0.5, color: GRIS });
    this.y -= 10;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Connexion requise' }, 401);

  let chantierId: string | undefined;
  try {
    chantierId = (await req.json())?.chantier_id;
  } catch {
    // corps vide ou invalide
  }
  if (!chantierId) return json({ error: 'chantier_id manquant' }, 400);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });

  const { data: chantier, error: errC } = await sb.from('chantiers').select('*').eq('id', chantierId).maybeSingle();
  if (errC) return json({ error: errC.message }, 500);
  if (!chantier) return json({ error: 'Chantier introuvable ou accès refusé' }, 404);

  const [pieces, poses, garanties, completude, membres, manquants, conformite, justificatifs] = await Promise.all([
    sb.from('pieces').select('id, nom, ordre').eq('chantier_id', chantierId).order('ordre'),
    sb
      .from('poses')
      .select('id, piece_id, produit_id, designation_saisie, marque_saisie, numero_lot, auteur_id, posee_le, photo_path, organisations(nom), produits(designation, marque, ean, garantie_fabricant_mois, entretien, documents(id, type, nom, storage_path)), documents(id, type, nom, storage_path)')
      .eq('chantier_id', chantierId)
      .order('posee_le'),
    sb.from('garanties').select('*').eq('chantier_id', chantierId).maybeSingle(),
    sb.from('chantiers_completude').select('*').eq('chantier_id', chantierId).maybeSingle(),
    sb.from('membres_chantier').select('role, profil_id, lot_marche, profils(nom, email), organisations(nom)').eq('chantier_id', chantierId),
    sb.from('pieces_manquantes').select('pose_id, manquant').eq('chantier_id', chantierId),
    sb.from('conformite').select('organisation_id, entreprise, type_doc, fin, statut').eq('chantier_id', chantierId),
    sb.from('justificatifs_chantier').select('type, nom, storage_path, created_at').eq('chantier_id', chantierId).order('created_at'),
  ]);
  for (const r of [pieces, poses, garanties, completude, membres, manquants, conformite, justificatifs]) {
    if (r.error) return json({ error: r.error.message }, 500);
  }

  const estPro = chantier.type === 'pro';
  const titre = estPro ? "Dossier des ouvrages exécutés (DOE)" : 'Carnet du logement';

  const pdf = await PDFDocument.create();
  pdf.setTitle(propre(`${titre} – ${chantier.nom}`));
  pdf.setProducer('Strata');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const w = new Redacteur(pdf, regular, bold);

  // Page de garde
  w.texte('STRATA', { taille: 10, gras: true, couleur: ACCENT, apres: 6 });
  w.texte(titre, { taille: 22, gras: true, apres: 4 });
  w.texte(chantier.nom, { taille: 14, apres: 2 });
  if (chantier.adresse) w.texte(chantier.adresse, { taille: 11, couleur: GRIS });
  w.texte(`Généré le ${dateFr(new Date().toISOString())}`, { taille: 9, couleur: GRIS, apres: 10 });
  w.filet();

  const c = completude.data;
  w.texte(`Complétude du dossier : ${c?.taux ?? 0} % (${c?.poses_completes ?? 0} poses documentées sur ${c?.poses ?? 0})`, { gras: true, apres: 2 });
  if (estPro) w.texte(`Réserves ouvertes : ${c?.reserves_ouvertes ?? 0}`, { apres: 8 });

  const g = garanties.data;
  w.texte('Réception et garanties légales', { taille: 13, gras: true, apres: 2 });
  if (g) {
    w.texte(`Réception prononcée le ${dateFr(g.date_reception)}`);
    w.texte(`Garantie de parfait achèvement : jusqu'au ${dateFr(g.fin_parfait_achevement)}`);
    w.texte(`Garantie biennale (bon fonctionnement) : jusqu'au ${dateFr(g.fin_biennale)}`);
    w.texte(`Garantie décennale : jusqu'au ${dateFr(g.fin_decennale)}`, { apres: 8 });
  } else {
    w.texte('Réception non prononcée : les dates de garantie seront calculées à la réception.', { couleur: GRIS, apres: 8 });
  }

  w.texte('Intervenants', { taille: 13, gras: true, apres: 2 });
  const ROLES: Record<string, string> = { artisan: 'Entreprise', architecte: "Maître d'œuvre", maitre_ouvrage: "Maître d'ouvrage", particulier: 'Propriétaire' };
  for (const m of membres.data ?? []) {
    // deno-lint-ignore no-explicit-any
    const mm = m as any;
    const qui = mm.organisations?.nom ?? mm.profils?.nom ?? mm.profils?.email ?? '';
    w.texte(`${ROLES[mm.role] ?? mm.role} : ${qui}${mm.lot_marche ? ` (${mm.lot_marche})` : ''}`);
  }
  w.y -= 8;

  // Assurances et attestations : présence et dates contrôlées par Strata, pas l'authenticité.
  const LIB_ENTREPRISE: Record<string, string> = {
    decennale: 'Assurance décennale', rc_pro: 'RC professionnelle', kbis: "Kbis ou carte d'artisan",
    vigilance_urssaf: 'Attestation de vigilance URSSAF', rge: 'RGE', qualibat: 'Qualibat', qualifelec: 'Qualifelec', autre: 'Autre',
  };
  const LIB_STATUT: Record<string, string> = { valide: 'valide', expire_bientot: 'expire bientôt', expire: 'expiré', manquant: 'manquant' };
  const annexesEntreprises: { titre: string; bucket: string; path: string }[] = [];
  w.texte('Assurances et attestations des entreprises', { taille: 13, gras: true, apres: 2 });
  const lignesConf = conformite.data ?? [];
  if (!lignesConf.length) w.texte('Aucune entreprise sur ce chantier.', { couleur: GRIS });
  const orgas = [...new Set(lignesConf.map((l) => l.organisation_id))];
  const { data: fichiersEntreprises } = orgas.length
    ? await sb.from('documents_entreprise').select('organisation_id, type, storage_path, date_emission, date_fin').in('organisation_id', orgas)
    : { data: [] };
  for (const org of orgas) {
    const ls = lignesConf.filter((l) => l.organisation_id === org);
    const enRegle = ls.every((l) => l.statut === 'valide' || l.statut === 'expire_bientot');
    w.texte(`${ls[0].entreprise} – ${enRegle ? 'en règle' : 'à régulariser'}`, { gras: true, couleur: enRegle ? ACCENT : rgb(0.7, 0.2, 0.1) });
    for (const l of ls) {
      w.texte(`${LIB_ENTREPRISE[l.type_doc] ?? l.type_doc} : ${LIB_STATUT[l.statut] ?? l.statut}${l.fin ? `, valable jusqu'au ${dateFr(l.fin)}` : ''}`,
        { taille: 9, x: MARGE + 8, couleur: l.statut === 'manquant' || l.statut === 'expire' ? rgb(0.7, 0.2, 0.1) : ENCRE });
      // Joindre le document le plus récent de ce type
      const f = (fichiersEntreprises ?? [])
        .filter((x) => x.organisation_id === org && x.type === l.type_doc)
        .sort((a, b) => a.date_emission.localeCompare(b.date_emission))
        .pop();
      if (f) annexesEntreprises.push({ titre: `${LIB_ENTREPRISE[l.type_doc]} – ${ls[0].entreprise}`, bucket: 'entreprises', path: f.storage_path });
    }
    w.y -= 4;
  }
  w.texte("Strata contrôle la présence et les dates des documents, pas leur authenticité. L'attestation de vigilance se vérifie sur le site de l'URSSAF.",
    { taille: 8, couleur: GRIS, apres: 8 });

  const LIB_JUSTIF: Record<string, string> = {
    consuel: 'Attestation Consuel', etancheite_air: "Test d'étanchéité à l'air", attestation_re2020: 'Attestation RE2020',
    pv_reception: 'PV de réception', autre: 'Autre justificatif',
  };
  const listeJustifs = justificatifs.data ?? [];
  if (estPro || listeJustifs.length) {
    w.texte('Justificatifs du chantier', { taille: 13, gras: true, apres: 2 });
    const attendus = estPro ? ['consuel', 'etancheite_air', 'attestation_re2020', 'pv_reception'] : [];
    for (const t of [...new Set([...attendus, ...listeJustifs.map((j) => j.type)])]) {
      const j = listeJustifs.filter((x) => x.type === t).pop();
      w.texte(`${LIB_JUSTIF[t] ?? t} : ${j ? `fourni le ${dateFr(j.created_at)} (joint en annexe)` : 'manquant'}`,
        { taille: 9, x: MARGE + 8, couleur: j ? ENCRE : rgb(0.7, 0.2, 0.1) });
      if (j) annexesEntreprises.push({ titre: LIB_JUSTIF[t] ?? t, bucket: 'chantiers', path: j.storage_path });
    }
    w.y -= 8;
  }

  // Sans types générés, supabase-js ne sait pas que les relations sont simples.
  // deno-lint-ignore no-explicit-any
  const listePoses = (poses.data ?? []) as any[];

  // Matériaux posés : le DOE est classé par lot du marché (corps d'état), le carnet par pièce.
  w.texte(estPro ? 'Matériaux posés, par lot' : 'Matériaux posés, par pièce', { taille: 13, gras: true, apres: 4 });
  const nomsPieces = new Map((pieces.data ?? []).map((p) => [p.id, p.nom] as const));
  // deno-lint-ignore no-explicit-any
  const membreDe = new Map((membres.data ?? []).map((m: any) => [m.profil_id, m] as const));
  const manquantsPar = new Map<string, string[]>();
  for (const m of manquants.data ?? []) {
    manquantsPar.set(m.pose_id, [...(manquantsPar.get(m.pose_id) ?? []), LIBELLES_DOC[m.manquant] ?? m.manquant]);
  }
  // deno-lint-ignore no-explicit-any
  const parPiece = new Map<string, any[]>();
  for (const p of listePoses) {
    const auteur = membreDe.get(p.auteur_id);
    const cle = estPro
      ? auteur?.lot_marche || (p.organisations?.nom ? `Lot non précisé – ${p.organisations.nom}` : 'Lot non précisé')
      : (p.piece_id && nomsPieces.get(p.piece_id)) || 'Sans pièce';
    parPiece.set(cle, [...(parPiece.get(cle) ?? []), p]);
  }
  // Ordre naturel : « Lot 02 » avant « Lot 10 ».
  const groupes = estPro
    ? [...parPiece].sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true }))
    : [...parPiece];
  const annexes: { titre: string; bucket: string; path: string }[] = [...annexesEntreprises];
  const dejaJoints = new Set<string>();
  for (const [piece, liste] of groupes) {
    w.texte(piece, { taille: 11, gras: true, couleur: ACCENT, apres: 2 });
    for (const p of liste) {
      const prod = p.produits;
      const designation = prod?.designation ?? p.designation_saisie ?? 'Produit';
      const marque = prod?.marque ?? p.marque_saisie;
      // deno-lint-ignore no-explicit-any
      const docs = [...(prod?.documents ?? []).map((d: any) => ({ ...d, bucket: 'produits' })), ...(p.documents ?? []).map((d: any) => ({ ...d, bucket: 'chantiers' }))];
      w.texte(`${designation}${marque ? ` – ${marque}` : ''}`, { gras: true, x: MARGE + 8 });
      const details = [
        `Posé le ${dateFr(p.posee_le)}`,
        estPro ? ((p.piece_id && nomsPieces.get(p.piece_id)) || null) : null,
        p.organisations?.nom ? `par ${p.organisations.nom}` : null,
        p.numero_lot ? `n° de lot ${p.numero_lot}` : null,
        prod?.ean ? `EAN ${prod.ean}` : null,
      ].filter(Boolean).join(' · ');
      w.texte(details, { taille: 9, couleur: GRIS, x: MARGE + 8 });
      if (prod?.entretien) w.texte(`Entretien : ${prod.entretien}`, { taille: 9, x: MARGE + 8 });
      const aFournir = manquantsPar.get(p.id) ?? [];
      if (docs.length) {
        w.texte(`Documents : ${docs.map((d) => LIBELLES_DOC[d.type] ?? d.nom).join(', ')} (joints en annexe)`, { taille: 9, x: MARGE + 8 });
      }
      w.texte(aFournir.length ? `À fournir : ${aFournir.join(', ')}` : 'Dossier complet pour ce produit', {
        taille: 9,
        x: MARGE + 8,
        couleur: aFournir.length ? rgb(0.7, 0.2, 0.1) : ACCENT,
        apres: 6,
      });
      for (const d of docs) {
        if (dejaJoints.has(d.storage_path)) continue;
        dejaJoints.add(d.storage_path);
        annexes.push({ titre: `${LIBELLES_DOC[d.type] ?? 'Document'} – ${designation}`, bucket: d.bucket, path: d.storage_path });
      }
    }
  }
  if (!parPiece.size) w.texte('Aucune pose enregistrée.', { couleur: GRIS });

  // Annexe : photos de pose (6 par page)
  const photos = listePoses.filter((p) => p.photo_path);
  if (photos.length) {
    w.nouvellePage();
    w.texte('Annexe – Photos de pose', { taille: 13, gras: true, apres: 6 });
    const colW = (A4[0] - 2 * MARGE - 16) / 2;
    const imgH = 200;
    let col = 0;
    for (const p of photos) {
      const { data: blob } = await sb.storage.from('chantiers').download(p.photo_path!);
      if (!blob) continue;
      try {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const img = blob.type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        if (col === 0) w.place(imgH + 30);
        const dims = img.scaleToFit(colW, imgH);
        const x = MARGE + col * (colW + 16);
        w.page.drawImage(img, { x, y: w.y - dims.height, width: dims.width, height: dims.height });
        const legende = propre(`${p.produits?.designation ?? p.designation_saisie ?? ''} – ${dateFr(p.posee_le)}`).slice(0, 70);
        w.page.drawText(legende, { x, y: w.y - imgH - 12, size: 8, font: regular, color: GRIS });
        if (col === 1) w.y -= imgH + 30;
        col = 1 - col;
      } catch {
        // image illisible : on l'ignore
      }
    }
  }

  // Annexes : attestations, justificatifs, puis documents des produits (fiches techniques, notices, FDES…).
  // Un PDF est recopié tel quel ; une photo de document tient sur une page.
  for (const a of annexes) {
    const { data: blob } = await sb.storage.from(a.bucket).download(a.path);
    if (!blob) continue;
    try {
      const octetsAnnexe = new Uint8Array(await blob.arrayBuffer());
      const estPdf = octetsAnnexe[0] === 0x25 && octetsAnnexe[1] === 0x50; // « %P »
      const estPng = octetsAnnexe[0] === 0x89 && octetsAnnexe[1] === 0x50;
      const estJpg = octetsAnnexe[0] === 0xff && octetsAnnexe[1] === 0xd8;
      if (!estPdf && !estPng && !estJpg) continue;
      const sep = pdf.addPage(A4);
      sep.drawText(propre('Annexe'), { x: MARGE, y: A4[1] - MARGE - 10, size: 10, font: bold, color: ACCENT });
      sep.drawText(propre(a.titre).slice(0, 80), { x: MARGE, y: A4[1] - MARGE - 34, size: 14, font: bold, color: ENCRE });
      if (estPdf) {
        const src = await PDFDocument.load(octetsAnnexe, { ignoreEncryption: true });
        const pages = await pdf.copyPages(src, src.getPageIndices());
        pages.forEach((pg) => pdf.addPage(pg));
      } else {
        const img = estPng ? await pdf.embedPng(octetsAnnexe) : await pdf.embedJpg(octetsAnnexe);
        const dims = img.scaleToFit(A4[0] - 2 * MARGE, A4[1] - 2 * MARGE - 60);
        sep.drawImage(img, { x: MARGE, y: A4[1] - MARGE - 60 - dims.height, width: dims.width, height: dims.height });
      }
    } catch {
      // fichier corrompu : il reste listé dans le dossier
    }
  }

  // Numérotation
  const total = pdf.getPageCount();
  pdf.getPages().forEach((pg, i) => {
    pg.drawText(`${i + 1} / ${total}`, { x: A4[0] - MARGE - 30, y: 24, size: 8, font: regular, color: GRIS });
  });

  const octets = await pdf.save();
  const nomFichier = `${estPro ? 'DOE' : 'Carnet'}-${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}.pdf`;
  const chemin = `${chantierId}/dossiers/${nomFichier}`;
  const { error: errUp } = await sb.storage.from('chantiers').upload(chemin, octets, { contentType: 'application/pdf' });
  if (errUp) return json({ error: errUp.message }, 500);
  const { data: lien, error: errLien } = await sb.storage.from('chantiers').createSignedUrl(chemin, 60 * 60 * 24 * 7);
  if (errLien) return json({ error: errLien.message }, 500);

  return json({ chemin, url: lien.signedUrl, pages: total });
});
