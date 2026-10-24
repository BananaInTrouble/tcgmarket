#!/usr/bin/env bash
# Exploration ponctuelle : API CardTrader (la clé n'est jamais affichée).
set -u
[ -n "${CARDTRADER_TOKEN:-}" ] && echo "clé présente (${#CARDTRADER_TOKEN} caractères)" || { echo "clé absente"; exit 0; }
A="https://api.cardtrader.com/api/v2"
c() { curl -s -m 60 -H "Authorization: Bearer $CARDTRADER_TOKEN" "$A/$1"; }
echo "#### info"; c info | head -c 300; echo
echo "#### games"; c games | python3 -c "import json,sys;d=json.load(sys.stdin);d=d.get('array',d);[print(g) for g in d]" | head -20
echo "#### expansions"; c expansions > /tmp/e.json; python3 - <<'PY'
import json;d=json.load(open('/tmp/e.json'));print(len(d))
import collections;print(collections.Counter(x['game_id'] for x in d))
for x in d[:3]: print(x)
for x in d:
  if x['name'] in ('Obsidian Flames','Romance Dawn','The First Chapter','Origins','Hyperia City','Pokemon Card 151','Storm Emerald'): print(x)
PY
EID=$(python3 -c "import json;d=json.load(open('/tmp/e.json'));print(next(x['id'] for x in d if x['name']=='Obsidian Flames'))")
echo "#### blueprints $EID"; c "blueprints/export?expansion_id=$EID" > /tmp/b.json; python3 - <<'PY'
import json;d=json.load(open('/tmp/b.json'));print(len(d));print(json.dumps(d[0])[:1500]);print(json.dumps(d[5])[:600])
import collections;print(collections.Counter(x.get('category_id') for x in d))
PY
echo "#### categories"; c "categories?game_id=5" | head -c 800; echo
