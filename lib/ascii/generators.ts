/**
 * Procedural ASCII generators. Each returns a brightness field (rows of
 * numbers in [0,1]); the renderer maps brightness → glyph via the luminance
 * ramp. Everything is deterministic in `seed` so a given day always yields
 * the same piece. Course-relevant families:
 *   fractal (FPV) · tree/sierpinski (GAD) · solid3d (LinAlg) ·
 *   circuit (GRA) · graph (EIST) · field (general/mixed).
 *
 * The "spinning donut" luminance technique underlies solid3d; fractals use
 * escape-time; line art accumulates additive brightness then normalizes.
 */

import { mulberry32 } from "./rng";

export type GeneratorId =
  | "mandelbrot"
  | "julia"
  | "fractalTree"
  | "sierpinski"
  | "solid3d"
  | "circuit"
  | "graph"
  | "field";

export type Generator = (seed: number, w: number, h: number) => number[][];

// Monospace glyphs are ~half as wide as tall; widen x to keep forms round.
const ASPECT = 2.0;

/* ——— flat grid helpers (kept simple under strict typing) ——— */

interface Grid {
  w: number;
  h: number;
  d: Float64Array;
}
function grid(w: number, h: number): Grid {
  return { w, h, d: new Float64Array(w * h) };
}
function add(g: Grid, x: number, y: number, v: number) {
  if (x < 0 || x >= g.w || y < 0 || y >= g.h) return;
  const i = y * g.w + x;
  g.d[i] = (g.d[i] ?? 0) + v;
}
function put(g: Grid, x: number, y: number, v: number) {
  if (x < 0 || x >= g.w || y < 0 || y >= g.h) return;
  const i = y * g.w + x;
  if (v > (g.d[i] ?? 0)) g.d[i] = v;
}
function line(g: Grid, x0: number, y0: number, x1: number, y1: number, v: number) {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    add(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), v);
  }
}
function toRows(g: Grid, gamma = 1, normalize = true): number[][] {
  let max = 0;
  if (normalize) for (let i = 0; i < g.d.length; i++) max = Math.max(max, g.d[i] ?? 0);
  const m = normalize && max > 0 ? 1 / max : 1;
  const rows: number[][] = [];
  for (let y = 0; y < g.h; y++) {
    const row: number[] = [];
    for (let x = 0; x < g.w; x++) {
      const b = Math.min(1, (g.d[y * g.w + x] ?? 0) * m);
      row.push(gamma === 1 ? b : Math.pow(b, gamma));
    }
    rows.push(row);
  }
  return rows;
}

/* ——— 3D vector maths for solid3d ——— */

interface V {
  x: number;
  y: number;
  z: number;
}
function dot(a: V, b: V): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function normV(a: V): V {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}
function rot(p: V, cA: number, sA: number, cB: number, sB: number): V {
  const y = p.y * cA - p.z * sA;
  const z1 = p.y * sA + p.z * cA;
  const x = p.x * cB + z1 * sB;
  const z = -p.x * sB + z1 * cB;
  return { x, y, z };
}

/* ——— fractals (escape-time) ——— */

/**
 * Histogram-stretch escape-time values to full [0,1] contrast. Deep zooms
 * cluster iterations in a narrow band; without this the field looks blank.
 * Interior (never-escaped) cells stay dark ink.
 */
function stretch(rows: number[][], interior = 0.06): number[][] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const row of rows)
    for (const b of row) {
      if (b < 0) continue; // interior marker
      if (b < lo) lo = b;
      if (b > hi) hi = b;
    }
  const span = hi - lo;
  return rows.map((row) =>
    row.map((b) => (b < 0 ? interior : span > 1e-9 ? (b - lo) / span : 0.5))
  );
}

const MANDEL_SPOTS: [number, number, number][] = [
  [-0.745, 0.113, 0.028],
  [-0.1015, 0.633, 0.016],
  [0.2865, 0.0122, 0.03],
  [-1.2508, 0.0201, 0.012],
  [-0.16, 1.0405, 0.036],
  [-0.7453, 0.1127, 0.0075],
];

