// Shared parts for RiverClear: the physics (when water lifts, carries and drops a grain; Manning's
// equation), three small landscape models (a drainage network on a height grid, a migrating meander,
// a growing delta), and scene helpers (boards, layout, a sketch map of India). Every model here is
// labelled as a model in the chapter that uses it. Sources are given beside each formula.
// +x right, +y up, +z towards you.
import { THREE, M, box, canvasTexture, clamp, lerp, smooth, swarm } from './kit.js';

export { THREE, M, box, clamp, lerp, smooth, swarm };

// ---------------------------------------------------------------- constants
export const G = 9.81;              // m/s²
export const RHO = 1000;            // kg/m³, fresh water
export const RHO_S = 2650;          // kg/m³, quartz sand and most river grains
export const NU = 1.0e-6;           // m²/s, kinematic viscosity of water at about 20 °C
const SG = RHO_S / RHO - 1;         // 1.65, submerged specific gravity

// ---------------------------------------------------------------- lift, carry, drop
// Filip Hjulström (1935, his Uppsala thesis on the River Fyris) drew one famous chart: the speed
// of a river needed to pick up grains of each size, and the speed below which they drop out.
// Here the same chart is computed from later, standard formulas, for water 1 m deep:
//   Starting to move (non-sticky grains): the Shields criterion in the form of Soulsby and
//     Whitehouse (1997), θcr = 0.30 ÷ (1 + 1.2 D*) + 0.055 (1 − e^(−0.020 D*)),
//     D* = d (g (s − 1) ÷ ν²)^(1/3). Bed stress τ = θcr (ρs − ρ) g d; shear velocity u* = √(τ ÷ ρ).
//   From bed stress to the river's mean speed U: the rough-bed log law, U = 5.75 u* log10(12 h ÷ ks),
//     with bed roughness ks = 2.5 d (Nikuradse), h the depth.
//   Mud: settled clay and silt stick together, so they are harder to lift than their size suggests.
//     This is the upturn on the left of Hjulström's chart. It is added as an extra bed stress
//     c ÷ d with c = 5 × 10⁻⁶ Pa·m. That value is a modelling choice made to give the chart's
//     shape (about 0.8 m/s to lift settled 0.01 mm mud); real mud varies a great deal.
//   Settling: fall speed of natural grains, Ferguson and Church (2004, J. Sed. Res. 74),
//     w = (s − 1) g d² ÷ (18 ν + √(0.75 (s − 1) g d³)).
//   Dropping out: a grain stays in the flow while turbulence can hold it up, roughly while u* is
//     larger than its fall speed (Bagnold's suspension criterion). A grain rolling on the bed stops
//     a little below the speed that started it; 0.8 of that speed is used here. It drops out at the
//     lower of the two.
export function dStar(d) { return d * Math.cbrt((G * SG) / (NU * NU)); }
export function shields(d) { const D = dStar(d); return 0.30 / (1 + 1.2 * D) + 0.055 * (1 - Math.exp(-0.020 * D)); }
const logLaw = (d, h) => 5.75 * Math.log10((12 * h) / (2.5 * d));
export const COHESION = 5e-6;
export function liftSpeed(d, h = 1, sticky = true) {          // m/s needed to start moving a grain of diameter d (m)
  const tau = shields(d) * (RHO_S - RHO) * G * d + (sticky ? COHESION / d : 0);
  return Math.sqrt(tau / RHO) * logLaw(d, h);
}
export function fallSpeed(d) { return (SG * G * d * d) / (18 * NU + Math.sqrt(0.75 * SG * G * d * d * d)); }
export function dropSpeed(d, h = 1) {
  const susp = fallSpeed(d) * logLaw(d, h), roll = 0.8 * liftSpeed(d, h, false);
  return Math.min(susp, roll);
}
// Grain classes on the Wentworth scale (mid-points used for each).
export const GRAINS = [
  { id: 'clay', name: 'Clay', d: 0.002e-3, col: '#b58a6a', hex: 0xb58a6a },
  { id: 'silt', name: 'Silt', d: 0.02e-3, col: '#c9a77c', hex: 0xc9a77c },
  { id: 'sand', name: 'Sand', d: 0.3e-3, col: '#e8cf8a', hex: 0xe8cf8a },
  { id: 'gravel', name: 'Gravel', d: 8e-3, col: '#a8a39a', hex: 0xa8a39a },
  { id: 'cobble', name: 'Cobbles', d: 120e-3, col: '#7f7a72', hex: 0x7f7a72 },
];
// What a flow of speed U (m/s) does to a grain that is resting (still) or already moving.
export function grainState(d, U, h = 1) {
  if (U >= liftSpeed(d, h)) return 'lifted';
  if (U >= dropSpeed(d, h)) return 'carried';     // keeps moving if already moving, cannot lift it from rest
  return 'dropped';
}

