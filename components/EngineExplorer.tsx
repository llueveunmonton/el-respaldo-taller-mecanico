"use client";

import { useEffect, useRef, useState } from "react";

type EngineState = "broken" | "starting" | "failed" | "repairing" | "fixed";
type PartId = "head" | "piston" | "crankshaft" | "gears" | "belt" | "bolts";
type SoundKey = "dial" | "failed" | "repair" | "correct";
type AudioPlayback = { element: HTMLAudioElement; gain: GainNode; panner: StereoPannerNode; generation: number };

const soundFiles: Record<SoundKey, string> = {
  dial: "/audio/marcado-telefonico.mp3",
  failed: "/audio/arranque-fallido.mp3",
  repair: "/audio/reparacion.mp3",
  correct: "/audio/arranque-correcto.mp3",
};

const callingDuration = 1000;
const callingFade = 60;

const partInfo: Record<PartId, { name: string; description: string }> = {
  head: { name: "Tapa levantada", description: "Una holgura arriba puede ser la señal de que algo no está sellando bien." },
  piston: { name: "Pistón fuera de nivel", description: "Revisamos su recorrido para que la fuerza se reparta como corresponde." },
  crankshaft: { name: "Cigüeñal", description: "Convierte el movimiento del motor en la fuerza que mueve tu auto." },
  gears: { name: "Engranajes", description: "La sincronización correcta hace que cada parte llegue a tiempo." },
  belt: { name: "Correa floja", description: "Una correa con juego puede hacer ruido y perder precisión." },
  bolts: { name: "Tornillos", description: "Cada fijación tiene un lugar y un torque. Nada queda librado al azar." },
};

function Part({ id, selected, onSelect, children }: { id: PartId; selected: boolean; onSelect: (id: PartId) => void; children: React.ReactNode }) {
  return <g className={`engine-part engine-${id} ${selected ? "is-selected" : ""}`} data-part={id} role="button" tabIndex={0} aria-label={`Conocer ${partInfo[id].name}`} onClick={() => onSelect(id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(id); } }}>{children}</g>;
}

function Gear({ cx, cy, radius, teeth = 10 }: { cx: number; cy: number; radius: number; teeth?: number }) {
  return <g className="doodle-gear" transform={`translate(${cx} ${cy})`}>
    <circle r={radius + 3} className="gear-outline" />
    {Array.from({ length: teeth }).map((_, index) => <rect key={index} x="-2.5" y={-radius - 5} width="5" height="10" rx="1" transform={`rotate(${index * (360 / teeth)})`} className="gear-tooth" />)}
    <circle r={radius - 4} className="gear-face" /><circle r={radius - 14} className="gear-inner" /><circle r="6" className="gear-hole" />
  </g>;
}

