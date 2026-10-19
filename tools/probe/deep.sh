#!/usr/bin/env bash
# Exploration ponctuelle : sources de logos des extensions Lorcana.
set -u
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
h() { echo "== $1"; curl -sL -A "$UA" -o /tmp/x -D - -m 30 "$1" | grep -iE "^HTTP|content-type|content-length" | head -4; }
for id in lorcana-1 lorcana-14 1 tfc rotf lorcana-tfc; do h "https://images.scrydex.com/lorcana/$id-logo/logo"; done
echo "#### lorcanajson sets"
curl -sL -m 60 https://lorcanajson.org/files/current/en/allCards.json -o /tmp/all.json
python3 -c "import json;d=json.load(open('/tmp/all.json'));s=d.get('sets');print(type(s));import itertools;print(json.dumps(dict(itertools.islice(s.items(),2)) if isinstance(s,dict) else s[:2],indent=1)[:1500])"
echo "#### lorcast"
curl -sL -m 30 https://api.lorcast.com/v0/sets | head -c 1500; echo
echo "#### lorcana-api"
curl -sL -m 30 "https://api.lorcana-api.com/sets/all" | head -c 1200; echo
echo "#### fandom search"
curl -sL -m 30 "https://lorcana.fandom.com/api.php?action=query&list=search&srnamespace=6&srsearch=logo&srlimit=60&format=json" | python3 -c "import json,sys;d=json.load(sys.stdin);print('\n'.join(x['title'] for x in d['query']['search']))" 2>&1 | head -70
echo "#### fandom imageinfo"
curl -sL -m 30 "https://lorcana.fandom.com/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=logo&gsrlimit=60&prop=imageinfo&iiprop=url|size&format=json" | python3 -c "import json,sys;d=json.load(sys.stdin);[print(p['title'],p['imageinfo'][0]['width'],p['imageinfo'][0]['url']) for p in d['query']['pages'].values()]" 2>&1 | head -70
echo "#### site officiel"
for u in https://www.disneylorcana.com/en-US https://www.disneylorcana.com/en-US/sets https://dreamborn.ink/en/sets ; do h "$u"; grep -oiE '(src|href|content)="[^"]*(logo|set)[^"]*\.(png|webp|svg|jpg)[^"]*"' /tmp/x | sort -u | head -30; done
echo "#### takaratomy"
h "https://www.takaratomy.co.jp/products/disneylorcana/"; grep -oiE 'src="[^"]*logo[^"]*"' /tmp/x | sort -u | head -30
