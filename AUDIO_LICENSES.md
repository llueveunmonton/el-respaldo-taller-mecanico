# Audio licenses

The original downloads are kept in the project root. The four files served by
the site are trimmed, normalized and locally encoded derivatives. They are not
requested from a third-party host at runtime.

All four source downloads are published on Pixabay under the Pixabay Content License:
https://pixabay.com/service/license-summary/

## Sources and derivatives

- `freesound_community-dialing-numbers-7025.mp3` — **Dialing Numbers**, author credited by filename as `freesound_community`. Source: https://pixabay.com/sound-effects/dialing-numbers-7025/
  - `public/audio/marcado-telefonico.mp3`: source beginning through `1.05 s`, preserving the pauses between tones, with short fades and loudness normalization. Final duration: `1.05 s`.
- `freesound_community-056152_car_engine_won39t-startwav-92999.mp3` — **Car Engine Won't Start**, author credited by filename as `freesound_community`. Source: https://pixabay.com/sound-effects/056152-car-engine-won39t-startwav-92999/
  - `public/audio/arranque-fallido.mp3`: source `00:00.52–00:03.72`, with leading/trailing silence removal, short fades and loudness normalization. Final duration: `3.11 s`.
- `fronbondi_skegs-foley-ratcheted-socket-wrench-on-a-bolt-sound-effect-9904.mp3` — **Foley: Ratcheted Socket Wrench on a Bolt Sound Effect**, author credited by filename as `fronbondi_skegs`. Source: https://pixabay.com/sound-effects/foley-ratcheted-socket-wrench-on-a-bolt-sound-effect-9904/
  - `public/audio/reparacion.mp3`: six clean source excerpts arranged at `0.00 s`, `0.43 s`, `0.82 s`, `1.18 s`, `1.49 s` and `1.90 s` for the lid, bolts, pistons, belt, gears and final adjustment. Final duration: `2.40 s`.
- `articbay-vehicle-idle-start-190010.mp3` — **Vehicle Idle Start**, author credited by filename as `articbay`. Source: https://pixabay.com/sound-effects/vehicle-idle-start-190010/
  - `public/audio/arranque-correcto.mp3`: source beginning through `3.80 s`, with silence removal, short fades and loudness normalization. Final duration: `3.72 s`.

FFmpeg generated the derivatives at 44.1 kHz, with MP3 quality settings chosen
to keep each file below 500 KB. Browser playback applies a short gain fade and
never hotlinks the Pixabay sources.