const mandelbrot: Generator = (seed, w, h) => {
  const rnd = mulberry32(seed);
  const spot = MANDEL_SPOTS[Math.floor(rnd() * MANDEL_SPOTS.length)] ?? MANDEL_SPOTS[0]!;
  const [cx, cy, baseScale] = spot;
  const maxIter = 220;

  const renderAt = (scale: number) => {
    const rows: number[][] = [];
    let escaped = 0;
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        const re = cx + (x / (w - 1) - 0.5) * scale * ASPECT;
        const im = cy + (y / (h - 1) - 0.5) * scale * (h / w) * ASPECT;
        let zr = 0;
        let zi = 0;
        let i = 0;
        while (zr * zr + zi * zi < 16 && i < maxIter) {
          const t = zr * zr - zi * zi + re;
          zi = 2 * zr * zi + im;
          zr = t;
          i++;
        }
        if (i >= maxIter) {
          row.push(-1); // interior marker — kept dark by stretch()
        } else {
          escaped++;
          const smooth = i + 1 - Math.log(Math.log(Math.sqrt(zr * zr + zi * zi))) / Math.log(2);
          row.push(Math.pow(Math.max(0, smooth) / maxIter, 0.42));
        }
      }
      rows.push(row);
    }
    return { rows, escapedFrac: escaped / (w * h) };
  };

  // Zoom out until the frame actually shows the boundary — a window fully
  // inside (or outside) the set renders as an empty field otherwise.
  let scale = baseScale * (0.7 + rnd() * 0.8);
  let best = renderAt(scale);
  for (let tries = 0; tries < 6 && (best.escapedFrac < 0.2 || best.escapedFrac > 0.97); tries++) {
    scale *= 2.6;
    best = renderAt(scale);
  }
  return stretch(best.rows);
};

/** 2×2 supersample: average a double-resolution field down — declutters speckle. */
function supersample(gen: Generator): Generator {
  return (seed, w, h) => {
    const hi = gen(seed, w * 2, h * 2);
    const rows: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      const r0 = hi[y * 2] ?? [];
      const r1 = hi[y * 2 + 1] ?? [];
      for (let x = 0; x < w; x++) {
        row.push(
          ((r0[x * 2] ?? 0) + (r0[x * 2 + 1] ?? 0) + (r1[x * 2] ?? 0) + (r1[x * 2 + 1] ?? 0)) / 4
        );
      }
      rows.push(row);
    }
    return rows;
  };
}

const julia: Generator = (seed, w, h) => {
  const rnd = mulberry32(seed);
  const ang = rnd() * Math.PI * 2;
  const rad = 0.7 + rnd() * 0.12;
  const cr = Math.cos(ang) * rad;
  const ci = Math.sin(ang) * rad;
  const maxIter = 110;
  const view = 3.1;
  const rows: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let zr = (x / (w - 1) - 0.5) * view * ASPECT;
      let zi = (y / (h - 1) - 0.5) * view * (h / w) * ASPECT;
      let i = 0;
      while (zr * zr + zi * zi < 16 && i < maxIter) {
        const t = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = t;
        i++;
      }
      if (i >= maxIter) row.push(-1);
      else {
        const smooth = i + 1 - Math.log(Math.log(Math.sqrt(zr * zr + zi * zi))) / Math.log(2);
        row.push(Math.pow(Math.max(0, smooth) / maxIter, 0.5));
      }
    }
    rows.push(row);
  }
  // Julia interiors are the filled shape itself — render them bright.
  return stretch(rows, 0.92);
};

/* ——— recursive tree (GAD) ——— */

function lineMax(g: Grid, x0: number, y0: number, x1: number, y1: number, v: number, thick = 0) {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Math.round(x0 + (x1 - x0) * t);
    const py = Math.round(y0 + (y1 - y0) * t);
    put(g, px, py, v);
    for (let d = 1; d <= thick; d++) {
      put(g, px + d, py, v * 0.85);
      put(g, px - d, py, v * 0.85);
    }
  }
}

