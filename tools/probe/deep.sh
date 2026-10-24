#!/usr/bin/env bash
# Exploration ponctuelle : logos Lorcana manquants (sets 1 à 4, 13, Q1) — toutes les images larges des pages produits.
set -u
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
for p in the-first-chapter rise-of-the-floodborn into-the-inklands ursulas-return attack-of-the-vine deep-trouble; do
  echo "#### $p"
  curl -sL -A "$UA" -m 30 "https://www.disneylorcana.com/en-US/product/$p" -o /tmp/p.html
  { grep -oE 'https://ravensburger\.cloud/[^"'"'"' )]+\.(png|webp|svg)' /tmp/p.html; grep -oE '/_nuxt/[^"'"'"' )]+\.(png|webp|svg)' /tmp/p.html | sed 's#^#https://www.disneylorcana.com#'; } | sort -u | grep -viE '/cards?/|card-collection|en_[a-z0-9]{10}\.png' | while read -r u; do
    curl -sL -m 20 "$u" -o /tmp/i; echo "$(file -b /tmp/i | cut -c1-48) $(stat -c %s /tmp/i) $u"
  done | grep -E ' [0-9]+ x [0-9]+' | awk '{ split($0,a," x "); }1' | grep -vE ', ([0-9]{1,2}|[1-2][0-9]{2}) x ' | head -60
done
