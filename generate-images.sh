#!/bin/bash

# OpenAI API Key laden
source ./env.sh

MODEL="dall-e-3"
SIZE="1024x1024"

mkdir -p img
mkdir -p log/image_requests
mkdir -p log/image_responses

# Alle Vokabeln mit allowImage=true extrahieren
mapfile -t IMAGE_WORDS < <(jq -r '.[] | select(.allowImage == true) | .en' vocab.json)

for word in "${IMAGE_WORDS[@]}"; do
  WORD_LOWER=$(echo "$word" | tr '[:upper:]' '[:lower:]')
  OUT_FILE="img/${WORD_LOWER}.png"

  # Skip, wenn Bild bereits vorhanden
  if [[ -f "$OUT_FILE" ]]; then
    echo "⏩ Bild existiert bereits: $OUT_FILE"
    continue
  fi

  echo "🎨 Erzeuge Bild für: $word"

  PROMPT="Male ein Bild von '$word'. Hebe es deutlich hervor. Es soll groß mittig, deutlich gezeigt werden für ein Vokabelprogramm. Zeige es in seinem üblichen Kontext."

  REQUEST_FILE="log/image_requests/${WORD_LOWER}.json"
  RESPONSE_FILE="log/image_responses/${WORD_LOWER}.json"

  echo "{
    \"model\": \"$MODEL\",
    \"prompt\": \"$PROMPT\",
    \"n\": 1,
    \"size\": \"$SIZE\"
  }" > "$REQUEST_FILE"

  curl -s https://api.openai.com/v1/images/generations \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d @"$REQUEST_FILE" \
    -o "$RESPONSE_FILE"

  IMAGE_URL=$(jq -r '.data[0].url // empty' "$RESPONSE_FILE")

  if [[ -n "$IMAGE_URL" ]]; then
    curl -sL "$IMAGE_URL" -o "$OUT_FILE"
    echo "✅ Gespeichert: $OUT_FILE"
  else
    echo "⚠️ Fehler: Keine Bild-URL für $word"
    echo "$word" >> log/image_errors.txt
    rm -f "$OUT_FILE"
  fi

  sleep 1
done

echo "🏁 Alle neuen Bilder gespeichert in ./img/"
