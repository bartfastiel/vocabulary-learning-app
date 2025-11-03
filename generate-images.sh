#!/bin/bash

# OpenAI API Key laden
source ./env.sh

MODEL="dall-e-3"
SIZE="1024x1024"

mkdir -p img
mkdir -p log/image_requests
mkdir -p log/image_responses

# Alle Vokabeln mit allowImage=true extrahieren
mapfile -t IMAGE_WORDS < <(jq -r '.[] | select(.allowImage == true) | .en' vocab/vocab.json | sort)

# sammle alle erwarteten Dateinamen
ALL_FILES=()

for word in "${IMAGE_WORDS[@]}"; do
  word=$(echo "$word" | tr -d '\r\n')
  WORD_LOWER=$(printf "%s" "$word" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '_')
  OUT_FILE="assets/img/${WORD_LOWER}.png"
  ALL_FILES+=("$OUT_FILE")

  # Skip, wenn Bild bereits vorhanden
  if [[ -f "$OUT_FILE" ]]; then
    continue
  fi

  # lese de und en aus json
  word_de_and_en="en: $word, de: $(jq -r --arg en "$word" '.[] | select(.en == $en) | .de' vocab/vocab.json)"
  # ersetze sonderzeichen
  word_de_and_en=$(echo "$word_de_and_en" | sed 's/"/\\"/g' | sed "s/'/\\'/g" | tr -d '\n' | tr -d '\r')

  PROMPT="Male ein Bild von '$word_de_and_en'. Hebe es deutlich hervor. Es soll groß mittig, deutlich gezeigt werden für ein Vokabelprogramm. Zeige es in seinem üblichen Kontext."

  REQUEST_FILE="log/image_requests/${WORD_LOWER}.json"
  RESPONSE_FILE="log/image_responses/${WORD_LOWER}.json"

  echo "{
    \"model\": \"$MODEL\",
    \"prompt\": \"$PROMPT\",
    \"n\": 1,
    \"size\": \"$SIZE\"
  }" > "$REQUEST_FILE"

  echo $PROMPT
  echo
done

echo "🏁 Alle neuen Bilder gespeichert in ./img/"

echo "These files are no longer needed and can be deleted to save space:"
for file in img/*; do
  if [[ ! " ${ALL_FILES[*]} " =~ " ${file} " ]]; then
    echo "$file"
  fi
done