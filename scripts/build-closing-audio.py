"""Build the repaired-engine closing cue from the existing licensed recording.

Run manually with Python, numpy, scipy and ffmpeg installed. This is an asset
authoring helper; the website build does not run it or need these dependencies.
"""

from pathlib import Path
import subprocess
import tempfile

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100


def decode(path):
    result = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le",
        "-ac", "2", "-ar", str(RATE), "-",
    ])
    return np.frombuffer(result, dtype="<f4").reshape(-1, 2).copy()


def fade(samples, attack=.018, release=.085):
    result = samples.copy()
    a, r = min(len(result), int(attack * RATE)), min(len(result), int(release * RATE))
    result[:a] *= np.linspace(0, 1, a)[:, None]
    result[-r:] *= np.linspace(1, 0, r)[:, None]
    return result


def make_rev(source, offset, duration, peak_rate):
    t = np.arange(round(duration * RATE)) / RATE
    throttle = np.sin(np.pi * t / duration) ** 1.15
    # Vary playback rate continuously to create a rise and fall in engine RPM.
    positions = offset * RATE + np.cumsum(1 + (peak_rate - 1) * throttle)
    indices = np.arange(len(source))
    result = np.column_stack([
        np.interp(positions, indices, source[:, channel]) for channel in range(2)
    ])
    rms = max(float(np.sqrt(np.mean(result ** 2))), 1e-6)
    result *= .19 / rms
    result *= (.32 + .68 * throttle)[:, None]
    return fade(result, .025, .11)


def make_horn(duration=.16):
    t = np.arange(round(duration * RATE)) / RATE
    result = np.zeros_like(t)
    # A short paired-tone car-horn timbre, authored procedurally.
    for frequency in (440, 554.37):
        for harmonic, level in ((1, 1), (2, .38), (3, .19), (4, .08)):
            result += level * np.sin(2 * np.pi * frequency * harmonic * t)
    result = np.tanh(result * .55)
    result = sosfilt(butter(3, 2900, fs=RATE, output="sos"), result)
    result *= .16 / max(float(np.sqrt(np.mean(result ** 2))), 1e-6)
    return fade(np.column_stack([result, result]), .012, .045)


def main():
    idle = decode(ROOT / "articbay-vehicle-idle-start-190010.mp3")
    start = decode(ROOT / "public/audio/arranque-correcto.mp3")
    rev_one = make_rev(idle, 5, 1.08, 2.15)
    rev_two = make_rev(idle, 10, 1.00, 2.30)
    horn = make_horn()
    first_rev = len(start) / RATE - .14
    second_rev = first_rev + 1.08 + .13
    first_horn = second_rev + 1.00 + .18
    second_horn = first_horn + .16 + .12
    duration = second_horn + .16 + .15
    result = np.zeros((round(duration * RATE), 2), dtype=np.float32)
    for offset, cue in ((0, start), (first_rev, rev_one), (second_rev, rev_two),
                        (first_horn, horn), (second_horn, horn)):
        i = round(offset * RATE)
        result[i:i + len(cue)] += cue
    peak = float(np.max(np.abs(result)))
    if peak > .79:
        result *= .79 / peak
    output = ROOT / "public/audio/motor-reparado-cierre.mp3"
    with tempfile.NamedTemporaryFile(suffix=".f32") as raw:
        result.astype("<f4").tofile(raw.name)
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE),
            "-ac", "2", "-i", raw.name, "-codec:a", "libmp3lame", "-q:a", "4",
            str(output),
        ], check=True)
    print(f"Built {output.name}: {duration:.2f}s, {output.stat().st_size} bytes")
    print(f"Cues: revs {first_rev:.2f}s / {second_rev:.2f}s; horns {first_horn:.2f}s / {second_horn:.2f}s")


if __name__ == "__main__":
    main()
