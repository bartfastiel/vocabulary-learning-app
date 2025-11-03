#!/bin/bash

source ./env.sh

MODEL="dall-e-3"
SIZE="1024x1024"

mkdir -p img
mkdir -p log/image_requests
mkdir -p log/image_responses

# Alle Vokabeln mit allowImage=true extrahieren
mapfile -t IMAGE_WORDS < <(jq -r '.[] | select(.allowImage == true) | .en' vocab/vocab.json | sort)

ALL_FILES=()

for word in "${IMAGE_WORDS[@]}"; do
  word=$(echo "$word" | tr -d '\r\n')
  WORD_LOWER=$(printf "%s" "$word" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '_')
  OUT_FILE="assets/img/${WORD_LOWER}.png"
  ALL_FILES+=("$OUT_FILE")

  # Wenn Bild bereits existiert, überspringen
  if [[ -f "$OUT_FILE" ]]; then
    continue
  fi

  # Wenn kein Bild vorhanden → allowImage auf false setzen
  echo "⚠️  Kein Bild vorhanden für '$word' → allowImage=false"
  tmpfile=$(mktemp)
  jq --arg en "$word" 'map(if .en == $en then .allowImage = false else . end)' vocab/vocab.json > "$tmpfile" && mv "$tmpfile" vocab/vocab.json
done

echo "✅ Alle fehlenden Bilder wurden auf allowImage=false gesetzt."
