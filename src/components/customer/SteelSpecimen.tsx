"use client";

import type { CSSProperties } from "react";
import { useSceneMotion } from "./useSceneMotion";

function SteelBox({ width, height, depth, y }: { width: number; height: number; depth: number; y: number }) {
  const style = { "--width": `${width}px`, "--height": `${height}px`, "--depth": `${depth}px`, "--offset-y": `${y}px` } as CSSProperties;
  return <div className="steel-box" style={style}>
    {["front", "back", "left", "right", "top", "bottom"].map((face) => <div key={face} className={`steel-face ${face}`} />)}
  </div>;
}

export function SteelSpecimen() {
  const { ref, active, reduced } = useSceneMotion();
  return <div ref={ref} className="specimen-scene" data-animate={active && !reduced} role="img" aria-label="Illustrative floating metallic I-section specimen, not a product or batch sample"
    onPointerMove={(event) => {
      if (reduced || !active || event.pointerType !== "mouse") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 12}deg`);
      event.currentTarget.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height - 0.5) * -8}deg`);
    }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--pointer-x", "0deg"); event.currentTarget.style.setProperty("--pointer-y", "0deg"); }}>
    <div className="specimen-shadow" />
    <div className="specimen-pointer"><div className="specimen-float"><div className="specimen-rotation">
      <SteelBox width={180} height={30} depth={250} y={-80} />
      <SteelBox width={30} height={130} depth={250} y={0} />
      <SteelBox width={180} height={30} depth={250} y={80} />
    </div></div></div>
  </div>;
}
