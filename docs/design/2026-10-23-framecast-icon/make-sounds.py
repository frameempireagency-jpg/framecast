import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
FFMPEG = ROOT / "target/ffmpeg/bin/ffmpeg.exe"
RATE = 48000


def bell(freq: float, length: float, decay: float) -> np.ndarray:
    t = np.arange(int(RATE * length)) / RATE
    partials = ((1.0, 1.0), (2.0, 0.28), (3.01, 0.10), (4.2, 0.04))
    tone = sum(a * np.sin(2 * np.pi * freq * m * t) * np.exp(-t * decay * m**0.6) for m, a in partials)
    attack = np.clip(t / 0.004, 0, 1)
    return tone * attack


def place(total: float, parts: list[tuple[float, np.ndarray]]) -> np.ndarray:
    out = np.zeros(int(RATE * total))
    for at, sig in parts:
        i = int(RATE * at)
        n = min(len(sig), len(out) - i)
        out[i : i + n] += sig[:n]
    return out


def click(length: float, cutoff: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(RATE * length)
    noise = rng.standard_normal(n)
    alpha = np.exp(-2 * np.pi * cutoff / RATE)
    low = np.zeros(n)
    for i in range(1, n):
        low[i] = alpha * low[i - 1] + (1 - alpha) * noise[i]
    t = np.arange(n) / RATE
    return (noise - low) * np.exp(-t * 260)


def finish(sig: np.ndarray, peak_db: float) -> np.ndarray:
    fade = int(RATE * 0.02)
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig / np.max(np.abs(sig)) * 10 ** (peak_db / 20)


def sounds() -> dict[str, np.ndarray]:
    a5, e6, d6 = 880.0, 1318.51, 1174.66
    return {
        "start-recording": finish(place(0.55, [(0.0, bell(a5, 0.5, 9)), (0.11, bell(e6, 0.44, 9))]), -16),
        "stop-recording": finish(place(0.50, [(0.0, bell(e6, 0.45, 10)), (0.10, bell(a5, 0.40, 10))]), -16),
        "screenshot": finish(place(0.30, [(0.0, click(0.06, 2500, 1)), (0.075, 0.7 * click(0.06, 3500, 2)), (0.075, 0.08 * bell(2637.0, 0.2, 30))]), -14),
        "action": finish(place(0.45, [(0.0, bell(d6, 0.45, 8)), (0.0, 0.35 * bell(d6 * 1.5, 0.4, 11))]), -12),
    }


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "apps/desktop/src-tauri/sounds"
    out.mkdir(parents=True, exist_ok=True)
    for name, sig in sounds().items():
        wav = out / f"{name}.wav"
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes((sig * 32767).astype("<i2").tobytes())
        ogg = out / f"{name}.ogg"
        subprocess.run([str(FFMPEG), "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "6", str(ogg)], check=True)
        print("wrote", ogg)


if __name__ == "__main__":
    main()
