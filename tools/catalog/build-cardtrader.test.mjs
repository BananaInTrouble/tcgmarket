import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blueprintIndex, blueprintOf } from './build-cardtrader.mjs';

test('CardTrader : fiche retrouvée par n° Cardmarket, sinon TCGplayer', () => {
  const index = blueprintIndex([
    { id: 1, fixed_properties: {}, card_market_ids: [100], tcg_player_id: 900 },
    { id: 2, fixed_properties: { collector_number: '2' }, card_market_ids: [200], tcg_player_id: null },
    { id: 3, fixed_properties: {}, card_market_ids: [], tcg_player_id: 950 },
  ]);
  assert.equal(blueprintOf({ cm: { id: 200 } }, index), 2);
  assert.equal(blueprintOf({ v: [{ k: 'normal', id: 100 }] }, index), 1);
  assert.equal(blueprintOf({ tcgplayer: 950 }, index), 3);
  assert.equal(blueprintOf({ tcgplayer: 1 }, index), undefined);
});
