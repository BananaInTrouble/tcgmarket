import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findGroup, findProduct, groupName, numberKey } from './build-tcgplayer.mjs';

test('TCGplayer : clés de numéro et noms d\'extension', () => {
  assert.equal(numberKey('OP01-001'), '1');
  assert.equal(numberKey('OGN-001/298'), '1');
  assert.equal(numberKey('1/204'), '1');
  assert.equal(numberKey('TG01/TG30'), 'TG01');
  assert.equal(groupName('SV03: Obsidian Flames'), 'obsidianflames');
});

test('TCGplayer : extension et produit d\'une carte', () => {
  const groups = [{ groupId: 1, name: 'Romance Dawn', abbreviation: 'OP01' }, { groupId: 2, name: 'SV03: Obsidian Flames', abbreviation: 'OBF' }];
  assert.equal(findGroup({ id: 'OP01', code: 'OP-01', name: 'Romance Dawn' }, groups).groupId, 1);
  assert.equal(findGroup({ id: 'sv03', code: 'sv03', name: 'Flammes Obsidiennes' }, groups, 'Obsidian Flames').groupId, 2);
  const byNumber = new Map([['1', [{ productId: 9, name: 'Roronoa Zoro (Parallel)' }, { productId: 8, name: 'Roronoa Zoro' }]]]);
  assert.equal(findProduct({ number: 'OP01-001', name: 'Roronoa Zoro' }, byNumber).productId, 8);
  assert.equal(findProduct({ number: 'OP01-002', name: 'X' }, byNumber), undefined);
});