// ---------------------------------------------------------------- how much water
// Manning's equation (Robert Manning, 1889), as in FloodClear: U = R^(2/3) √S ÷ n, with R the
// cross-section area divided by the wetted edge, S the slope of the water surface and n the
// roughness (Chow, Open-Channel Hydraulics, 1959: about 0.025–0.03 for a clean sandy channel,
// 0.035 for a natural channel with some weeds and stones, 0.05 for a boulder-strewn mountain stream).
// The channel here is a rectangle w wide and d deep.
export function manning(w, d, S, n) {
  const A = w * d, P = w + 2 * d, R = A / P, U = (Math.pow(R, 2 / 3) * Math.sqrt(S)) / n;
  return { A, R, U, Q: A * U };
}
// Gauged flows for comparison: Global Runoff Data Centre records, via the UNH/GRDC Composite Runoff
// Fields station pages: Ganga at Farakka, 1949–1973, mean 12,037 m³/s, highest 65,072 m³/s;
// Brahmaputra at Pandu (Guwahati), 1956–1979, mean 18,100 m³/s, highest 56,500 m³/s.
export const GAUGES = {
  farakka: { name: 'Ganga at Farakka', mean: 12037, max: 65072, years: '1949–1973' },
  pandu: { name: 'Brahmaputra at Pandu', mean: 18100, max: 56500, years: '1956–1979' },
};
// Sediment carried by the Ganga and Brahmaputra together to the Bay of Bengal, million tonnes a year:
// Milliman and Meade (1983, J. Geology 91) 680 + 1,157 = about 1,840; Islam et al. (1999, Marine
// Geology 160) 316 + 721 = about 1,040; measurements in Bangladesh have given about 260 + 390 = 650.
// So "about a billion tonnes a year", with a wide range, as MountainClear says.
export const SED_GB = { lo: 650, mid: 1040, hi: 1840 };