const fractalTree: Generator = (seed, w, h) => {
  const g = grid(w, h);
  const rnd = mulberry32(seed);
  const branchAngle = 0.38 + rnd() * 0.22;
  const ratio = 0.72 + rnd() * 0.06;
  const asym = 0.85 + rnd() * 0.3; // one side reaches further than the other
  const maxDepth = 9;

  const draw = (x: number, y: number, angle: number, len: number, depth: number) => {
    if (depth <= 0 || len < 1) return;
    const x2 = x + Math.cos(angle) * len * ASPECT;
    const y2 = y - Math.sin(angle) * len;
    // trunk is solid ink; outer branches glow brighter toward the canopy
    const t = 1 - depth / maxDepth; // 0 at trunk → 1 at tips
    const v = 0.42 + t * 0.58;
    const thick = depth >= maxDepth - 1 ? 2 : depth >= maxDepth - 3 ? 1 : 0;
    lineMax(g, x, y, x2, y2, v, thick);

    if (depth === 1) {
      // a soft leaf glow at each terminal twig
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -2; dx <= 2; dx++)
          put(g, Math.round(x2) + dx, Math.round(y2) + dy, 0.95 * Math.exp(-(dx * dx * 0.35 + dy * dy) / 1.6));
      return;
    }
    const wobble = (rnd() - 0.5) * 0.08;
    draw(x2, y2, angle + branchAngle * asym + wobble, len * ratio, depth - 1);
    draw(x2, y2, angle - branchAngle + wobble, len * ratio, depth - 1);
    if (depth >= 6 && rnd() > 0.55) draw(x2, y2, angle + wobble * 3, len * ratio * 0.8, depth - 2);
  };

  draw(w / 2, h - 1, Math.PI / 2, h * 0.28, maxDepth);
  return toRows(g, 1, false);
};

/* ——— sierpinski via chaos game (GAD) ——— */

const sierpinski: Generator = (seed, w, h) => {
  const g = grid(w, h);
  const rnd = mulberry32(seed);
  const rotOff = rnd() * Math.PI * 2;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w / ASPECT, h) * 0.46;
  const verts = [0, 1, 2].map((k) => {
    const a = rotOff + (k / 3) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * R * ASPECT, y: cy - Math.sin(a) * R };
  });
  let px = cx;
  let py = cy;
  const iters = w * h * 24;
  for (let i = 0; i < iters; i++) {
    const v = verts[Math.floor(rnd() * 3)] ?? verts[0]!;
    px = (px + v.x) / 2;
    py = (py + v.y) / 2;
    if (i > 30) add(g, Math.round(px), Math.round(py), 1);
  }
  return toRows(g, 0.42);
};

/* ——— shaded 3D solid (LinAlg) ——— */

