#!/bin/bash

# API-Key sicher laden
source ./env.sh

MODEL="gpt-4o-mini-tts"
FORMAT="mp3"
VOICES=(alloy ash coral nova onyx)

mkdir -p audio log/tts_requests log/tts_responses

jq -r '.[].en' vocab.json | while IFS= read -r word; do
  word=$(echo "$word" | tr -d '\r\n')
  echo "🔤 Verarbeite Wort: >$word<"
  WORD_LOWER=$(printf "%s" "$word" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '_')

  for voice in "${VOICES[@]}"; do
    OUT_FILE="assets/audio/voice/${WORD_LOWER}_${voice}.${FORMAT}"

    # 🔁 Überspringe bereits vorhandene Dateien
    if [[ -f "$OUT_FILE" ]]; then
      echo "⏩ Überspringe $OUT_FILE (bereits vorhanden)"
      continue
    fi

    echo "🎤 Generiere TTS für '$word' mit Stimme '$voice'..."

    REQUEST_FILE="log/tts_requests/${WORD_LOWER}_${voice}.json"
    echo "{
      \"model\": \"$MODEL\",
      \"voice\": \"$voice\",
      \"input\": \"$word\",
      \"response_format\": \"$FORMAT\"
    }" > "$REQUEST_FILE"

    curl -s https://api.openai.com/v1/audio/speech \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d @"$REQUEST_FILE" \
      --output "$OUT_FILE"

    # Prüfe, ob Datei leer (Fehlermeldung oder Timeout)
    if [[ ! -s "$OUT_FILE" ]]; then
      echo "⚠️ Fehler: Keine Ausgabe für $word ($voice)"
      echo "$word $voice" >> log/tts_errors.txt
      rm -f "$OUT_FILE"
    else
      echo "✅ Gespeichert: $OUT_FILE"
    fi

    sleep 1
  done
done

echo "🏁 Fertig. Alle Audios liegen unter ./audio/"