// ---------------------------------------------------------------- noise
export const rnd = (i) => ((Math.sin(i * 127.1 + 3.3) * 43758.5453) % 1 + 1) % 1;
function hash(x, y, s) { return rnd(x * 57.3 + y * 311.7 + s * 17.17); }
export function noise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi, s), hash(xi + 1, yi, s), u), lerp(hash(xi, yi + 1, s), hash(xi + 1, yi + 1, s), u), v);
}
export const fbm = (x, y, o = 4, s = 0) => { let a = 0, f = 1, w = 0.5, t = 0; for (let i = 0; i < o; i++) { a += w * noise(x * f, y * f, s + i); t += w; f *= 2.03; w *= 0.5; } return a / t; };
export function rng(seed = 1) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- a drainage network (model)
// A height grid nx × nz. Rain on every cell flows to the neighbour (of eight) down the steepest
// slope: the D8 method (O'Callaghan and Mark, 1984). Hollows are first filled to their spill point,
// as a lake would fill until it overflows (the priority-flood method, Barnes, Lehman and Mulla 2014),
// so every drop reaches the sea, which is the front row (largest z). The other three edges are high
// ground. Adding up the cells upstream of each cell gives its drainage area. Cells draining more
// than a threshold are channels. Stream order is Strahler's (1952, 1957): a stream with no
// tributaries is order 1; where two of order n meet they make order n + 1; a smaller one joining
// does not raise the order.
// Carving: the stream-power law, erosion rate = K A^m S (Howard 1994 and many since), with uplift U,
// solved with the implicit scheme of Braun and Willett (2013, Geomorphology 180). Hard rock has a
// smaller K. Numbers are in model units; the chapter says so.
class Heap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
  pop() { const k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop(), n = k.length; if (n) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } return top; }
  get size() { return this.k.length; }
}
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export function makeNetwork(nx, nz, dx = 1) {
  const N = nx * nz, h = new Float32Array(N), K = new Float32Array(N).fill(1), rec = new Int32Array(N), acc = new Float32Array(N), ord = new Uint8Array(N), stack = new Int32Array(N), basin = new Int32Array(N);
  const id = (i, k) => k * nx + i;
  const net = { nx, nz, N, h, K, rec, acc, ord, stack, basin, dx, maxOrd: 0, counts: [], basins: [] };
  net.route = (thr) => {
    // priority flood with a tiny rise across filled flats so water always has somewhere to go
    const done = new Uint8Array(N), q = new Heap();
    for (let i = 0; i < nx; i++) { const c = id(i, nz - 1); done[c] = 1; q.push(h[c], c); rec[c] = c; }
    let n = 0;
    while (q.size) {
      const c = q.pop(); stack[n++] = c; const ci = c % nx, ck = (c / nx) | 0;
      for (const [a, b] of NB) {
        const i = ci + a, k = ck + b; if (i < 0 || k < 0 || i >= nx || k >= nz) continue;
        const e = id(i, k); if (done[e]) continue; done[e] = 1;
        if (h[e] <= h[c]) h[e] = h[c] + 1e-4 * (1 + 0.3 * rnd(e));
        q.push(h[e], e);
      }
    }
    // steepest descent
    for (let s = 0; s < N; s++) {
      const c = stack[s], ci = c % nx, ck = (c / nx) | 0;
      if (ck === nz - 1) { rec[c] = c; continue; }
      let best = -1, bs = 0;
      for (const [a, b] of NB) {
        const i = ci + a, k = ck + b; if (i < 0 || k < 0 || i >= nx || k >= nz) continue;
        const e = id(i, k), sl = (h[c] - h[e]) / (a && b ? Math.SQRT2 : 1);
        if (sl > bs) { bs = sl; best = e; }
      }
      rec[c] = best < 0 ? c : best;
    }
    // drainage area (in cells), basins by outlet, Strahler order
    acc.fill(1); ord.fill(0);
    const mo = new Uint8Array(N), cnt = new Uint8Array(N);
    for (let s = N - 1; s >= 0; s--) { const c = stack[s]; if (rec[c] !== c) acc[rec[c]] += acc[c]; }
    for (let s = 0; s < N; s++) { const c = stack[s]; basin[c] = rec[c] === c ? c : basin[rec[c]]; }
    let maxOrd = 0; const heads = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let s = N - 1; s >= 0; s--) {
      const c = stack[s]; if (acc[c] < thr) continue;
      const o = mo[c] === 0 ? 1 : cnt[c] >= 2 ? mo[c] + 1 : mo[c];
      ord[c] = o; if (o > maxOrd) maxOrd = o;
      if (o !== mo[c]) heads[o]++;           // a new stretch of order o starts here
      const r = rec[c]; if (r === c) continue;
      if (o > mo[r]) { mo[r] = o; cnt[r] = 1; } else if (o === mo[r]) cnt[r]++;
    }
    net.maxOrd = maxOrd; net.counts = heads.slice(1, maxOrd + 1);
    const tally = new Map();
    for (let c = 0; c < N; c++) tally.set(basin[c], (tally.get(basin[c]) || 0) + 1);
    net.basins = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    return net;
  };
  // one implicit step of stream-power carving (m = 0.5, n = 1) plus uplift U
  net.carve = (dt, U, Kc) => {
    for (let s = 0; s < N; s++) {
      const c = stack[s], r = rec[c]; if (r === c) continue;
      const F = (Kc * K[c] * dt * Math.sqrt(acc[c])) / dx;
      h[c] = (h[c] + U * dt + F * h[r]) / (1 + F);
    }
  };
  return net;
}

