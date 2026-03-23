export function playSound(name) {
    const audio = new Audio(`assets/audio/${name}.mp3`);
    audio.play().catch(() => {
    });
}

export function playVoice(word) {
    const voices = ["alloy", "ash", "coral", "nova", "onyx"];
    const pick = voices[Math.floor(Math.random() * voices.length)];

    const safe = word.toLowerCase().replaceAll(/[^a-z0-9]/g, "_");
    const audio = new Audio(`assets/audio/voice/${safe}_${pick}.mp3`);
    audio.play().catch(() => {
    });
    return audio;
}
