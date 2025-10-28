#!/bin/bash

# OpenAI API-Key laden
source ./env.sh

MODEL="gpt-4o-mini-tts"
FORMAT="mp3"

mkdir -p audio
mkdir -p log/tts_requests
mkdir -p log/tts_responses

VOCABS=(
  house tree car water dog cat book chair table street
  fish bird flower sky sun moon school friend bread apple
)

VOICES=(alloy coral nova)

for word in "${VOCABS[@]}"; do
  for voice in "${VOICES[@]}"; do
    OUT_FILE="audio/${word}_${voice}.${FORMAT}"

    # Überspringen, wenn Datei existiert
    if [[ -f "$OUT_FILE" ]]; then
      echo "⏩ Audio existiert bereits: $OUT_FILE"
      continue
    fi

    echo "🎤 Erzeuge Sprachdatei: $word | Stimme=$voice"

    REQ_FILE="log/tts_requests/${word}_${voice}.json"
    echo "{
      \"model\": \"$MODEL\",
      \"voice\": \"$voice\",
      \"input\": \"$word\",
      \"response_format\": \"$FORMAT\"
    }" > "$REQ_FILE"

    curl -s https://api.openai.com/v1/audio/speech \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d @"$REQ_FILE" \
      --output "$OUT_FILE"

    # Prüfen auf leere Datei
    if [[ ! -s "$OUT_FILE" ]]; then
      echo "⚠️ Fehler bei $word mit $voice"
      echo "$word $voice" >> log/tts_errors.txt
    else
      echo "✅ Gespeichert: $OUT_FILE"
    fi

    sleep 1
  done
done

echo "🏁 Alle sauberen Wort-Audios unter ./audio/"
