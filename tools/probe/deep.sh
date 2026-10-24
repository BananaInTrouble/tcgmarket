#!/usr/bin/env bash
# Exploration ponctuelle : liens directs CardTrader et TCGplayer (tcgcsv).
set -u
UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
h() { echo "== $1"; curl -sL -A "$UA" -o /tmp/x -D - -m 30 "$1" | grep -iE "^HTTP|^location|content-type" | head -6; }
echo "#### cardtrader"
for u in "https://www.cardtrader.com/en/search?q=Pikachu" "https://www.cardtrader.com/en/cards?q=Pikachu" "https://www.cardtrader.com/search?q=Pikachu" "https://www.cardtrader.com/en/manasearch?q=Pikachu" "https://www.cardtrader.com/en/pokemon" ; do h "$u"; head -c 600 /tmp/x | tr '\n' ' '; echo; grep -oE '"/[a-z]{2}/cards/[^"]+"' /tmp/x | head -5; grep -oE '(api|autocomplete|search)[^"'"'"' ]{0,80}' /tmp/x | sort -u | head -15; done
h "https://www.cardtrader.com/en/pokemon"; grep -oE 'href="[^"]+"' /tmp/x | sort -u | head -60
echo "#### cardtrader api publique ?"
for u in "https://api.cardtrader.com/api/v2/games" "https://api.cardtrader.com/api/v2/expansions" "https://www.cardtrader.com/api/v2/games"; do h "$u"; head -c 300 /tmp/x; echo; done
echo "#### tcgcsv"
curl -sL -m 30 https://tcgcsv.com/tcgplayer/categories | python3 -c "import json,sys;d=json.load(sys.stdin);[print(c['categoryId'],c['name']) for c in d['results'] if any(w in c['name'].lower() for w in ('pokemon','one piece','lorcana','riftbound','league'))]"
curl -sL -m 30 https://tcgcsv.com/tcgplayer/71/groups | head -c 700; echo