export default function EngineExplorer({ whatsappUrl }: { whatsappUrl: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const audioElementsRef = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});
  const audioPlaybackRef = useRef<Partial<Record<SoundKey, AudioPlayback>>>({});
  const audioGenerationRef = useRef(0);
  const transitionLockRef = useRef(false);
  const completeTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const currentPointerRef = useRef({ x: 0, y: 0 });
  const [engineState, setEngineState] = useState<EngineState>("broken");
  const [isCalling, setIsCalling] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartId | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const audioElements = audioElementsRef.current;
    const storedSound = window.localStorage.getItem("el-respaldo-sound");
    if (storedSound !== null) setSoundEnabled(storedSound === "on");
    Object.entries(soundFiles).forEach(([key, source]) => {
      const soundKey = key as SoundKey;
      const audio = new Audio(source);
      audio.preload = "metadata";
      audioElements[soundKey] = audio;
      audio.load();
    });
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(mediaQuery.matches);
    updateMotion();
    mediaQuery.addEventListener("change", updateMotion);

    const stage = stageRef.current;
    if (!stage) return () => mediaQuery.removeEventListener("change", updateMotion);
    const renderPointer = () => {
      const current = currentPointerRef.current;
      const target = pointerRef.current;
      current.x += (target.x - current.x) * 0.1;
      current.y += (target.y - current.y) * 0.1;
      stage.style.setProperty("--pointer-x", current.x.toFixed(3));
      stage.style.setProperty("--pointer-y", current.y.toFixed(3));
      frameRef.current = window.requestAnimationFrame(renderPointer);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reducedMotion) return;
      const bounds = stage.getBoundingClientRect();
      pointerRef.current = {
        x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2)),
        y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2)),
      };
    };
    const resetPointer = () => { pointerRef.current = { x: 0, y: 0 }; };
    const stopWhenHidden = () => { if (document.hidden) stopSounds(); };
    frameRef.current = window.requestAnimationFrame(renderPointer);
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", resetPointer, { passive: true });
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      mediaQuery.removeEventListener("change", updateMotion);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
      stopSounds();
      Object.values(audioElements).forEach((audio) => { audio?.removeAttribute("src"); audio?.load(); });
      if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
    };
    // The motion preference is intentionally read once for the pointer listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureAudioContext = () => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    const context = audioContextRef.current;
    if (!masterGainRef.current) {
      const masterGain = context.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(context.destination);
      masterGainRef.current = masterGain;
    }
    return context;
  };

  const stopSounds = () => {
    const generation = ++audioGenerationRef.current;
    const context = audioContextRef.current;
    const now = context?.currentTime ?? 0;
    Object.values(audioPlaybackRef.current).forEach((playback) => {
      if (!playback) return;
      const { element, gain } = playback;
      const playbackGeneration = playback.generation;
      if (context && !element.paused) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.001), now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
      }
      window.setTimeout(() => {
        if (playback.generation !== playbackGeneration) return;
        element.pause();
        element.currentTime = 0;
      }, 60);
    });
    if (context?.state === "running") window.setTimeout(() => { if (generation === audioGenerationRef.current && context.state === "running") void context.suspend(); }, 75);
  };

  const getAudioPlayback = (key: SoundKey, context: AudioContext) => {
    if (audioPlaybackRef.current[key]) return audioPlaybackRef.current[key];
    const element = audioElementsRef.current[key];
    if (!element || !masterGainRef.current) return null;
    const mediaSource = context.createMediaElementSource(element);
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    gain.gain.value = 0.001;
    mediaSource.connect(gain).connect(panner).connect(masterGainRef.current);
    const playback = { element, gain, panner, generation: 0 };
    audioPlaybackRef.current[key] = playback;
    return playback;
  };

  const playSound = (key: SoundKey, volume = 0.7, pan = 0, offset = 0, duration?: number) => {
    if (!soundEnabled) return;
    stopSounds();
    audioGenerationRef.current += 1;
    const context = ensureAudioContext();
    if (!context || !masterGainRef.current) return;
    const playback = getAudioPlayback(key, context);
    if (!playback) return;
    const generation = audioGenerationRef.current;
    const { element, gain, panner } = playback;
    playback.generation = generation;
    const now = context.currentTime;
    element.pause();
    element.currentTime = offset;
    panner.pan.value = pan;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.035);
    element.onended = () => {
      if (generation !== audioGenerationRef.current) return;
      const endedAt = context.currentTime;
      gain.gain.cancelScheduledValues(endedAt);
      gain.gain.linearRampToValueAtTime(0.001, endedAt + 0.04);
    };
    void context.resume();
    void element.play().then(() => {
      if (generation !== audioGenerationRef.current) {
        element.pause();
        element.currentTime = 0;
      }
    }).catch(() => { /* Audio is optional when the browser blocks playback. */ });
    if (duration !== undefined) {
      window.setTimeout(() => {
        if (generation !== audioGenerationRef.current || playback.generation !== generation) return;
        const fadeAt = context.currentTime;
        gain.gain.cancelScheduledValues(fadeAt);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.001), fadeAt);
        gain.gain.linearRampToValueAtTime(0.001, fadeAt + callingFade / 1000);
        window.setTimeout(() => {
          if (generation !== audioGenerationRef.current || playback.generation !== generation) return;
          element.pause();
          element.currentTime = 0;
        }, callingFade);
      }, Math.max(0, duration - callingFade / 1000) * 1000);
    }
  };

  const vibrate = (pattern: number | number[]) => {
    if (reducedMotion || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch { /* vibration is optional */ }
  };

  const startAttempt = () => {
    if (transitionLockRef.current || engineState !== "broken") return;
    transitionLockRef.current = true;
    setSelectedPart(null);
    setEngineState("starting");
    playSound("failed", 0.72);
    vibrate([35, 50, 35]);
    completeTimerRef.current = window.setTimeout(() => {
      transitionLockRef.current = false;
      setEngineState("failed");
    }, 3200);
  };

  const startRepair = () => {
    if (transitionLockRef.current || engineState !== "failed" || isCalling) return;
    transitionLockRef.current = true;
    setSelectedPart(null);
    setIsCalling(true);
    playSound("dial", 0.42, 0, 0, callingDuration / 1000);
    vibrate([25, 40, 25]);
    completeTimerRef.current = window.setTimeout(() => {
      stopSounds();
      completeTimerRef.current = window.setTimeout(() => {
        setIsCalling(false);
        setEngineState("repairing");
        playSound("repair", 0.78, 0.02);
        completeTimerRef.current = window.setTimeout(() => {
          transitionLockRef.current = false;
          setEngineState("fixed");
          playSound("correct", 0.72);
          vibrate(60);
        }, 2400);
      }, callingFade);
    }, callingDuration);
  };

  const resetEngine = () => {
    if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
    transitionLockRef.current = false;
    stopSounds();
    setIsCalling(false);
    setSelectedPart(null);
    setEngineState("broken");
  };

  const handleAction = () => {
    if (engineState === "broken") startAttempt();
    else if (engineState === "failed" && !isCalling) startRepair();
    else if (engineState === "fixed") window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const activePart = selectedPart ? partInfo[selectedPart] : null;
  const story = {
    broken: { eyebrow: "Hay días que empiezan así.", title: "Tu auto no arranca.", subcopy: "Probás una vez. Otra. Y nada.", hint: "Tocá para escuchar qué pasa", label: "01 / Roto" },
    starting: { eyebrow: "Intentemos una vez.", title: "A ver si responde.", subcopy: "Un intento más. Escuchá con atención.", hint: "", label: "01 / Arranque" },
    failed: { eyebrow: "Era por ahí.", title: "No arranca. No insistas.", subcopy: "Primero hay que entender qué está pasando.", hint: "", label: "02 / Fallo" },
    repairing: { eyebrow: "El Respaldo ya está en eso.", title: "Primero entendemos.", subcopy: "Revisamos. Diagnosticamos. Reparamos.", hint: "", label: "03 / Reparación" },
    fixed: { eyebrow: "Después de pasar por El Respaldo.", title: "Listo. Ahora responde.", subcopy: "Primero entendimos qué pasaba. Después lo arreglamos.", hint: "", label: "04 / Responde" },
  }[engineState];
  const actionLabel = engineState === "broken" ? "INTENTÁ ARRANCAR" : engineState === "starting" ? "INTENTANDO…" : isCalling ? "LLAMANDO AL RESPALDO…" : engineState === "failed" ? "REPARAR" : engineState === "repairing" ? "REPARANDO…" : "PEDÍ TU DIAGNÓSTICO";
  const liveMessage = engineState === "broken" ? "Motor roto. Tocá Intentá arrancar para iniciar la historia." : engineState === "starting" ? "Intento de arranque en curso." : isCalling ? "Llamando al respaldo. El botón está deshabilitado." : engineState === "failed" ? "NO ARRANCA. NO INSISTAS. Tocá Reparar para iniciar la reparación." : engineState === "repairing" ? "Reparando. Las piezas están volviendo a su lugar." : "LISTO. AHORA RESPONDE. Tocá Pedí tu diagnóstico para abrir WhatsApp.";

  return <div className={`engine-experience state-${engineState}`} ref={stageRef} style={{ "--pointer-x": "0", "--pointer-y": "0" } as React.CSSProperties}>
    <div className="engine-glow" aria-hidden="true" />
    <svg className={`engine-svg engine-svg-${engineState}`} viewBox="0 0 420 480" role="group" aria-label={`Motor doodle interactivo, estado ${engineState}`}>
      <defs>
        <filter id="engine-glow"><feGaussianBlur stdDeviation="5" /></filter>
        <linearGradient id="doodle-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f2ede3" /><stop offset=".5" stopColor="#6d6a68" /><stop offset="1" stopColor="#17181b" /></linearGradient>
      </defs>
      <g className="engine-layer engine-smoke smoke" aria-hidden="true"><path d="M327 113 C303 94 342 76 319 52 C297 31 342 23 325 4" /><path d="M94 174 C67 155 98 132 80 112" /></g>
      <g className="engine-layer engine-orbit" aria-hidden="true"><ellipse cx="213" cy="285" rx="174" ry="169" /><path d="M36 284 C72 161 326 140 389 274" /></g>

      <Part id="head" selected={selectedPart === "head"} onSelect={setSelectedPart}><g className="head-cover"><path d="M91 118 L117 88 Q121 83 132 83 H291 Q304 83 310 91 L335 119 L326 167 H98Z" fill="url(#doodle-metal)" /><path d="M106 118 H326 M118 100 H298" /><path d="M137 88 V154 M181 85 V157 M225 85 V157 M269 86 V157" className="metal-detail" />{[136,181,226,271].map((x) => <g key={x}><ellipse cx={x} cy="112" rx="14" ry="8" className="port" /><circle cx={x} cy="112" r="4" /></g>)}</g></Part>

      <g className="engine-layer engine-block"><path d="M104 171 Q105 154 123 154 H300 Q318 154 321 172 L330 330 Q327 348 307 352 H112 Q93 348 92 330Z" fill="#17191c" stroke="#f2ede3" strokeWidth="3" /><path d="M112 181 H310 M109 315 H319" className="block-detail" /><path d="M127 190 V296 M173 190 V296 M219 190 V296 M265 190 V296" className="cylinder" /></g>

      <Part id="piston" selected={selectedPart === "piston"} onSelect={setSelectedPart}><g className="engine-layer engine-pistons pistons"><g className="piston piston-1"><path d="M119 190 H162 L159 226 Q142 235 123 226Z" fill="#ffd21c" /><path d="M126 225 L130 290 H153 L158 225" fill="url(#doodle-metal)" /><ellipse cx="142" cy="291" rx="14" ry="7" /></g><g className="piston piston-2"><path d="M166 190 H207 L204 226 Q187 235 170 226Z" fill="url(#doodle-metal)" /><path d="M173 225 L177 290 H200 L204 225" fill="url(#doodle-metal)" /><ellipse cx="189" cy="291" rx="14" ry="7" /></g><g className="piston piston-3"><path d="M213 190 H254 L251 226 Q234 235 217 226Z" fill="url(#doodle-metal)" /><path d="M220 225 L224 290 H247 L251 225" fill="url(#doodle-metal)" /><ellipse cx="236" cy="291" rx="14" ry="7" /></g></g></Part>

      <Part id="crankshaft" selected={selectedPart === "crankshaft"} onSelect={setSelectedPart}><g className="engine-layer engine-crankshaft lower-pulleys"><path d="M101 324 Q139 299 174 323 T244 323 T314 323" fill="none" stroke="#f2ede3" strokeWidth="15" strokeLinecap="round" /><path d="M101 324 Q139 299 174 323 T244 323 T314 323" fill="none" stroke="#3d3a3c" strokeWidth="8" strokeLinecap="round" />{[122,182,242,302].map((x, index) => <g key={x} transform={`translate(${x} ${index % 2 ? 314 : 332})`}><circle r="23" fill="url(#doodle-metal)" /><circle r="12" fill="#101114" stroke="#f2ede3" strokeWidth="2" /><circle r="4" fill="#ffd21c" /></g>)}</g></Part>

      <Part id="gears" selected={selectedPart === "gears"} onSelect={setSelectedPart}><g className="engine-layer engine-gears right-gears"><Gear cx={306} cy={187} radius={30} teeth={12} /><Gear cx={331} cy={252} radius={25} teeth={10} /><Gear cx={299} cy={318} radius={20} teeth={9} /></g></Part>

      <Part id="belt" selected={selectedPart === "belt"} onSelect={setSelectedPart}><g className="engine-layer engine-belt belt"><path d="M306 158 C370 163 372 266 326 335 C310 358 292 340 306 313 C335 258 342 191 306 158Z" className="belt-loose" /><path d="M306 160 C337 182 345 264 316 319" className="belt-tight" /></g></Part>

      <Part id="bolts" selected={selectedPart === "bolts"} onSelect={setSelectedPart}><g className="engine-layer engine-bolts bolts">{[{ x: 67, y: 142 }, { x: 352, y: 125 }, { x: 53, y: 280 }, { x: 365, y: 316 }, { x: 75, y: 360 }, { x: 340, y: 385 }].map(({ x, y }) => <g key={`${x}-${y}`} className="loose-bolt" transform={`translate(${x} ${y}) rotate(25)`}><path d="M-10 0 H10 M0-10 V10" /><circle r="6" fill="url(#doodle-metal)" /></g>)}</g></Part>

      <g className="engine-layer engine-base"><path d="M119 355 H304 L288 389 Q284 398 272 399 H149 Q137 398 133 389Z" fill="url(#doodle-metal)" /><path d="M136 371 H290" /></g>
      <path className="diagnostic-line scan-line" d="M54 80 V409" aria-hidden="true" />
      <path className="energy-pulse" d="M103 342 H316" aria-hidden="true" />
      <g className="repair-check status-check" aria-hidden="true"><circle cx="354" cy="76" r="25" /><path d="m342 76 8 8 16-18" /></g>
    </svg>

    <div className="engine-copy" aria-live="polite"><p className="engine-eyebrow"><span />{story.eyebrow}</p><h1 id="hero-title">{story.title}</h1><p className="engine-subcopy">{story.subcopy}</p><span className="engine-state-label">{story.label}</span>{activePart && <div className="part-popover"><small>{activePart.name}</small><p>{activePart.description}</p><button type="button" onClick={() => setSelectedPart(null)} aria-label="Cerrar detalle de pieza">×</button></div>}</div>
    <p className="engine-live" role="status">{liveMessage}</p>
    <div className="engine-actions"><button type="button" className="primary-cta engine-action" disabled={engineState === "starting" || isCalling || engineState === "repairing"} onClick={handleAction}><span className="cta-icon" aria-hidden="true">{engineState === "fixed" ? "▣" : engineState === "starting" || isCalling || engineState === "repairing" ? "◌" : "⌁"}</span>{actionLabel}<span className="arrow" aria-hidden="true">↗</span></button><div className="engine-tools"><button type="button" className="sound-toggle" aria-label={soundEnabled ? "Silenciar sonido" : "Activar sonido"} aria-pressed={soundEnabled} onClick={() => { const nextValue = !soundEnabled; setSoundEnabled(nextValue); window.localStorage.setItem("el-respaldo-sound", nextValue ? "on" : "off"); if (!nextValue) stopSounds(); }}>{soundEnabled ? "SONIDO ON" : "SONIDO OFF"}</button>{engineState === "fixed" && <button type="button" className="reset-button" onClick={resetEngine}>Repetir historia</button>}</div></div>
    <p className="engine-hint">{story.hint}</p>
  </div>;
}