// ---------------------------------------------------------------- a meandering river (model)
// The bend-migration model of Howard and Knutson (1984, Water Resources Research 20), as used in
// many later studies (e.g. Sylvester, Durkin and Covault 2019, "meanderpy"). The centreline moves
// sideways at a rate set by its curvature, weighted towards curvature just upstream, because the
// fastest water takes a while to swing to the outside of a bend:
//   R(s) = Ω C(s) + Γ Σ C(s − ξ) e^(−α ξ) ÷ Σ e^(−α ξ),   Ω = −1, Γ = 2.5
// The bank on the outside of a bend wears away and a point bar builds on the inside, so the loop
// grows and slides downstream. When two parts of the channel come closer than about a channel
// width, the river breaks through the neck (a cut-off) and the loop it leaves is an oxbow lake.
// Lengths are in channel widths, time in model steps.
export function makeMeander({ L = 40, ds = 0.5, amp = 0.4, seed = 3 } = {}) {
  const r = rng(seed), pts = [];
  for (let s = 0; s <= L; s += ds) pts.push([s - L / 2, amp * Math.sin(s * 0.5) * (0.5 + r()) + (r() - 0.5) * 0.1]);
  const m = { pts, oxbows: [], cutoffs: 0, bars: [], erosion: [] };
  const resample = () => {
    const out = [pts[0]]; let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], seg = Math.hypot(bx - ax, by - ay); let t = ds - carry;
      while (t <= seg) { out.push([ax + ((bx - ax) * t) / seg, ay + ((by - ay) * t) / seg]); t += ds; }
      carry = seg - (t - ds);
    }
    const last = pts[pts.length - 1];
    if (Math.hypot(out[out.length - 1][0] - last[0], out[out.length - 1][1] - last[1]) > ds * 0.3) out.push(last); else out[out.length - 1] = last;
    pts.length = 0; out.forEach((p) => pts.push(p));
  };
  m.curv = () => {
    const n = pts.length, C = new Float32Array(n);
    for (let i = 1; i < n - 1; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
      const x1 = bx - ax, y1 = by - ay, x2 = cx - bx, y2 = cy - by;
      C[i] = (2 * (x1 * y2 - y1 * x2)) / (Math.hypot(x1, y1) * Math.hypot(x2, y2) * Math.hypot(cx - ax, cy - ay) + 1e-9);
    }
    return C;
  };
  m.step = (dt, E = 1, belt = 9) => {
    const n = pts.length, C = m.curv(), R = new Float32Array(n), alpha = 1.0, nk = Math.ceil(5 / (alpha * ds));
    for (let i = 1; i < n - 1; i++) {
      let s1 = 0, s2 = 0;
      for (let k = 0; k < nk && i - k >= 0; k++) { const w = Math.exp(-alpha * k * ds); s1 += C[i - k] * w; s2 += w; }
      R[i] = -1 * C[i] + 2.5 * (s1 / s2);
    }
    m.R = R;
    const moved = [];
    for (let i = 1; i < n - 1; i++) {
      const [ax, ay] = pts[i - 1], [cx, cy] = pts[i + 1], tx = cx - ax, ty = cy - ay, tl = Math.hypot(tx, ty) || 1;
      const nxv = -ty / tl, nyv = tx / tl, mv = -E * R[i] * dt;   // left normal; a left bend (C > 0) moves right, to its outer bank
      moved.push([clamp(pts[i][0] + nxv * mv, -L / 2 + 1, L / 2 - 1), clamp(pts[i][1] + nyv * mv, -belt, belt)]);
    }
    for (let i = 1; i < n - 1; i++) pts[i] = moved[i - 1];
    resample();
    // cut-offs: two points far apart along the river but closer than 1.1 widths across the neck
    const n2 = pts.length;
    for (let i = 0; i < n2; i++) {
      for (let j = i + Math.ceil(6 / ds); j < n2; j++) {
        if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 1.1) {
          m.oxbows.push({ pts: pts.slice(i, j + 1), age: 0 }); pts.splice(i + 1, j - i - 1); m.cutoffs++;
          resample(); return true;
        }
      }
    }
    return false;
  };
  m.sinuosity = () => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s / Math.max(1e-6, pts[pts.length - 1][0] - pts[0][0]); };
  return m;
}

