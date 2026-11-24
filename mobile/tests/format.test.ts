import assert from 'node:assert/strict';
import { test } from 'node:test';

import { couleurTaux, eanValide, montantJalon, normaliserSiret } from '../src/lib/format.ts';

test('EAN : clé de contrôle', () => {
  assert.equal(eanValide('3760000000017'), true);
  assert.equal(eanValide('4006381333931'), true);
  assert.equal(eanValide('4006381333932'), false);
  assert.equal(eanValide('96385074'), true);
  assert.equal(eanValide('12ab'), false);
});

test('montant des jalons, arrondi au centime', () => {
  assert.equal(montantJalon(100000, 30), 30000);
  assert.equal(montantJalon(12345.67, 25), 3086.42);
  const parts = [30, 40, 25, 5].map((p) => montantJalon(25000, p));
  assert.equal(parts.reduce((a, b) => a + b, 0), 25000);
});

test('SIRET', () => {
  assert.equal(normaliserSiret('123 456 789 00011'), '12345678900011');
  assert.equal(normaliserSiret('1234'), null);
});

test('couleur de la jauge', () => {
  assert.equal(couleurTaux(100), 'ok');
  assert.equal(couleurTaux(75), 'moyen');
  assert.equal(couleurTaux(10), 'bas');
});

import { ajouterMois, dateSaisie, statutDocument } from '../src/lib/format.ts';

test('ajout de mois (Kbis 3 mois, vigilance 6 mois)', () => {
  assert.equal(ajouterMois('2026-01-15', 3), '2026-04-15');
  assert.equal(ajouterMois('2026-08-31', 6), '2027-02-28');
  assert.equal(ajouterMois('2026-11-30', 3), '2027-02-28');
});

test('date saisie JJ/MM/AAAA', () => {
  assert.equal(dateSaisie('5/3/2026'), '2026-03-05');
  assert.equal(dateSaisie('15.03.2026'), '2026-03-15');
  assert.equal(dateSaisie('31/02/2026'), null);
  assert.equal(dateSaisie('2026-03-15'), null);
});

test('statut d’un document', () => {
  assert.equal(statutDocument(null, '2026-11-24'), 'manquant');
  assert.equal(statutDocument('2026-11-23', '2026-11-24'), 'expire');
  assert.equal(statutDocument('2026-11-24', '2026-11-24'), 'expire_bientot');
  assert.equal(statutDocument('2026-12-24', '2026-11-24'), 'expire_bientot');
  assert.equal(statutDocument('2026-12-25', '2026-11-24'), 'valide');
});
