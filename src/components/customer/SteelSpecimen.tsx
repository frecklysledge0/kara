"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import type { SteelGradeEntry } from "@/types/grades";
import { useSceneMotion } from "./useSceneMotion";

export function specimenProfile(grade: SteelGradeEntry) {
  const stainless = /stainless|duplex/i.test(grade.material_family);
  const shape = grade.id === "aisi-316l" || grade.id === "duplex-2205" ? "pipe"
    : stainless ? "sheet" : /4140|1045|1018/.test(grade.id) ? "bar" : "beam";
  return { shape, finish: stainless ? "stainless" : grade.id === "astm-a588" ? "weathering" : "carbon", speed: stainless ? 0.016 : 0.009 };
}

function SteelBox({ width, height, depth, y }: { width: number; height: number; depth: number; y: number }) {
  const style = { "--width": `${width}px`, "--height": `${height}px`, "--depth": `${depth}px`, "--offset-y": `${y}px` } as CSSProperties;
  return <div className="steel-box" style={style}>{["front", "back", "left", "right", "top", "bottom"].map((face) => <div key={face} className={`steel-face ${face}`} />)}</div>;
}

function Cylinder({ pipe }: { pipe: boolean }) {
  return <div className={`steel-cylinder ${pipe ? "is-pipe" : ""}`}>
    {Array.from({ length: 24 }, (_, index) => <div className="cylinder-side" key={index} style={{ "--side-angle": `${index * 15}deg`, "--shade": `${28 + Math.round(48 * Math.max(0, Math.cos(index * Math.PI / 12)))}%` } as CSSProperties} />)}
    <div className="cylinder-cap cap-top" /><div className="cylinder-cap cap-bottom" />
  </div>;
}

export function SteelSpecimen({ grade }: { grade: SteelGradeEntry }) {
  const { ref, active, reduced } = useSceneMotion();
  const [paused, setPaused] = useState(false);
  const turn = useRef(-28);
  const pointer = useRef({ x: 0, y: 0 });
  const profile = specimenProfile(grade);
  useEffect(() => {
    const scene = ref.current;
    if (!scene || !active || reduced || paused) return;
    let frame = 0, previous = 0, x = 0, y = 0;
    const animate = (now: number) => {
      const delta = previous ? Math.min(now - previous, 50) : 0;
      previous = now;
      turn.current += delta * profile.speed;
      const easing = 1 - Math.exp(-delta / 180);
      x += (pointer.current.x - x) * easing;
      y += (pointer.current.y - y) * easing;
      scene.style.setProperty("--specimen-turn", `${turn.current + x}deg`);
      scene.style.setProperty("--specimen-tilt", `${-16 + y}deg`);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, reduced, paused, profile.speed, ref]);
  const rotate = (amount: number) => { turn.current += amount; ref.current?.style.setProperty("--specimen-turn", `${turn.current}deg`); };
  return <>
    <div ref={ref} className={`specimen-scene finish-${profile.finish}`} data-animate={active && !reduced && !paused} role="img" aria-label={`Illustrative ${grade.canonical_name} ${profile.shape} specimen. Not a batch sample.`}
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        pointer.current = { x: ((event.clientX - bounds.left) / bounds.width - .5) * 18, y: ((event.clientY - bounds.top) / bounds.height - .5) * -10 };
      }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}>
      <div className="specimen-halo" /><div className="specimen-shadow" />
      <div className="specimen-pointer"><div className="specimen-rotation"><div className="specimen-model" key={grade.id}>
        {profile.shape === "beam" ? <><SteelBox width={grade.id === "astm-a572-50" ? 210 : 170} height={24} depth={260} y={-82} /><SteelBox width={22} height={140} depth={260} y={0} /><SteelBox width={grade.id === "astm-a572-50" ? 210 : 170} height={24} depth={260} y={82} /></>
          : profile.shape === "sheet" ? <SteelBox width={230} height={12} depth={270} y={0} /> : <Cylinder pipe={profile.shape === "pipe"} />}
      </div></div></div>
    </div>
    <div className="specimen-controls" aria-label="Specimen controls"><button className="icon-button" type="button" onClick={() => rotate(-30)} aria-label="Rotate specimen left"><RotateCcw size={16} /></button>
      <button type="button" className="text-button" onClick={() => setPaused(!paused)} disabled={reduced}>{paused || reduced ? <Play size={14} /> : <Pause size={14} />}{reduced ? "Reduced motion" : paused ? "Resume rotation" : "Pause rotation"}</button>
      <button className="icon-button" type="button" onClick={() => rotate(30)} aria-label="Rotate specimen right"><RotateCw size={16} /></button></div>
  </>;
}
