#!/usr/bin/env bash
# Exploration ponctuelle : visuels Lorcana (direct, via wsrv.nl, avec/sans Referer).
set -u
U1="https://api.lorcana.ravensburger.com/images/en/set1/1_ea50bda8825b4ccdf7e71c7052ee9688f92e75ab.jpg"
U2="https://www.takaratomy.co.jp/products/disneylorcana/cardlist/img/card/001_DLCS1_UAC_Ariel_OnHumanLegs_JA.png"
for u in "$U1" "$U2" \
  "https://wsrv.nl/?url=api.lorcana.ravensburger.com%2Fimages%2Fen%2Fset1%2F1_ea50bda8825b4ccdf7e71c7052ee9688f92e75ab.jpg&w=360&output=webp" \
  "https://wsrv.nl/?url=www.takaratomy.co.jp%2Fproducts%2Fdisneylorcana%2Fcardlist%2Fimg%2Fcard%2F001_DLCS1_UAC_Ariel_OnHumanLegs_JA.png&w=360&output=webp"; do
  echo "== $u"
  curl -s -o /tmp/x -D - -m 30 "$u" | grep -iE "^HTTP|content-type|access-control|content-length|cross-origin|x-" | head -12
  echo "-- avec Referer github.io"
  curl -s -o /tmp/x -D - -m 30 -H "Referer: https://bananaintrouble.github.io/" "$u" | grep -iE "^HTTP|content-type|content-length" | head -4
  head -c 300 /tmp/x | tr -d '\0' | head -c 300; echo
done
