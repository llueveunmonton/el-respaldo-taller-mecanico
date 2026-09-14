"use client";

import { useEffect, useRef, useState } from "react";

type PartId = "block" | "pistons" | "crankshaft" | "timing" | "alternator" | "bolts";

const parts: Record<PartId, { name: string; description: string }> = {
  block: { name: "Tapa de cilindros", description: "El corazón superior del motor: sella, respira y mantiene todo en su lugar." },
  pistons: { name: "Pistones", description: "Transforman la explosión en movimiento. Los revisamos para que trabajen parejos." },
  crankshaft: { name: "Cigüeñal", description: "Convierte el movimiento de los pistones en la fuerza que mueve tu auto." },
  timing: { name: "Distribución", description: "Sincroniza cada ciclo del motor con precisión. Un ajuste a tiempo evita problemas." },
  alternator: { name: "Alternador", description: "Genera la energía que mantiene viva la batería y los sistemas eléctricos." },
  bolts: { name: "Fijaciones", description: "Cada tornillo tiene su torque. La confiabilidad también está en lo que no se ve." },
};

function Part({
  id,
  selected,
  children,
  className = "",
}: {
  id: PartId;
  selected: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const label = parts[id].name;
  return (
    <g
      className={`engine-part ${className} ${selected ? "is-selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`Ver información sobre ${label}`}
      data-part={id}
    >
      {children}
    </g>
  );
}

function Gear({ cx, cy, radius, teeth = 10 }: { cx: number; cy: number; radius: number; teeth?: number }) {
  return (
    <g className="gear" transform={`translate(${cx} ${cy})`}>
      <circle r={radius} className="gear-shadow" />
      <circle r={radius - 5} className="gear-face" />
      <circle r={radius - 13} className="gear-inner" />
      {Array.from({ length: teeth }).map((_, index) => {
        const angle = (index / teeth) * 360;
        return <rect key={angle} x={-2.5} y={-radius - 2} width={5} height={8} rx={1} transform={`rotate(${angle})`} className="gear-tooth" />;
      })}
      <circle r={5} className="gear-hole" />
    </g>
  );
}

export default function EngineExplorer() {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const [selected, setSelected] = useState<PartId | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const render = () => {
      const current = currentRef.current;
      const target = targetRef.current;
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;
      stage.style.setProperty("--pointer-x", current.x.toFixed(3));
      stage.style.setProperty("--pointer-y", current.y.toFixed(3));
      frameRef.current = requestAnimationFrame(render);
    };
    frameRef.current = requestAnimationFrame(render);

    const onScroll = () => {
      const bounds = stage.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (window.innerHeight * 0.72 - bounds.top) / (bounds.height + window.innerHeight * 0.55)));
      stage.style.setProperty("--scroll-progress", progress.toFixed(3));
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = stage.getBoundingClientRect();
      targetRef.current = {
        x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2)),
        y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2)),
      };
    };
    const onPointerLeave = () => { targetRef.current = { x: 0, y: 0 }; };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as SVGElement;
      const part = target.dataset.part as PartId | undefined;
      if (part && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        setSelected(part);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", onPointerLeave, { passive: true });
    stage.addEventListener("keydown", onKeyDown);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      stage.removeEventListener("keydown", onKeyDown);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const selectPart = (id: PartId) => setSelected((value) => value === id ? null : id);
  const active = selected ? parts[selected] : null;

  return (
    <div className="engine-explorer" ref={stageRef} style={{ "--pointer-x": "0", "--pointer-y": "0", "--scroll-progress": "0" } as React.CSSProperties}>
      <div className="engine-glow" aria-hidden="true" />
      <svg className="engine-svg" viewBox="0 0 800 700" role="img" aria-label="Motor explotado interactivo: tocá una pieza para conocerla" onClick={(event) => {
        const target = event.target as SVGElement;
        const part = target.closest("[data-part]")?.getAttribute("data-part") as PartId | null;
        if (part) selectPart(part);
      }}>
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef1ed" /><stop offset=".22" stopColor="#737a7a" /><stop offset=".48" stopColor="#22272a" /><stop offset=".73" stopColor="#c5c8c1" /><stop offset="1" stopColor="#404648" /></linearGradient>
          <linearGradient id="metalDark" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#5f686a" /><stop offset=".5" stopColor="#171b1f" /><stop offset="1" stopColor="#808486" /></linearGradient>
          <linearGradient id="goldMetal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff08c" /><stop offset=".3" stopColor="#ffc900" /><stop offset=".65" stopColor="#8f6900" /><stop offset="1" stopColor="#ffd21c" /></linearGradient>
          <filter id="softGlow"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="smallShadow"><feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#000" floodOpacity=".55" /></filter>
        </defs>

        <g className="engine-layer layer-back" style={{ "--layer-depth": "0.35" } as React.CSSProperties}>
          <circle cx="400" cy="352" r="286" className="orbit" />
          <circle cx="400" cy="352" r="236" className="orbit orbit-inner" />
          <path d="M111 340 C185 198 640 148 707 342 C630 494 180 514 111 340Z" className="orbit-path" />
        </g>

        <Part id="block" selected={selected === "block"} className="engine-layer layer-block">
          <path d="M176 168 L204 125 Q211 114 227 114 H547 Q562 114 572 126 L623 184 L603 278 H205 Z" fill="url(#metal)" stroke="#11161a" strokeWidth="7" filter="url(#smallShadow)" />
          <path d="M194 174 H603 M213 201 H593 M239 122 V255 M316 119 V250 M393 119 V250 M470 119 V250 M547 125 V250" className="metal-line" />
          {[235, 312, 389, 466, 543].map((x) => <g key={x}><ellipse cx={x} cy="163" rx="25" ry="15" className="port" /><circle cx={x} cy="163" r="7" className="port-hole" /></g>)}
          {[217, 287, 357, 427, 497, 575].map((x) => <circle key={x} cx={x} cy="229" r="7" className="bolt" />)}
          <path d="M199 266 L606 266" stroke="#ffd21c" strokeOpacity=".7" strokeWidth="3" strokeDasharray="5 8" />
        </Part>

        <Part id="pistons" selected={selected === "pistons"} className="engine-layer layer-pistons">
          <g className="piston piston-highlight"><path d="M235 281 H284 L278 337 Q259 348 241 337Z" fill="url(#goldMetal)" stroke="#121619" strokeWidth="5" /><path d="M241 337 L250 432 H271 L278 337" fill="url(#goldMetal)" stroke="#121619" strokeWidth="5" /><ellipse cx="260" cy="432" rx="18" ry="10" fill="#161b1d" stroke="#c48e00" strokeWidth="4" /><path d="M236 296 H283 M237 306 H281" stroke="#4a3900" strokeWidth="3" /></g>
          <g className="piston"><path d="M315 281 H360 L355 338 Q338 348 320 338Z" fill="url(#metal)" stroke="#121619" strokeWidth="5" /><path d="M321 338 L330 432 H350 L355 338" fill="url(#metal)" stroke="#121619" strokeWidth="5" /><ellipse cx="340" cy="432" rx="17" ry="10" fill="#161b1d" stroke="#8b9695" strokeWidth="4" /><path d="M316 296 H359 M317 306 H357" stroke="#252b2d" strokeWidth="3" /></g>
          <g className="piston"><path d="M395 281 H440 L435 338 Q418 348 400 338Z" fill="url(#metal)" stroke="#121619" strokeWidth="5" /><path d="M401 338 L410 432 H430 L435 338" fill="url(#metal)" stroke="#121619" strokeWidth="5" /><ellipse cx="420" cy="432" rx="17" ry="10" fill="#161b1d" stroke="#8b9695" strokeWidth="4" /><path d="M396 296 H439 M397 306 H437" stroke="#252b2d" strokeWidth="3" /></g>
          <g className="piston"><path d="M475 281 H520 L515 338 Q498 348 480 338Z" fill="url(#metal)" stroke="#121619" strokeWidth="5" /><path d="M481 338 L490 432 H510 L515 338" fill="url(#metal)" stroke="#121619" strokeWidth="5" /><ellipse cx="500" cy="432" rx="17" ry="10" fill="#161b1d" stroke="#8b9695" strokeWidth="4" /><path d="M476 296 H519 M477 306 H517" stroke="#252b2d" strokeWidth="3" /></g>
        </Part>

        <Part id="crankshaft" selected={selected === "crankshaft"} className="engine-layer layer-crankshaft">
          <path d="M179 475 C221 446 244 484 282 468 S342 448 378 470 S438 491 478 468 S543 445 580 473" fill="none" stroke="#111518" strokeWidth="34" strokeLinecap="round" />
          <path d="M179 475 C221 446 244 484 282 468 S342 448 378 470 S438 491 478 468 S543 445 580 473" fill="none" stroke="url(#metal)" strokeWidth="20" strokeLinecap="round" />
          {[205, 285, 365, 445, 525].map((x, i) => <g key={x} transform={`translate(${x} ${i % 2 ? 461 : 480})`}><circle r="42" fill="url(#metalDark)" stroke="#111518" strokeWidth="6" /><circle r="27" fill="#1b2022" stroke="#a7acab" strokeWidth="4" /><circle r="8" fill="#080a0b" /></g>)}
          <circle cx="157" cy="478" r="55" fill="url(#metalDark)" stroke="#111518" strokeWidth="7" /><circle cx="157" cy="478" r="35" fill="none" stroke="#a9adab" strokeWidth="6" strokeDasharray="8 7" /><circle cx="157" cy="478" r="10" fill="#121618" />
        </Part>

        <Part id="timing" selected={selected === "timing"} className="engine-layer layer-timing">
          <path d="M568 181 Q655 244 624 365 Q589 423 542 399 Q577 315 558 224Z" fill="none" stroke="#0c1012" strokeWidth="18" />
          <path d="M568 181 Q655 244 624 365 Q589 423 542 399 Q577 315 558 224Z" fill="none" stroke="#606969" strokeWidth="10" strokeDasharray="3 9" />
          <Gear cx={586} cy={194} radius={40} teeth={12} />
          <Gear cx={620} cy={360} radius={31} teeth={10} />
          <Gear cx={550} cy={409} radius={25} teeth={9} />
        </Part>

        <Part id="alternator" selected={selected === "alternator"} className="engine-layer layer-alternator">
          <g transform="translate(631 421) rotate(-16)"><ellipse rx="63" ry="72" fill="#0c1012" stroke="#090b0d" strokeWidth="10" /><ellipse rx="52" ry="63" fill="url(#metal)" stroke="#a5aaa7" strokeWidth="4" /><path d="M-40-41 L40 41 M-48-17 L48 17 M-34 52 L34-52 M-53 13 L53-13" stroke="#31383a" strokeWidth="9" /><circle r="25" fill="#171c1e" stroke="#bbc0ba" strokeWidth="4" /><circle r="9" fill="#080a0b" /></g>
        </Part>

        <Part id="bolts" selected={selected === "bolts"} className="engine-layer layer-bolts">
          {[{x:162,y:291,r:8},{x:191,y:332,r:6},{x:606,y:294,r:8},{x:661,y:284,r:6},{x:622,y:518,r:7},{x:270,y:536,r:6},{x:353,y:554,r:6},{x:467,y:544,r:7},{x:690,y:464,r:6}].map(({x,y,r}) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><path d={`M-${r * 1.6} 0 H${r * 1.6} M0 -${r * 1.6} V${r * 1.6}`} stroke="#111518" strokeWidth={r * .8} /><circle r={r} fill="url(#metal)" stroke="#0d1113" strokeWidth="3" /></g>)}
        </Part>

        <g className="engine-layer layer-pan" style={{ "--layer-depth": "0.55" } as React.CSSProperties}><path d="M240 540 H565 L535 617 Q526 636 502 640 H298 Q274 636 266 617Z" fill="url(#metalDark)" stroke="#0d1113" strokeWidth="8" filter="url(#smallShadow)" /><path d="M267 561 H538 M281 585 H525 M304 610 H500" stroke="#aeb3ae" strokeOpacity=".5" strokeWidth="4" /><circle cx="420" cy="615" r="9" fill="#171b1c" stroke="#d2d3cb" strokeWidth="3" /></g>
      </svg>

      <div className="engine-instruction"><span className="touch-dot" /> Tocá una pieza<br /><small>para conocerla</small></div>
      <div className={`engine-info ${active ? "is-visible" : ""}`} aria-live="polite">
        {active && <><span className="info-kicker">Pieza seleccionada</span><strong>{active.name}</strong><p>{active.description}</p><button type="button" onClick={() => setSelected(null)} aria-label="Cerrar información">×</button></>}
      </div>
    </div>
  );
}
