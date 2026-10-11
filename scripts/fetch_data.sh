#!/usr/bin/env bash
# Baixa os textos e dicionários usados pelo tutor para data/raw/ (não vão para o git). Fontes e licenças: SOURCES.md
set -euo pipefail
cd "$(dirname "$0")/.."
R=data/raw; mkdir -p $R
# Apocalipse (66:1-22) nas versões usadas no estudo + Bíblia Livre completa (para referências cruzadas)
for t in livre almeida tischendorf; do
  mkdir -p $R/$t
  for c in $(seq 1 22); do curl -s --retry 3 "https://api.getbible.net/v2/$t/66/$c.json" -o "$R/$t/$c.json"; sleep 0.1; done
done
curl -s -o $R/livre-full.json https://api.getbible.net/v2/livre.json
# Morfologia do NT grego (lemas) e dicionário Strong
curl -s -o $R/morphgnt-re.txt https://raw.githubusercontent.com/morphgnt/sblgnt/master/87-Re-morphgnt.txt
curl -s -o $R/strongs-greek.js https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js
# Referências cruzadas (OpenBible.info, CC-BY)
curl -s -L -o $R/xrefs.zip https://a.openbible.info/data/cross-references.zip && unzip -o -q $R/xrefs.zip -d $R
echo "ok: dados em $R"
