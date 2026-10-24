#!/usr/bin/env bash
# Exploration ponctuelle : fiches CardTrader des dernières extensions japonaises (la clé n'est jamais affichée).
set -u
[ -n "${CARDTRADER_TOKEN:-}" ] || { echo "clé absente"; exit 0; }
A="https://api.cardtrader.com/api/v2"
c() { curl -s -m 60 -H "Authorization: Bearer $CARDTRADER_TOKEN" "$A/$1"; }
c expansions > /tmp/e.json
python3 - <<'PY'
import json;d=json.load(open('/tmp/e.json'))
for x in d:
  if x['game_id']==5 and any(w in x['name'].lower() for w in ('celebration','emerald','abyss','30th','storm')): print(x)
PY
for id in $(python3 -c "import json;d=json.load(open('/tmp/e.json'));print(' '.join(str(x['id']) for x in d if x['game_id']==5 and any(w in x['name'].lower() for w in ('celebration','emerald','abyss','30th','storm'))))"); do
  c "blueprints/export?expansion_id=$id" > /tmp/b.json
  python3 - "$id" <<'PY'
import json,sys;d=json.load(open('/tmp/b.json'));eid=sys.argv[1]
want={412352,412353,403029,403030,391089,391380}
hit=[b for b in d if b['id'] in want]
print('exp',eid,len(d),'hits',[(b['id'],b['name'],b.get('fixed_properties'),b.get('card_market_ids'),b.get('tcg_player_id'),[p for p in b.get('editable_properties',[]) if 'language' in p['name']]) for b in hit])
s=[b for b in d if b.get('fixed_properties')][:2]
for b in s: print('  ex',b['id'],b['name'],b.get('version'),b.get('fixed_properties'),b.get('card_market_ids'),[p for p in b.get('editable_properties',[]) if 'language' in p['name']], b.get('image_url'))
PY
done
