"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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
  head: { name: "Tapa de cilindros", description: "Una holgura arriba puede ser la señal de que algo no está sellando bien." },
  piston: { name: "Pistones", description: "Revisamos su recorrido para que la fuerza se reparta como corresponde." },
  crankshaft: { name: "Cigüeñal", description: "Convierte el movimiento del motor en la fuerza que mueve tu auto." },
  gears: { name: "Engranajes", description: "La sincronización correcta hace que cada parte llegue a tiempo." },
  belt: { name: "Correa de distribución", description: "Una correa con juego puede hacer ruido y perder precisión." },
  bolts: { name: "Tornillos", description: "Cada fijación tiene un lugar y un torque. Nada queda librado al azar." },
};

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
    <div className="studio-heading"><p>Mecánica automotriz</p><h1 id="hero-title">El Respaldo</h1></div>
    <div className="engine-art" role="group" aria-label={`Motor interactivo: ${engineState === "fixed" ? "reparado y armado" : "desarmado para diagnóstico"}`}>
      <div className="engine-visual" aria-hidden="true">
        <Image className="engine-render engine-render-broken" src="/images/engine-exploded.webp" width={1536} height={1024} alt="" priority sizes="(max-width: 650px) 100vw, (max-width: 1100px) 80vw, 1020px" quality={85} />
        <Image className="engine-render engine-render-fixed" src="/images/engine-assembled.webp" width={1536} height={1024} alt="" priority sizes="(max-width: 650px) 100vw, (max-width: 1100px) 80vw, 1020px" quality={85} />
        <div className="engine-scan" />
      </div>
      <div className="engine-hotspots">
        {(Object.keys(partInfo) as PartId[]).map((id) => <button key={id} type="button" className={`engine-hotspot hotspot-${id} ${selectedPart === id ? "is-selected" : ""}`} aria-label={`Conocer ${partInfo[id].name}`} aria-pressed={selectedPart === id} disabled={engineState === "starting" || engineState === "repairing" || isCalling} onClick={() => setSelectedPart(selectedPart === id ? null : id)} />)}
      </div>
      {activePart && <div className="part-popover" role="region" aria-label="Detalle de pieza"><small>{activePart.name}</small><p>{activePart.description}</p><button type="button" onClick={() => setSelectedPart(null)} aria-label="Cerrar detalle de pieza">×</button></div>}
      {engineState === "fixed" && <span className="engine-ready" aria-hidden="true">✓</span>}
    </div>
    <div className="engine-copy" aria-live="polite"><p className="engine-eyebrow"><span />{story.eyebrow}</p><h2>{story.title}</h2><p className="engine-subcopy">{story.subcopy}</p><span className="engine-state-label">{story.label}</span></div>
    <p className="engine-live" role="status">{liveMessage}</p>
    <div className="engine-actions"><button type="button" className="primary-cta engine-action" disabled={engineState === "starting" || isCalling || engineState === "repairing"} onClick={handleAction}><span className="cta-icon" aria-hidden="true">{engineState === "fixed" ? "▣" : engineState === "starting" || isCalling || engineState === "repairing" ? "◌" : "⌁"}</span>{actionLabel}<span className="arrow" aria-hidden="true">↗</span></button><div className="engine-tools"><button type="button" className="sound-toggle" aria-label={soundEnabled ? "Silenciar sonido" : "Activar sonido"} aria-pressed={soundEnabled} onClick={() => { const nextValue = !soundEnabled; setSoundEnabled(nextValue); window.localStorage.setItem("el-respaldo-sound", nextValue ? "on" : "off"); if (!nextValue) stopSounds(); }}>{soundEnabled ? "SONIDO ON" : "SONIDO OFF"}</button>{engineState === "fixed" && <button type="button" className="reset-button" onClick={resetEngine}>Repetir historia</button>}</div></div>
    <p className="engine-hint">{story.hint}</p>
  </div>;
}