// ---------------------------------------------------------------- a delta (model)
// A river carries sediment into still sea water, slows and drops it. Here the channel is traced each
// step from the apex down the steepest path across the land and sea floor (with some inertia, as
// water tends to keep going the way it was going); sediment is dropped where the channel meets deep
// water, and a little along its banks as levees. As the mouth builds up, a lower route opens to one
// side and the river jumps there: an avulsion. That is how a delta builds lobe after lobe. Model
// units; the sea floor slopes gently out from the coast.
export function makeDelta(nx = 72, nz = 56, seed = 5) {
  const N = nx * nz, h = new Float32Array(N), r = rng(seed);
  const id = (i, k) => k * nx + i;
  const reset = () => { for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) h[id(i, k)] = (k < 4 ? 0.05 - k * 0.012 : -0.06 - (k - 4) * 0.02) + (fbm(i * 0.13, k * 0.13, 2, seed) - 0.5) * 0.06; };
  const d = { nx, nz, h, path: [], avulsions: 0, steps: 0 };
  // extend a channel greedily down the steepest way, with a little inertia, never re-entering `seen`
  const extend = (path, seen) => {
    let [i, k] = path[path.length - 1], di = 0, dk = 1;
    if (path.length > 1) { const [pi, pk] = path[path.length - 2]; di = i - pi; dk = k - pk; }
    for (let n = 0; n < nx * 2; n++) {
      if (h[id(i, k)] < -0.05) break;                         // reached open water
      let best = null, bv = Infinity;
      for (const [a, b] of NB) {
        const ii = i + a, kk = k + b; if (ii < 1 || kk < 0 || ii >= nx - 1 || kk >= nz) continue;
        const e = id(ii, kk); if (seen.has(e)) continue;
        const turn = 1 - (a * di + b * dk) / (Math.hypot(a, b) * Math.hypot(di, dk) || 1);
        const v = h[e] + 0.006 * turn + (b < 0 ? 0.01 : b === 0 ? 0.004 : 0) + 0.001 * r();
        if (v < bv) { bv = v; best = [ii, kk, a, b]; }
      }
      if (!best) break;
      [i, k, di, dk] = best; path.push([i, k]); seen.add(id(i, k));
    }
    return path;
  };
  d.reset = () => { reset(); d.avulsions = 0; d.steps = 0; d.path = extend([[nx >> 1, 0]], new Set([id(nx >> 1, 0)])); };
  d.reset();
  d.trace = () => d.path;
  d.step = (q = 1) => {
    let path = d.path;
    const [ei, ek] = path[path.length - 1];
    if (h[id(ei, ek)] >= -0.05) { const seen = new Set(path.map(([a, b]) => id(a, b))); path = extend(path, seen); }
    const [mi, mk] = path[path.length - 1];
    // sediment at the mouth, spread in a fan, building up to just above sea level
    for (let k = Math.max(0, mk - 4); k < Math.min(nz, mk + 5); k++) for (let i = Math.max(0, mi - 4); i < Math.min(nx, mi + 5); i++) {
      const dd = Math.hypot(i - mi, (k - mk) * 0.9); if (dd > 3.2) continue;
      const e = id(i, k), w = Math.exp(-(dd * dd) / 3.5);
      h[e] = Math.min(h[e] + 0.04 * q * w, Math.max(h[e], 0.02));
    }
    // the channel bed and its banks (levees) build up as the river spills a little mud each flood,
    // so after a while the river sits above the plain beside it
    for (let p = 1; p < path.length - 1; p++) {
      const [pi, pk] = path[p], e = id(pi, pk);
      h[e] = Math.min(h[e] + 0.0014 * q, 0.12 - 0.0008 * pk);
      for (const [a, b] of NB) { const ii = pi + a, kk = pk + b; if (ii < 0 || kk < 0 || ii >= nx || kk >= nz) continue; const f = id(ii, kk); if (h[f] > -0.05 && h[f] < h[e] - 0.004) h[f] = Math.min(h[f] + 0.0006 * q, h[e] - 0.004); }
    }
    // avulsion: if at some point the bed stands well above the land a few cells to the side, the
    // river breaks out there in a flood and runs down the lower ground
    d.steps++;
    if (path.length > 8 && d.steps % 3 === 0) {
      const p = 2 + Math.floor(r() * Math.min(path.length - 4, Math.max(3, path.length * 0.7)));
      const [pi, pk] = path[p], [qi, qk] = path[p + 1], ti = qi - pi, tk = qk - pk, tl = Math.hypot(ti, tk) || 1;
      let lowest = Infinity, side = null;
      for (const sg of [-1, 1]) { const ii = Math.round(pi - (tk / tl) * 4 * sg), kk = Math.round(pk + (ti / tl) * 4 * sg); if (ii > 1 && kk >= 0 && ii < nx - 1 && kk < nz && h[id(ii, kk)] < lowest) { lowest = h[id(ii, kk)]; side = sg; } }
      if (side !== null && h[id(pi, pk)] - lowest > 0.06) {
        const keep = path.slice(0, p + 1), seen = new Set(path.map(([a, b]) => id(a, b)));
        const np = extend(keep.slice(), seen);
        if (np.length > keep.length + 3) { path = np; d.avulsions++; }
      }
    }
    d.path = path;
  };
  d.land = () => { let n = 0; for (let k = 4; k < nz; k++) for (let i = 0; i < nx; i++) if (h[id(i, k)] > 0) n++; return n; };
  return d;
}

// ---------------------------------------------------------------- formatting and boards
export const fmtN = (v, d = 0) => v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
export const sig = (v, n = 2) => { if (!isFinite(v) || v === 0) return '0'; const p = Math.pow(10, n - 1 - Math.floor(Math.log10(Math.abs(v)))); return fmtN(Math.round(v * p) / p, Math.max(0, Math.ceil(Math.log10(p)))); };
export const inReel = () => document.body.classList.contains('gb-reel');
export const A = (slug, t) => `<a href="https://glassbox.how/${slug}/" target="_blank" rel="noopener">${t}</a>`;
export const COL = { water: '#4aa8ff', rain: '#9fd0ff', soil: '#c79a5a', leaf: '#5ce1a9', warm: '#ffb547', hot: '#ff7a59', bad: '#ff5a8a', ok: '#a3e635', e: '#8ef0ff', gold: '#ffe27a', soft: 'rgba(255,255,255,.6)', text: '#e8eef8', sand: '#e8cf8a' };
export const HEX = { water: 0x2f86d8, deep: 0x1d5f9e, sea: 0x245f9a, rain: 0x9fd0ff, grass: 0x5f9a4c, field: 0x8fa24a, soil: 0x7a5a3a, rock: 0x8a8f98, sand: 0xe0c78a, mud: 0x8a7350, ice: 0xdcecff, snow: 0xf2f5fa, cap: 0x5d5a58, shale: 0xb79a72, bank: 0x8b6a3f };
export const waterMat = (color = HEX.water, opacity = 0.8) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, metalness: 0, depthWrite: false });