const solid3d: Generator = (seed, w, h) => {
  const rnd = mulberry32(seed);
  const variant = Math.floor(rnd() * 3); // 0 torus, 1 sphere, 2 star-torus
  const A = rnd() * Math.PI * 2;
  const B = rnd() * Math.PI * 2;
  const cA = Math.cos(A);
  const sA = Math.sin(A);
  const cB = Math.cos(B);
  const sB = Math.sin(B);
  const light = normV({ x: 0, y: 0.7, z: -1 });
  const g = grid(w, h);
  const zb = new Float64Array(w * h).fill(-Infinity);
  const K1 = w * 0.32;
  const camZ = 6;
  const starK = 2 + Math.floor(rnd() * 4);

  const plot = (p: V, n: V) => {
    const rp = rot(p, cA, sA, cB, sB);
    const rn = rot(n, cA, sA, cB, sB);
    const z = rp.z + camZ;
    if (z <= 0.1) return;
    const ooz = 1 / z;
    const sx = Math.round(w / 2 + K1 * ooz * rp.x * ASPECT * 0.5 * 2);
    const sy = Math.round(h / 2 - K1 * ooz * rp.y);
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
    const idx = sy * w + sx;
    if (ooz <= (zb[idx] ?? -Infinity)) return;
    const lum = Math.max(0, dot(normV(rn), light));
    zb[idx] = ooz;
    const b = 0.12 + 0.88 * Math.pow(lum, 0.9);
    put(g, sx, sy, b);
  };

  if (variant === 1) {
    const R = 2.2;
    for (let u = 0; u < Math.PI * 2; u += 0.03)
      for (let v = 0.01; v < Math.PI; v += 0.02) {
        const n = { x: Math.sin(v) * Math.cos(u), y: Math.cos(v), z: Math.sin(v) * Math.sin(u) };
        plot({ x: n.x * R, y: n.y * R, z: n.z * R }, n);
      }
  } else {
    const R2 = 2.0;
    const R1 = 0.95;
    for (let u = 0; u < Math.PI * 2; u += 0.02)
      for (let v = 0; v < Math.PI * 2; v += 0.035) {
        const mod = variant === 2 ? 1 + 0.4 * Math.cos(starK * u) : 1;
        const r1 = R1 * mod;
        const cu = Math.cos(u);
        const su = Math.sin(u);
        const cv = Math.cos(v);
        const sv = Math.sin(v);
        const rr = R2 + r1 * cv;
        const p = { x: rr * cu, y: rr * su, z: r1 * sv };
        const n = { x: cv * cu, y: cv * su, z: sv };
        plot(p, n);
      }
  }
  return toRows(g, 1, false);
};

/* ——— circuit / CPU die (GRA) ——— */

const circuit: Generator = (seed, w, h) => {
  const g = grid(w, h);
  const rnd = mulberry32(seed);
  const m = Math.round(Math.min(w, h) * 0.08) + 1;
  const x0 = m;
  const y0 = m;
  const x1 = w - 1 - m;
  const y1 = h - 1 - m;
  // die border
  line(g, x0, y0, x1, y0, 0.9);
  line(g, x0, y1, x1, y1, 0.9);
  line(g, x0, y0, x0, y1, 0.9);
  line(g, x1, y0, x1, y1, 0.9);
  // pins along the edges
  for (let x = x0 + 2; x < x1; x += 3) {
    line(g, x, y0 - 2, x, y0, 0.5);
    line(g, x, y1, x, y1 + 2, 0.5);
  }
  for (let y = y0 + 2; y < y1; y += 3) {
    line(g, x0 - 2, y, x0, y, 0.5);
    line(g, x1, y, x1 + 2, y, 0.5);
  }
  // internal orthogonal traces + vias
  const grid2 = 3;
  const nodesX: number[] = [];
  const nodesY: number[] = [];
  for (let x = x0 + grid2; x < x1; x += grid2) nodesX.push(x);
  for (let y = y0 + grid2; y < y1; y += grid2) nodesY.push(y);
  const traces = Math.floor((nodesX.length * nodesY.length) / 3);
  for (let t = 0; t < traces; t++) {
    let cx = nodesX[Math.floor(rnd() * nodesX.length)] ?? x0;
    let cy = nodesY[Math.floor(rnd() * nodesY.length)] ?? y0;
    const legs = 2 + Math.floor(rnd() * 3);
    for (let l = 0; l < legs; l++) {
      const horiz = rnd() > 0.5;
      const step = (rnd() > 0.5 ? 1 : -1) * grid2 * (1 + Math.floor(rnd() * 3));
      const nx = horiz ? cx + step : cx;
      const ny = horiz ? cy : cy + step;
      line(g, cx, cy, nx, ny, 0.55);
      put(g, cx, cy, 1); // via glows at bends
      cx = nx;
      cy = ny;
    }
  }
  // central core block
  const bx0 = Math.round(w * 0.4);
  const bx1 = Math.round(w * 0.6);
  const by0 = Math.round(h * 0.42);
  const by1 = Math.round(h * 0.58);
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if ((x + y) % 2 === 0) put(g, x, y, 0.75);
  return toRows(g, 1, false);
};

