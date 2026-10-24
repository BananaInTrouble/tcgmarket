#!/usr/bin/env bash
# Exploration ponctuelle : logos des extensions Lorcana sur les pages produits officielles.
set -u
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
for p in the-first-chapter rise-of-the-floodborn into-the-inklands ursulas-return shimmering-skies azurite-sea archazias-island reign-of-jafar fabled whispers winterspell wilds-unknown attack-of-the-vine hyperia-city deep-trouble palace-heist great-hunny-rescue; do
  echo "#### $p"
  curl -sL -A "$UA" -m 30 "https://www.disneylorcana.com/en-US/product/$p" -o /tmp/p.html
  grep -oE 'https://ravensburger\.cloud/[^"'"'"' )]+\.(png|webp|svg)' /tmp/p.html | sort -u | while read -r u; do
    curl -sL -m 20 "$u" -o /tmp/i; echo "$(file -b /tmp/i | cut -c1-60) $(stat -c %s /tmp/i) $u"
  done | grep -iv "icon" | head -25
  grep -oE '"/_nuxt/[^"]+\.(png|webp|svg)"' /tmp/p.html | sort -u | head -10
done
