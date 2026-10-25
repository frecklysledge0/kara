// Original, simplified continent outlines for a schematic globe; not a navigation map.
export const LAND: number[][][] = [
  [[-168,65],[-140,70],[-125,62],[-130,52],[-124,42],[-117,32],[-106,24],[-98,17],[-87,15],[-82,9],[-77,9],[-81,24],[-80,31],[-70,43],[-56,51],[-62,60],[-85,67],[-100,73],[-130,72],[-168,65]],
  [[-81,12],[-68,10],[-58,6],[-49,-1],[-35,-8],[-41,-20],[-51,-29],[-63,-42],[-68,-55],[-75,-45],[-73,-25],[-81,-6],[-81,12]],
  [[-52,60],[-44,60],[-20,76],[-32,83],[-58,80],[-65,68],[-52,60]],
  [[-17,36],[4,37],[12,33],[33,31],[43,13],[51,11],[42,-1],[40,-16],[32,-29],[18,-35],[11,-20],[8,-4],[-5,5],[-17,14],[-17,36]],
  [[-10,36],[-9,44],[-1,49],[7,54],[5,60],[20,71],[31,70],[40,59],[65,68],[90,77],[120,73],[143,60],[177,65],[180,52],[157,51],[140,36],[130,31],[121,20],[108,5],[100,1],[91,22],[80,6],[69,24],[57,26],[47,13],[36,30],[28,40],[15,45],[10,37],[-10,36]],
  [[112,-11],[130,-11],[139,-17],[145,-15],[153,-27],[147,-39],[132,-35],[114,-35],[112,-22],[112,-11]],
  [[47,-13],[51,-16],[47,-26],[44,-22],[47,-13]],
  [[130,31],[140,42],[145,44],[140,35],[130,31]],
  [[96,5],[106,-6],[118,-9],[123,-7],[115,-5],[104,1],[96,5]],
  [[166,-34],[179,-40],[170,-47],[166,-44],[173,-40],[166,-34]],
  [[-8,50],[-2,51],[0,58],[-5,59],[-8,50]],
];
const rad = Math.PI / 180;
export function projectPoint(lat: number, lng: number, centerLat: number, centerLng: number) {
  const phi = lat * rad;
  const delta = (lng - centerLng) * rad;
  const center = centerLat * rad;
  return {
    x: Math.cos(phi) * Math.sin(delta),
    y: -(Math.cos(center) * Math.sin(phi) - Math.sin(center) * Math.cos(phi) * Math.cos(delta)),
    z: Math.sin(center) * Math.sin(phi) + Math.cos(center) * Math.cos(phi) * Math.cos(delta),
  };
}
export function shortestLongitude(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}
function inside(lng: number, lat: number, polygon: number[][]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}
export const LAND_DOTS: [number, number][] = [];
for (let lat = -55; lat < 80; lat += 3) {
  for (let lng = -180; lng < 180; lng += 3 / Math.max(0.3, Math.cos(lat * rad))) {
    if (LAND.some((polygon) => inside(lng, lat, polygon))) LAND_DOTS.push([lat, lng]);
  }
}