/* ——— layered dependency graph (EIST) ——— */

const graph: Generator = (seed, w, h) => {
  const g = grid(w, h);
  const rnd = mulberry32(seed);
  const layers = 4 + Math.floor(rnd() * 3);
  const cols: { x: number; y: number }[][] = [];
  for (let l = 0; l < layers; l++) {
    const n = 2 + Math.floor(rnd() * 4);
    const lx = Math.round(((l + 0.5) / layers) * w);
    const nodes: { x: number; y: number }[] = [];
    for (let k = 0; k < n; k++) {
      const ny = Math.round(((k + 0.5) / n) * (h - 4)) + 2;
      nodes.push({ x: lx, y: ny });
    }
    cols.push(nodes);
  }
  // edges between adjacent layers
  for (let l = 0; l < cols.length - 1; l++) {
    const a = cols[l]!;
    const b = cols[l + 1]!;
    for (const na of a) {
      const links = 1 + Math.floor(rnd() * 2);
      for (let e = 0; e < links; e++) {
        const nb = b[Math.floor(rnd() * b.length)] ?? b[0]!;
        line(g, na.x, na.y, nb.x, nb.y, 0.3);
      }
    }
  }
  // node blobs (bright gaussian)
  for (const col of cols)
    for (const node of col)
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const d2 = dx * dx + dy * dy;
          put(g, node.x + dx, node.y + dy, Math.exp(-d2 / 3) * 0.95);
        }
  return toRows(g, 1, false);
};

/* ——— general fields (mixed / no dominant subject) ——— */

const field: Generator = (seed, w, h) => {
  const rnd = mulberry32(seed);
  const variant = Math.floor(rnd() * 3);
  const g = grid(w, h);

  if (variant === 0) {
    // interference of a few plane waves
    const waves = Array.from({ length: 4 }, () => ({
      kx: (rnd() - 0.5) * 0.6,
      ky: (rnd() - 0.5) * 0.6,
      ph: rnd() * Math.PI * 2,
    }));
    const rows: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (const wv of waves) s += Math.sin(x * wv.kx + y * wv.ky + wv.ph);
        row.push(Math.pow((s / waves.length + 1) / 2, 1.4));
      }
      rows.push(row);
    }
    return rows;
  }

  if (variant === 1) {
    // starfield with soft glow
    const stars = Math.round(w * h * 0.012) + 12;
    for (let s = 0; s < stars; s++) {
      const sx = rnd() * w;
      const sy = rnd() * h;
      const mag = 0.5 + rnd() * 0.5;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const d2 = (dx / ASPECT) * (dx / ASPECT) + dy * dy;
          add(g, Math.round(sx + dx), Math.round(sy + dy), mag * Math.exp(-d2 / 2));
        }
    }
    return toRows(g, 0.8);
  }

  // layered mountain ridges
  const layersN = 4;
  for (let l = 0; l < layersN; l++) {
    const base = h * (0.4 + l * 0.16);
    const amp = h * (0.16 - l * 0.02);
    const f1 = 0.03 + rnd() * 0.04;
    const f2 = 0.08 + rnd() * 0.06;
    const ph1 = rnd() * 10;
    const ph2 = rnd() * 10;
    const bright = 0.35 + l * 0.16;
    for (let x = 0; x < w; x++) {
      const ridge = base - (Math.sin(x * f1 + ph1) * amp + Math.sin(x * f2 + ph2) * amp * 0.4);
      for (let y = Math.round(ridge); y < h; y++) put(g, x, y, bright * (1 - (y - ridge) / h) + 0.05);
    }
  }
  return toRows(g, 1, false);
};

export const GENERATORS: Record<GeneratorId, Generator> = {
  mandelbrot: supersample(mandelbrot),
  julia: supersample(julia),
  fractalTree,
  sierpinski,
  solid3d,
  circuit,
  graph,
  field,
};
