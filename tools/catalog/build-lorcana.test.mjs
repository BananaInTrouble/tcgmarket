import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attrsOf, cardmarketFallback, jaSetOf, printedNumber, rarityId, setOf, smallImage, variantsOf } from './build-lorcana.mjs';

test('Lorcana : variantes normale / foil selon les finitions', () => {
  assert.deepEqual(variantsOf({ foilTypes: ['None', 'Silver'] }, 7), [{ k: 'normal', id: 7 }, { k: 'foil', id: 7 }]);
  assert.deepEqual(variantsOf({ foilTypes: ['Lava'] }, 8), [{ k: 'foil', id: 8 }]);
  assert.deepEqual(variantsOf({ foilTypes: ['None'] }), [{ k: 'normal' }]);
});

test('Lorcana : numéro, extension, rareté, attributs, visuel', () => {
  assert.equal(printedNumber({ fullIdentifier: '1/204 • FR • 1', number: 1 }), '1/204');
  assert.equal(printedNumber({ fullIdentifier: '1 TFC • EN • 1/P1', number: 1 }), '1/P1');
  assert.equal(setOf({ setCode: '1', promoGrouping: 'P1' }), 'P1');
  assert.equal(setOf({ setCode: 'Q2' }), 'Q2');
  assert.equal(rarityId('Super Rare'), 'super_rare');
  assert.deepEqual(attrsOf({ artistsText: 'A', cost: 4, strength: 3, willpower: 4, lore: 2, story: 'Frozen' }), { illustrator: 'A', cost: '4', strength: '3', willpower: '4', lore: '2', story: 'Frozen' });
  assert.equal(smallImage('https://api.lorcana.ravensburger.com/images/fr/set1/1_x.jpg'), 'https://api.lorcana.ravensburger.com/images/fr/set1/1_x.jpg');
  assert.equal(smallImage('https://www.takaratomy.co.jp/a/1.png'), 'https://wsrv.nl/?url=www.takaratomy.co.jp%2Fa%2F1.png&w=360&output=webp');
});

test('Lorcana japonais : extensions', () => {
  const st = new Map();
  assert.equal(jaSetOf({ sets_order: 1400, sets_array: ['ハイペリアシティ'] }, st), '14');
  assert.equal(jaSetOf({ sets_order: 750, sets_array: ['FABLED 物語のおもいで 特別プロモーションパックvol.1'] }, st), '9');
  assert.equal(jaSetOf({ sets_order: 1100, sets_array: ['キュレーターズ・ライブラリー　WINTERSPELL'] }, st), '11');
  assert.equal(jaSetOf({ sets_order: 1000, sets_array: ['ここからはじまる！スタートデッキ　家族のきずな'] }, st), 'SD1');
  assert.equal(jaSetOf({ sets_order: 100, sets_array: ['ＴＨＥ　ＦＩＲＳＴ　ＣＨＡＰＴＥＲ　物語のはじまり', 'ここからはじまる！スタートデッキ　家族のきずな'] }, st), '1');
  assert.equal(jaSetOf({ sets_order: 610, sets_array: ['-'] }, st), undefined);
});

test('Lorcana : fiches Cardmarket retrouvées par le nom pour une nouvelle extension', () => {
  const cards = [
    { id: 1, setCode: '13', number: 1, fullName: 'Ariel - Sea Star', externalLinks: { cardmarketId: 100 } },
    { id: 2, setCode: '14', number: 3, fullName: 'Mulan - Hero' },
    { id: 3, setCode: '14', number: 210, fullName: 'Mulan - Hero' },
    { id: 4, setCode: '14', number: 7, fullName: 'Stitch - Pilot' },
  ];
  const products = [
    { idProduct: 100, idExpansion: 9, name: 'Ariel - Sea Star' },
    { idProduct: 300, idExpansion: 10, name: 'Mulan - Hero' },
    { idProduct: 301, idExpansion: 10, name: 'Stitch - Pilot' },
    { idProduct: 305, idExpansion: 10, name: 'Mulan - Hero' },
    { idProduct: 999, idExpansion: 11, name: 'Other' },
  ];
  assert.deepEqual([...cardmarketFallback(cards, products)].sort((a, b) => a[0] - b[0]), [[2, 300], [3, 305], [4, 301]]);
});
