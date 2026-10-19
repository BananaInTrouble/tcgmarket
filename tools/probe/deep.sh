#!/usr/bin/env bash
# Exploration ponctuelle : sources de logos des extensions Lorcana (suite).
set -u
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
T="The_First_Chapter|Rise_of_the_Floodborn|Into_the_Inklands|Ursula's_Return|Shimmering_Skies|Azurite_Sea|Archazia's_Island|The_Reign_of_Jafar|Reign_of_Jafar|Fabled|Whispers_in_the_Well|Winterspell|Wilds_Unknown|Attack_of_the_Vine!|Hyperia_City"
echo "#### fandom pageimages"
curl -sL -m 30 -G "https://lorcana.fandom.com/api.php" --data-urlencode "titles=$T" -d action=query -d prop=pageimages -d piprop=original -d redirects=1 -d format=json | python3 -c "import json,sys;d=json.load(sys.stdin);[print(p.get('title'),'|',(p.get('original') or {}).get('source'),(p.get('original') or {}).get('width')) for p in d['query']['pages'].values()]"
echo "#### fandom images par page"
curl -sL -m 30 -G "https://lorcana.fandom.com/api.php" --data-urlencode "titles=$T" -d action=query -d prop=images -d imlimit=500 -d redirects=1 -d format=json | python3 -c "
import json,sys;d=json.load(sys.stdin)
for p in d['query']['pages'].values():
  ims=[i['title'] for i in p.get('images',[]) if any(w in i['title'].lower() for w in ('logo','set','title','wordmark'))]
  print(p.get('title'),'->',ims[:12])"
echo "#### fandom allimages logo"
for pre in "" ; do
curl -sL -m 30 "https://lorcana.fandom.com/api.php?action=query&list=allimages&aisort=name&ailimit=500&format=json&aiprop=url|size" | python3 -c "
import json,sys;d=json.load(sys.stdin)
for i in d['query']['allimages']:
  n=i['name'].lower()
  if 'logo' in n: print(i['name'],i['width'],i['url'])" | head -80
done
echo "#### disneylorcana html"
curl -sL -A "$UA" -m 30 https://www.disneylorcana.com/en-US -o /tmp/h.html
grep -oE 'https?://[^"'"'"' )]+\.(png|webp|svg|jpg)' /tmp/h.html | sort -u | head -80
grep -oE '"/[^"]*(set|logo)[^"]*\.(png|webp|svg|jpg)"' /tmp/h.html | sort -u | head -40
grep -oE 'href="/en-US/[^"]+"' /tmp/h.html | sort -u | head -60
