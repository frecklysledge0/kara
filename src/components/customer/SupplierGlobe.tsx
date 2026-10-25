"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { CustomerListing } from "@/types/customer";
import { LAND_DOTS, projectPoint, shortestLongitude } from "@/lib/customer/globe";
import { useSceneMotion } from "./useSceneMotion";

export function SupplierGlobe({ listings, selected, onSelect }: {
  listings: CustomerListing[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const { ref, active, reduced } = useSceneMotion();
  const [view, setView] = useState({ lat: 25, lng: -85 });
  const viewRef = useRef(view);
  const drag = useRef<{ x: number; lng: number } | null>(null);
  const gradient = useId().replace(/:/g, "");
  const location = listings.find((item) => item.id === selected)?.coordinates;
  const selectedLat = location?.lat, selectedLng = location?.lng;
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => {
    if (!active || selectedLat === undefined || selectedLng === undefined) return;
    const from = viewRef.current;
    let frame = 0;
    const start = performance.now();
    const turn = shortestLongitude(from.lng, selectedLng);
    function animate(now: number) {
      const progress = reduced ? 1 : Math.min(1, (now - start) / 650);
      const ease = 1 - Math.pow(1 - progress, 3);
      setView({ lat: from.lat + (selectedLat! - from.lat) * ease, lng: from.lng + turn * ease });
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [selectedLat, selectedLng, active, reduced]);

  const groups = useMemo(() => {
    const grouped = new Map<string, CustomerListing[]>();
    for (const item of listings) {
      if (!item.coordinates) continue;
      const key = `${item.coordinates.lat},${item.coordinates.lng}`;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return [...grouped.values()];
  }, [listings]);
  const mapped = groups.reduce((sum, group) => sum + group.length, 0);
  const project = (lat: number, lng: number) => projectPoint(lat, lng, view.lat, view.lng);
  const grid = useMemo(() => {
    const paths: string[] = [];
    const line = (points: [number, number][]) => {
      let path = "", pen = false;
      for (const [lat, lng] of points) {
        const point = projectPoint(lat, lng, view.lat, view.lng);
        if (point.z < 0) { pen = false; continue; }
        path += `${pen ? "L" : "M"}${(300 + point.x * 235).toFixed(1)},${(300 + point.y * 235).toFixed(1)} `;
        pen = true;
      }
      paths.push(path);
    };
    for (let lat = -60; lat <= 60; lat += 30) line(Array.from({ length: 181 }, (_, i) => [lat, i * 2 - 180]));
    for (let lng = -180; lng < 180; lng += 30) line(Array.from({ length: 91 }, (_, i) => [i * 2 - 90, lng]));
    return paths;
  }, [view]);

  return <div className="globe-column" ref={ref}>
    <div className="globe-scene" aria-label="Supplier locations on a rotatable globe">
      <svg viewBox="0 0 600 600" className="earth" role="img" aria-label="Schematic Earth. Use the location markers or supplier list to select inventory."
        onPointerDown={(event) => { if (event.button !== 0) return; drag.current = { x: event.clientX, lng: view.lng }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (drag.current) setView((current) => ({ ...current, lng: drag.current!.lng - (event.clientX - drag.current!.x) * 0.4 })); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <defs><radialGradient id={gradient} cx="32%" cy="25%" r="80%"><stop offset="0" stopColor="#283a43" /><stop offset="0.6" stopColor="#142129" /><stop offset="1" stopColor="#0b1015" /></radialGradient></defs>
        <circle cx="300" cy="300" r="245" fill="none" stroke="#b5e4ea" strokeOpacity=".05" strokeWidth="10" />
        <circle cx="300" cy="300" r="235" fill={`url(#${gradient})`} stroke="#a7d2dc" strokeOpacity=".23" />
        {grid.map((path, index) => <path key={index} d={path} fill="none" stroke="#b1c8d0" strokeOpacity=".09" strokeWidth=".7" />)}
        {LAND_DOTS.map(([lat, lng], index) => { const point = project(lat, lng); return point.z > 0 ? <circle key={index} cx={300 + point.x * 235} cy={300 + point.y * 235} r={1.25} fill="#91aeb8" opacity={0.2 + point.z * 0.5} /> : null; })}
      </svg>
      {groups.map((group) => {
        const first = group[0], coords = first.coordinates!;
        const point = project(coords.lat, coords.lng);
        if (point.z < 0.05) return null;
        const current = group.findIndex((item) => item.id === selected);
        return <button key={`${coords.lat},${coords.lng}`} className={`globe-marker ${current >= 0 ? "active" : ""}`}
          style={{ left: `${50 + point.x * 235 / 6}%`, top: `${50 + point.y * 235 / 6}%` }}
          type="button" aria-pressed={current >= 0} aria-controls="seller-list"
          aria-label={`${first.city}, ${first.state}: ${group.length} ${group.length === 1 ? "lot" : "lots"}. Select ${group[(current + 1) % group.length].seller_name}.`}
          onClick={() => onSelect(group[(current + 1) % group.length].id)}><span>{group.length}</span></button>;
      })}
    </div>
    <div className="globe-controls"><button className="icon-button" type="button" aria-label="Rotate globe west" onClick={() => setView((value) => ({ ...value, lng: value.lng - 25 }))}><ArrowLeft size={16} /></button><span>Drag to explore</span><button className="icon-button" type="button" aria-label="Rotate globe east" onClick={() => setView((value) => ({ ...value, lng: value.lng + 25 }))}><ArrowRight size={16} /></button></div>
    <p className="globe-caption">{mapped} mapped · {listings.length - mapped} without confirmed coordinates</p>
    <p className="small muted globe-help">Markers group lots at the same location. Select again to cycle lots. The complete list is always available.</p>
  </div>;
}
