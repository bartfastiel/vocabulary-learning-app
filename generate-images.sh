#!/bin/bash

# API-Key sicher in env.sh ausgelagert
source ./env.sh

# Modell und Bildgröße
MODEL="dall-e-3"
SIZE="1024x1024"

# Verzeichnisse
mkdir -p img
mkdir -p log/requests
mkdir -p log/responses

VOCABS=(
  house tree car water dog cat book chair table street
  fish bird flower sky sun moon school friend bread apple
)

for word in "${VOCABS[@]}"; do
  IMAGE_PATH="img/${word}.png"

  # ❎ Überspringen, wenn Bild schon existiert
  if [[ -f "$IMAGE_PATH" ]]; then
    echo "⏩ Bild für '$word' existiert bereits – übersprungen."
    continue
  fi

  echo "🎨 Erzeuge Bild für: $word"

  PROMPT="Male ein Bild von '$word'. Hebe es deutlich hervor. Es soll groß mittig, deutlich gezeigt werden für ein Vokabelprogramm. Zeige es in seinem üblichen Kontext."

  REQUEST_FILE="log/requests/${word}.json"
  RESPONSE_FILE="log/responses/${word}.json"

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
    curl -sL "$IMAGE_URL" -o "$IMAGE_PATH"
    echo "✅ Gespeichert: $IMAGE_PATH"
  else
    echo "⚠️ Fehler: Keine Bild-URL für $word"
    echo "$word" >> log/errors.txt
  fi

  sleep 1
done

echo "🏁 Fertig. Alle neuen Bilder unter ./img/"