export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const tex = canvasTexture(pxW, pxH, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return Object.assign(tex, { mesh: m });
}
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 31px sans-serif'; g.fillText(text, 24, 44);
  if (sub) { g.font = '21px sans-serif'; g.fillStyle = COL.soft; g.fillText(sub, 24, 76); }
}
export function axes(g, w, h, { x0 = 96, x1 = w - 30, y0 = h - 74, y1 = 104, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '', xLog = false, yLog = false }) {
  const tx = (v) => (xLog ? Math.log10(v) : v), ty = (v) => (yLog ? Math.log10(v) : v);
  const X = (x) => x0 + ((tx(x) - tx(xMin)) / (tx(xMax) - tx(xMin))) * (x1 - x0);
  const Y = (y) => y0 - ((ty(y) - ty(yMin)) / (ty(yMax) - ty(yMin))) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = COL.soft; g.font = '21px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 28); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 7); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '20px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 58);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 12);
  return { X, Y, x0, x1, y0, y1 };
}
export function dot(g, x, y, col, r = 9) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function wrap(g, text, x, y, maxW, lh) {
  let line = '';
  for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = word; } else line = t; }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}

// ---------------------------------------------------------------- layout (as in FloodClear)
// Boards are 900 × 600 px canvases on planes BW wide.
export const BW = 5.7, BH = 3.8, BPX = [900, 600];
const TAN = 2 * Math.tan((21 * Math.PI) / 180);        // the stage camera's field of view is 42°
// Move the camera so that a box w wide and h high, centred on target, fills the stage whatever its
// shape. The kit backs the camera off by k on narrow stages, so that is divided out here.
export function frame(stage, { w, h, target, pitch = 0.09 }) {
  if (inReel() || stage.moved) return;
  const a = stage.camera.aspect, k = Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, a)));
  const d = (Math.max(h / TAN, w / (TAN * a)) * 1.03) / k, len = Math.hypot(pitch, 1);
  const pos = [target[0], target[1] + (pitch / len) * d, target[2] + d / len], hm = stage.home;
  if (!hm || Math.abs(hm.pos[1] - pos[1]) + Math.abs(hm.pos[2] - pos[2]) + Math.abs(hm.target[1] - target[1]) > 0.05) stage.setView(pos, target, 0.6);
}
// For chapters with a chart: the readout sits at the upper left, so the board goes to the right,
// just above the model, and the model runs along the bottom. On phones the board and minor labels
// are hidden and the model is framed alone. In the video the board is centred above the model.
const reelScale = (bs) => Math.min(1.16 * bs, 7.2 / BW);
export function layout(stage, brd, { minor = [], w = 11.6, modelTop = 4.6, bs = 1, overlap = 0, base = 0, bz = -1.6 } = {}) {
  const narrow = stage.host.clientWidth < 560, reel = inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const sy = reel ? 0 : narrow ? -0.2 : 0;
  if (!stage.shift || stage.shift[0] !== 0 || stage.shift[1] !== sy) stage.setShift(0, sy);
  const sc = reel ? (stage.camera.aspect < 0.8 ? 10.4 / BW : reelScale(bs)) : bs, y0 = modelTop + 0.35 - overlap;
  brd.mesh.visible = !narrow || reel; brd.mesh.scale.setScalar(sc);
  brd.mesh.position.set(reel ? 0 : w / 2 - 0.2 - (BW * sc) / 2, y0 + (BH * sc) / 2, bz);
  if (reel) return narrow;
  const h = (narrow ? modelTop + 1.6 : y0 + BH * sc + 1.25) + base, V = Math.max(h, w / stage.camera.aspect) * 1.03;
  frame(stage, { w, h, target: [0, narrow ? modelTop / 2 - 0.3 - base / 2 : V / 2 - 0.9 - base, 0] });
  return narrow;
}
export function reelView(modelTop, bs = 1, overlap = 0, base = 0) {
  const top = modelTop + 0.35 - overlap + BH * reelScale(bs), h = top + 0.7 + base, d = Math.max(10.8, (h / TAN) * 1.03);
  return { pos: [0, h / 2 - 0.25 - base + d * 0.09, d], target: [0, h / 2 - 0.25 - base, 0] };
}
// For chapters without a chart: nudge the picture right and down to clear the readout.
export function fitNarrow(stage, minor = [], drop = 0.2, right = 0.09) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const x = narrow || inReel() ? 0 : right, y = inReel() ? 0 : narrow ? -drop : -0.07;
  if (!stage.shift || stage.shift[0] !== x || stage.shift[1] !== y) stage.setShift(x, y);
  return narrow;
}
// The readout's small print is left out on phones, where the readout would cover the model.
export const fine = (html) => (window.innerWidth < 560 ? '' : html);
// On a phone the readout keeps its headline and first rows only.
export function compact(html, rows = 3) {
  if (window.innerWidth >= 560 || inReel()) return html;
  let n = 0;
  return html.replace(/<small[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (n++ < rows ? m : ''));
}

// ---------------------------------------------------------------- a height-field mesh
// A grid mesh nx × nz over w × d, centred on the origin, with vertex colours. set(i, k, y, color).
export function gridMesh(nx, nz, w, d, mat) {
  const g = new THREE.PlaneGeometry(w, d, nx - 1, nz - 1);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, mat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
  m.castShadow = true; m.receiveShadow = true;
  // PlaneGeometry rows run from -z (far) to +z (near) after rotation, matching k from 0 to nz − 1.
  m.put = (i, k, y, c) => { const v = k * nx + i; pos.setY(v, y); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; };
  m.done = () => { pos.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); };
  return m;
}
// A wall closing one side of a height field, from y = yb up to the given heights.
export function skirtMesh(xs, zs, ys, yb, mat) {
  const g = new THREE.BufferGeometry(), v = [], idx = [];
  for (let i = 0; i < xs.length; i++) v.push(xs[i], yb, zs[i], xs[i], ys[i], zs[i]);
  for (let i = 0; i < xs.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true;
  m.update = (ys2) => { const p = g.attributes.position; for (let i = 0; i < ys2.length; i++) p.setY(i * 2 + 1, ys2[i]); p.needsUpdate = true; g.computeVertexNormals(); };
  return m;
}
// A flat ribbon along a 2D polyline [[x, z]...] at height y (a number, or a function of the point's
// index), w wide (or wf(i, n)). Rebuildable each frame.
export function ribbonMesh(maxPts, mat) {
  const pos = new Float32Array(maxPts * 2 * 3), g = new THREE.BufferGeometry(), idx = [];
  for (let i = 0; i < maxPts - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  mat.side = THREE.DoubleSide;
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.receiveShadow = true;
  m.set = (pts, y, w, wf = null) => {
    const n = Math.min(maxPts, pts.length);
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
      const hw = (wf ? wf(i, n) : w) / 2, nx = -tz / tl, nz = tx / tl, yy = typeof y === 'function' ? y(i) : y;
      pos.set([pts[i][0] + nx * hw, yy, pts[i][1] + nz * hw, pts[i][0] - nx * hw, yy, pts[i][1] - nz * hw], i * 6);
    }
    g.setDrawRange(0, Math.max(0, (n - 1) * 6));
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  };
  return m;
}

// ---------------------------------------------------------------- a sketch map of India
// The hand-drawn outline used by MountainClear, EarthquakeClear and VolcanoClear, as [lon, lat].
// Indicative only: not a survey map, and it shows no borders. Rivers are sketched by hand through
// well-known towns on their banks; they are not survey lines either.
export const INDIA = [[68.2, 23.7], [68.6, 23.2], [69.0, 22.3], [69.7, 21.2], [70.4, 20.8], [71.6, 20.8], [72.2, 21.3], [72.7, 21.7], [72.8, 20.4], [72.8, 19.0], [73.0, 17.5], [73.5, 15.9], [74.1, 14.6], [74.8, 12.9], [75.7, 11.3], [76.2, 10.0], [76.6, 8.9], [77.5, 8.1], [78.2, 8.9], [79.0, 9.3], [79.3, 10.3], [79.9, 10.4], [79.8, 11.9], [80.3, 13.2], [80.1, 14.8], [80.3, 15.6], [81.2, 16.0], [82.3, 16.7], [83.5, 17.8], [84.9, 19.2], [86.4, 19.9], [87.0, 20.8], [87.3, 21.6], [88.6, 21.6], [89.1, 22.0], [88.9, 23.2], [88.6, 24.3], [88.1, 24.8], [88.4, 25.6], [88.9, 26.2], [89.8, 26.1], [89.8, 25.3], [92.0, 25.2], [92.4, 24.9], [91.3, 24.1], [91.2, 23.5], [91.6, 22.9], [92.3, 23.0], [92.6, 21.9], [93.2, 22.2], [93.4, 23.9], [94.2, 24.3], [94.7, 25.4], [95.2, 26.6], [96.2, 27.3], [97.1, 27.1], [97.4, 28.2], [96.3, 29.4], [95.4, 29.1], [94.0, 29.2], [92.5, 27.9], [91.7, 27.8], [92.1, 26.9], [90.4, 26.8], [89.0, 26.8], [88.9, 27.3], [88.8, 28.1], [88.1, 27.9], [88.0, 26.5], [86.0, 26.6], [84.8, 27.0], [83.3, 27.4], [81.7, 28.0], [80.1, 28.8], [80.5, 29.9], [81.0, 30.2], [79.9, 30.9], [78.9, 31.3], [78.7, 32.3], [79.5, 32.6], [78.9, 33.4], [80.3, 34.6], [80.2, 35.5], [78.0, 36.3], [76.0, 36.8], [74.7, 37.1], [73.2, 36.9], [72.6, 36.0], [73.4, 35.0], [73.2, 34.3], [73.6, 33.0], [74.6, 32.7], [75.3, 32.2], [74.6, 31.6], [74.5, 30.9], [73.9, 30.0], [73.0, 29.2], [72.3, 28.2], [71.0, 27.8], [70.2, 27.9], [69.6, 27.0], [70.3, 25.7], [71.0, 24.5], [69.7, 24.2], [68.8, 24.3]];
export const RIVERS = {
  Ganga: [[79.08, 30.93], [78.6, 30.15], [78.17, 29.95], [78.6, 29.2], [79.5, 27.5], [80.3, 26.5], [81.88, 25.43], [83.0, 25.32], [85.1, 25.6], [87.2, 25.4], [87.92, 24.8], [88.6, 24.2], [89.2, 23.8], [90.3, 23.2], [90.6, 22.4]],
  Hooghly: [[87.92, 24.8], [88.3, 23.9], [88.36, 22.57], [88.1, 21.8]],
  Yamuna: [[78.45, 31.0], [77.6, 30.1], [77.2, 28.6], [78.0, 27.2], [79.5, 26.2], [81.88, 25.43]],
  Brahmaputra: [[94.9, 29.5], [95.3, 28.1], [94.9, 27.5], [94.17, 26.95], [93, 26.7], [91.75, 26.18], [90, 26], [89.7, 24.6], [90.3, 23.2]],
  Kosi: [[86.9, 27.8], [87.1, 27], [86.93, 26.52], [86.9, 25.9], [87.2, 25.4]],
  Narmada: [[81.75, 22.67], [80.4, 22.9], [79.9, 23.1], [78.7, 22.75], [77.0, 22.4], [75.6, 22.1], [73.75, 21.83], [73.0, 21.7], [72.6, 21.6]],
  Godavari: [[73.5, 19.9], [75.0, 19.3], [77.3, 19.1], [79.4, 18.8], [80.9, 17.8], [81.8, 17.0], [82.3, 16.6]],
  Krishna: [[73.65, 17.95], [74.6, 16.8], [76.0, 16.3], [78.1, 16.0], [79.6, 16.4], [80.6, 16.4], [81.1, 15.8]],
  Kaveri: [[75.5, 12.4], [76.65, 12.42], [77.5, 12.0], [78.4, 11.0], [79.1, 10.9], [79.85, 11.1]],
  Mahanadi: [[81.9, 20.1], [82.6, 21.5], [83.9, 21.5], [84.9, 20.6], [85.9, 20.45], [86.6, 20.3]],
  Indus: [[79.0, 32.6], [77.6, 34.15], [76.0, 34.7], [74.6, 35.5], [72.5, 35.0]],
};

// For top-down chapters: keep the chapter's viewing direction but back the camera off far enough
// that a model w wide fits across the stage, whatever its shape. Re-run every frame; it only moves
// the camera when the stage changes shape and the viewer has not orbited.
export function fitWide(stage, view, w, extra = 1.08) {
  if (inReel() || stage.moved) return;
  const a = stage.camera.aspect, k = Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, a)));
  const [px, py, pz] = view.pos, [tx, ty, tz] = view.target, dx = px - tx, dy = py - ty, dz = pz - tz, len = Math.hypot(dx, dy, dz);
  const need = ((w / 2) / (Math.tan((21 * Math.PI) / 180) * a)) * extra, D = Math.max(len, need) / k, f = D / len;
  const pos = [tx + dx * f, ty + dy * f, tz + dz * f], hm = stage.home;
  if (!hm || Math.abs(hm.pos[0] - pos[0]) + Math.abs(hm.pos[1] - pos[1]) + Math.abs(hm.pos[2] - pos[2]) > 0.05) stage.setView(pos, view.target, 0.6);
}
