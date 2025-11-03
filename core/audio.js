// core/audio.js
//
// This is the ONLY shared helper module.
// It reproduces the exact sound and voice playback behavior
// from the original inline <script> in your HTML version.
//

// === Sound effects (ding / buzz) ===
export function playSound(name) {
    // Expects files "ding.mp3" and "buzz.mp3" in assets/audio/
    const audio = new Audio(`assets/audio/${name}.mp3`);
    audio.play().catch(() => {
    });
}

// === Random voice playback ===
export function playVoice(word) {
    // Same voices and logic as original playRandomVoice(word)
    const voices = ["alloy", "ash", "coral", "nova", "onyx"];
    const pick = voices[Math.floor(Math.random() * voices.length)];

    // identical filename normalization
    const safe = word.toLowerCase().replaceAll(/[^a-z0-9]/g, "_");
    const audio = new Audio(`assets/audio/voice/${safe}_${pick}.mp3`);
    audio.play().catch(() => {
    });
    return audio;
}
