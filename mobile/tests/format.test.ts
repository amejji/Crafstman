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
