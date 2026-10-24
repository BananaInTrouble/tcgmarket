#!/usr/bin/env bash
# Exploration ponctuelle : Hyperia City (set 14) sur Cardmarket.
set -u
curl -sL -m 120 https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_19.json -o /tmp/p.json
curl -sL -m 120 https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_19.json -o /tmp/g.json
curl -sL -m 120 https://lorcanajson.org/files/current/en/allCards.json -o /tmp/a.json
python3 - <<'PY'
import json,re,collections
p=json.load(open('/tmp/p.json'));prods=p['products'];print('produits',len(prods),p.get('createdAt'))
g=json.load(open('/tmp/g.json'));print('guide',g.get('createdAt'),len(g['priceGuides']))
a=json.load(open('/tmp/a.json'))
n=lambda s:re.sub(r'[^a-z0-9]','',str(s).lower())
s14=[c for c in a['cards'] if str(c.get('setCode'))=='14']
print('cartes set 14',len(s14),'avec cardmarketId',sum(1 for c in s14 if c.get('externalLinks',{}).get('cardmarketId')))
names={n(c.get('fullName') or c['name']) for c in s14}
by=collections.defaultdict(list)
for x in prods: by[x['idExpansion']].append(x)
hits=sorted(((len({n(x['name']) for x in v}&names),k,len(v)) for k,v in by.items()),reverse=True)[:5]
print('meilleures extensions (noms communs, id, nb):',hits)
last=sorted(by.keys())[-6:]
for k in last: print(k,len(by[k]),[x['name'] for x in by[k][:5]], by[k][0].get('dateAdded'))
print('exemples noms set14',[c.get('fullName') for c in s14[:8]])
PY
