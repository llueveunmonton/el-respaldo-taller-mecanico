"use client";

import { useEffect, useRef, useState } from "react";

type EngineState = "broken" | "starting" | "failed" | "repairing" | "fixed";
type PartId = "head" | "piston" | "crankshaft" | "gears" | "belt" | "bolts";
type SoundKey = "click" | "metalLight000" | "metalLight001" | "metalLight002" | "latch";

const soundFiles: Record<SoundKey, string> = {
  click: "/audio/metal-click.ogg",
  metalLight000: "/audio/metal-light-000.ogg",
  metalLight001: "/audio/metal-light-001.ogg",
  metalLight002: "/audio/metal-light-002.ogg",
  latch: "/audio/metal-latch.ogg",
};

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
  const audioDataRef = useRef<Partial<Record<SoundKey, ArrayBuffer>>>({});
  const audioPromisesRef = useRef<Partial<Record<SoundKey, Promise<ArrayBuffer | null>>>>({});
  const audioBuffersRef = useRef<Partial<Record<SoundKey, AudioBuffer>>>({});
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const audioGenerationRef = useRef(0);
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
    const storedSound = window.localStorage.getItem("el-respaldo-sound");
    if (storedSound !== null) setSoundEnabled(storedSound === "on");
    if (storedSound !== "off") {
      Object.entries(soundFiles).forEach(([key, source]) => {
        const soundKey = key as SoundKey;
        audioPromisesRef.current[soundKey] = fetch(source).then(async (response) => response.ok ? response.arrayBuffer() : null).catch(() => null);
        void audioPromisesRef.current[soundKey]?.then((data) => { if (data) audioDataRef.current[soundKey] = data; });
      });
    }
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
    audioGenerationRef.current += 1;
    activeSourcesRef.current.forEach((source) => {
      try { source.stop(); } catch { /* source already ended */ }
      try { source.disconnect(); } catch { /* source already disconnected */ }
    });
    activeSourcesRef.current = [];
    if (audioContextRef.current?.state === "running") void audioContextRef.current.suspend();
  };

  const getAudioBuffer = async (key: SoundKey, context: AudioContext) => {
    if (audioBuffersRef.current[key]) return audioBuffersRef.current[key];
    const data = audioDataRef.current[key] ?? await audioPromisesRef.current[key];
    if (!data) return null;
    try {
      const buffer = await context.decodeAudioData(data.slice(0));
      audioBuffersRef.current[key] = buffer;
      return buffer;
    } catch {
      return null;
    }
  };

  const playSound = (kind: "broken" | "start" | "diagnostic" | "fixed") => {
    if (!soundEnabled) return;
    stopSounds();
    const context = ensureAudioContext();
    if (!context || !masterGainRef.current) return;
    void context.resume();
    const generation = audioGenerationRef.current;
    const sequence = kind === "start"
      ? [["click", 0, .1, .42, -.1], ["metalLight000", .1, .31, .7, 0], ["metalLight001", .46, .28, .62, -.08], ["metalLight002", .82, .3, .66, .08], ["click", 1.2, .12, .48, .04]]
      : kind === "diagnostic"
        ? [["click", 0, .12, .36, -.3], ["latch", .34, .16, .5, .22], ["metalLight001", .68, .16, .42, .25], ["click", .98, .12, .36, -.2], ["latch", 1.24, .16, .46, -.28], ["metalLight002", 1.58, .19, .48, .28], ["click", 1.96, .14, .52, .12]]
        : kind === "fixed"
          ? [["click", 0, .1, .3, 0], ["metalLight000", .13, .34, .48, -.06], ["latch", .52, .18, .3, .06], ["metalLight001", .75, .42, .24, .1]]
          : [["metalLight000", 0, .16, .35, 0]];
    sequence.forEach(([key, start, duration, volume, pan]) => {
      void (async () => {
        const buffer = await getAudioBuffer(key as SoundKey, context);
        if (!buffer || generation !== audioGenerationRef.current || !masterGainRef.current) return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        const panner = context.createStereoPanner();
        const now = context.currentTime;
        source.buffer = buffer;
        gain.gain.setValueAtTime(.001, now + (start as number));
        gain.gain.linearRampToValueAtTime(volume as number, now + (start as number) + .008);
        gain.gain.linearRampToValueAtTime(.001, now + (start as number) + (duration as number));
        panner.pan.value = pan as number;
        source.connect(gain).connect(panner).connect(masterGainRef.current);
        source.onended = () => {
          activeSourcesRef.current = activeSourcesRef.current.filter((activeSource) => activeSource !== source);
          try { source.disconnect(); gain.disconnect(); panner.disconnect(); } catch { /* cleanup is best effort */ }
        };
        activeSourcesRef.current.push(source);
        source.start(now + (start as number));
        source.stop(now + (start as number) + (duration as number) + .02);
      })();
    });
  };

  const vibrate = (pattern: number | number[]) => {
    if (reducedMotion || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch { /* vibration is optional */ }
  };

  const startAttempt = () => {
    if (engineState !== "broken") return;
    setSelectedPart(null);
    setEngineState("starting");
    playSound("start");
    vibrate([35, 50, 35]);
    completeTimerRef.current = window.setTimeout(() => setEngineState("failed"), 1200);
  };

  const startRepair = () => {
    if (engineState !== "failed" || isCalling) return;
    setSelectedPart(null);
    setIsCalling(true);
    vibrate([25, 40, 25]);
    completeTimerRef.current = window.setTimeout(() => {
      setIsCalling(false);
      setEngineState("repairing");
      playSound("diagnostic");
      completeTimerRef.current = window.setTimeout(() => {
        setEngineState("fixed");
        playSound("fixed");
        vibrate(60);
      }, reducedMotion ? 1000 : 2400);
    }, 700);
  };

  const resetEngine = () => {
    if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
    stopSounds();
    setIsCalling(false);
    setSelectedPart(null);
    setEngineState("broken");
    playSound("broken");
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
  const liveMessage = engineState === "broken" ? "Motor roto. Tocá Intentá arrancar para iniciar la historia." : engineState === "starting" ? "Intento de arranque en curso." : isCalling ? "Llamando al respaldo. El botón está deshabilitado." : engineState === "failed" ? "El motor no arranca. Tocá Reparar para iniciar la reparación." : engineState === "repairing" ? "Reparando. Las piezas están volviendo a su lugar." : "Listo. Ahora responde. Tocá Pedí tu diagnóstico para abrir WhatsApp.";

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
