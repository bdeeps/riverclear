// Chapter 4: meanders, oxbows and deltas. Two models from river.js, both labelled as models:
//   makeMeander: Howard and Knutson (1984) bend migration with cut-offs. Lengths in channel widths;
//     the scene shows 40 widths of valley (1 width = 0.3 scene units).
//   makeDelta: a channel traced down the steepest path with inertia, dropping sediment where it
//     meets deep water and a little on its banks, so the mouth builds out and the river avulses.
// "Meandering" is often defined as a sinuosity above 1.5 (Leopold, Wolman and Miller, Fluvial
// Processes in Geomorphology, 1964).
// Real places in the text (hedged there):
//   Sundarbans: UNESCO World Heritage, Sundarbans National Park (India) inscribed 1987;
//     The Sundarbans (Bangladesh) inscribed 1997, 139,500 ha; the forest lies on the delta of the
//     Ganga, Brahmaputra and Meghna. The delta's own area is not well defined; it is commonly called
//     the world's largest.
//   Majuli: often said to have been about 1,250 km² early in the 20th century; recent estimates are
//     about 500 km² or less (a 2025 EGU abstract: 629 km² in 1975, 487 km² in 2024). Figures differ
//     with date and method. Majuli became a district of Assam in 2016.
//   Kosi: Gole and Chitale (1966, J. Hydraulics Division, ASCE) described a westward movement of
//     "approximately 70 miles in 230 yr"; a re-examination of old maps (Chakraborty et al. 2010,
//     Quaternary International 227) found swings back and forth rather than one steady drift.
import { THREE, M, box, clamp, swarm, makeMeander, makeDelta, gridMesh, ribbonMesh, waterMat, fitNarrow, fitWide, fine, compact, fmtN, inReel, rng, HEX, A } from '../river.js';

const SC = 0.3, L = 40, BELT = 8.5, PW = L * SC + 1.2, PD = 2 * BELT * SC + 1.4, TOP = 0.3;
const DNX = 72, DNZ = 56, DW = 12, DD = (DW * DNZ) / DNX, DV = 5;

const VIEW = { pos: [0, 12.6, 13.2], target: [0, -0.4, 0.4] };
export default {
  id: 'meander',
  short: 'Meanders and deltas',
  title: 'Meanders, oxbows and deltas',
  subtitle: 'On flat land a river swings from side to side, cuts off its own loops and builds new land at the sea.',
  view: VIEW,
  learn: `<p>Once a river reaches flat land it stops cutting down and starts swinging <b>sideways</b>. Any small bend grows.</p>
    <p>Here is why. Going round a bend, the fastest water is flung to the <b>outside</b>. It scours that bank, which caves in: a <b>cut bank</b>. On the <b>inside</b> of the bend the water is slow and shallow, so it drops sand and builds a <b>point bar</b>. One bank wears away while the other grows, so the whole loop moves outwards, and slowly downstream. These loops are <b>meanders</b>, named after the winding Menderes river in Turkey.</p>
    <p>Loops grow until two of them almost touch. In a flood the river breaks through the narrow <b>neck</b> and takes the short cut. The old loop is left behind as a curved <b>oxbow lake</b>, which slowly fills with mud and plants. The plains of the Ganga and Brahmaputra are full of them.</p>
    <p>The model moves the river’s centre line sideways at a speed set by how sharply it bends just upstream (the Howard–Knutson model). It is a model in channel widths and model time, but real meanders behave the same way.</p>
    <p><b>Braided rivers.</b> A river with more sand and gravel than it can carry, and banks that collapse easily, splits into many channels around shifting sand bars. The <b>Brahmaputra</b> in Assam is braided and kilometres wide. <b>Majuli</b>, an island in it, is one of the largest river islands in the world, and the river has been eating it: often said to be about 1,250 km² a century ago, recent estimates put it near 500 km² or less, though the figures differ with the date and method.</p>
    <p><b>Rivers that move.</b> The <b>Kosi</b> fans out of Nepal onto the plain of Bihar carrying so much sediment that it keeps building up its own bed and jumping to a lower path: an <b>avulsion</b>. Older studies said it had moved more than 100 km west in about 230 years; later map studies found it swung back and forth. It has been held between embankments since the 1950s, and when it broke through at Kusaha in 2008 it took one of its old courses (${A('floodclear', 'FloodClear')}).</p>
    <p><b>Deltas.</b> Where a river meets the sea it slows almost to a stop and drops its load. Sand and mud build out into the water, the river splits into <b>distributaries</b>, and when one route silts up it switches to another, so a delta grows lobe by lobe. The <b>Ganga–Brahmaputra delta</b>, shared by India and Bangladesh, is usually called the largest in the world. Its seaward edge is the <b>Sundarbans</b>, the biggest mangrove forest on Earth and a UNESCO World Heritage site (India’s part listed in 1987, Bangladesh’s in 1997), home of the Bengal tiger.</p>
    <p class="tip"><b>Try it:</b> speed up time and watch a loop grow until it cuts itself off. Then switch to <b>Delta</b> and watch the river build land and jump sideways.</p>`,
  terms: [
    { t: 'Meander', d: 'A loop in a river on flat land, which grows and moves as the river wears one bank and builds the other.' },
    { t: 'Cut bank', d: 'The steep outer bank of a bend, where fast water wears it away.' },
    { t: 'Point bar', d: 'The sand bank built on the inside of a bend, where the water is slow.' },
    { t: 'Oxbow lake', d: 'A curved lake left behind when a river cuts through the neck of a meander.' },
    { t: 'Sinuosity', d: 'Channel length divided by valley length. Above about 1.5 a river is called meandering.' },
    { t: 'Braided river', d: 'A river split into many channels around shifting bars of sand and gravel.' },
    { t: 'Avulsion', d: 'A river abandoning its channel for a new, lower course.' },
    { t: 'Delta, distributary', d: 'The land a river builds where it meets still water; the channels it splits into there.' },
  ],
  defaults: { mode: 'meander', speed: 1, erode: 1, flow: true, reset: 0 },
  controls: [
    { key: 'mode', type: 'seg', label: 'Model', options: [{ v: 'meander', label: 'Meandering river' }, { v: 'delta', label: 'Delta' }] },
    { key: 'speed', type: 'range', label: 'Speed of time', min: 0, max: 3, step: 0.05, fmt: (v) => `${v.toFixed(1)}×` },
    { key: 'erode', type: 'range', label: 'How easily the banks wear', min: 0.4, max: 1.6, step: 0.05, fmt: (v) => (v < 0.8 ? 'firm clay' : v > 1.2 ? 'loose sand' : 'silt'), hint: 'Meandering model only.' },
    { key: 'flow', type: 'toggle', label: 'Show the water moving', hint: 'Faster on the outside of each bend.' },
    { key: 'acts', type: 'buttons', label: 'Start again', items: [{ label: 'New river', act: (s) => { s.reset = (s.reset || 0) + 1; } }] },
  ],
  quiz: [
    { q: 'On which bank of a meander does the river wear the land away fastest?', options: ['The inside of the bend', 'The outside of the bend', 'Both the same', 'Neither: meanders do not erode'], answer: 1, why: 'The fastest water swings to the outside, scouring a steep cut bank. The slow inside builds a point bar.' },
    { q: 'How is an oxbow lake made?', options: ['A dam is built', 'The river cuts through the narrow neck of a loop and leaves the loop behind', 'Rain fills a hollow', 'A glacier carves it'], answer: 1, why: 'When two parts of a loop meet, the river takes the short cut and abandons the loop.' },
    { q: 'Why does a delta grow lobe by lobe instead of evenly?', options: ['Tides push it', 'The river drops sediment at its mouth until that path silts up, then jumps to a lower route', 'Mangroves plant it', 'The sea level rises every year'], answer: 1, why: 'Building up the mouth makes another path lower, and the river switches to it: an avulsion.' },
  ],
  reel: [
    { ms: 6000, caption: 'Fast water wears the outside of each bend. The inside fills with sand, so the loops grow.', set: { mode: 'meander', erode: 1.2, flow: true }, anim: { speed: [2.2, 2.2] }, view: { pos: [8, 10.5, 7.5], target: [0.4, 0, 0] }, spin: 0 },
    { ms: 5500, caption: 'At the sea the river drops its load, builds land, and jumps to a new path.', set: { mode: 'delta', speed: 2.5, flow: true }, view: { pos: [0, 10.4, 8.2], target: [0, 0, 0.6] }, spin: 0.25 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---------------- meandering river
    const mg = new THREE.Group(); root.add(mg);
    const plain = box(PW, TOP, PD, M.matte(0x4a7a38)); plain.position.y = TOP / 2; mg.add(plain);
    const soil = box(PW, 0.5, PD, M.matte(0x6b5236)); soil.position.y = -0.25; mg.add(soil);
    const chan = ribbonMesh(700, waterMat(0x2f86d8, 0.92)); chan.renderOrder = 3; mg.add(chan);
    const bed = ribbonMesh(700, M.matte(0x7a6446)); mg.add(bed);
    const OXN = 8, ox = Array.from({ length: OXN }, () => { const m = ribbonMesh(300, new THREE.MeshStandardMaterial({ color: 0x3f7fb8, roughness: 0.3, transparent: true, opacity: 0.9 })); m.visible = false; mg.add(m); return m; });
    const NB = 2600, bars = swarm(NB, new THREE.CylinderGeometry(0.045, 0.045, 0.02, 7), M.matte(HEX.sand)); bars.castShadow = false; bars.frustumCulled = false; mg.add(bars);
    const NE = 140, ero = swarm(NE, new THREE.BoxGeometry(0.07, 0.06, 0.07), M.glow(0xff7a59)); ero.castShadow = false; ero.frustumCulled = false; mg.add(ero);
    const NF = 360, fl = swarm(NF, new THREE.SphereGeometry(0.028, 6, 4), M.glow(0xdff2ff)); fl.castShadow = false; fl.frustumCulled = false; mg.add(fl);
    const r = rng(21), fp = Array.from({ length: NF }, () => [r(), r() - 0.5]);
    const lCut = stage.label('Cut bank: worn away', [0, 0.6, 0], mg, 'hot'), lBar = stage.label('Point bar: sand builds', [0, 0.6, 0], mg), lOx = stage.label('Oxbow lake', [0, 0.6, 0], mg);
    const lUp = stage.label('Flow →', [-PW / 2 + 0.7, 0.5, -0.2], mg);
    // ---------------- delta
    const dg = new THREE.Group(); root.add(dg);
    const dl = gridMesh(DNX, DNZ, DW, DD); dg.add(dl);
    const seaW = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.02, DD - 0.6), waterMat(HEX.sea, 0.55)); seaW.position.set(0, 0.6, 0.3); seaW.renderOrder = 2; dg.add(seaW);
    const dch = ribbonMesh(260, waterMat(0x3a9bff, 0.95)); dch.renderOrder = 4; dg.add(dch);
    const lApex = stage.label('River', [0, 1.6, -DD / 2 + 0.2], dg), lSea = stage.label('Sea', [DW / 2 - 1, 0.8, DD / 2 - 0.6], dg), lLobe = stage.label('New lobe', [0, 1, 0], dg, 'hot');
    const minor = [lUp, lSea];

    let mm = null, dd = null, key = '', acc = 0, barI = 0, steps = 0, flash = 0, dsteps = 0;
    const newRiver = (seed) => { mm = makeMeander({ L, ds: 0.5, amp: 0.5, seed }); for (let i = 0; i < 650; i++) mm.step(0.035, 1, BELT); mm.oxbows.length = 0; mm.cutoffs = 0; barI = 0; steps = 0; for (let i = 0; i < NB; i++) bars.place(i, [0, -9, 0], null, 0.0001); bars.done(); ox.forEach((o) => { o.visible = false; }); };
    const S = (p) => [p[0] * SC, p[1] * SC];
    const dcol = new THREE.Color(), dtmp = new THREE.Color();
    const dX = (i) => -DW / 2 + (i / (DNX - 1)) * DW, dZ = (k) => -DD / 2 + (k / (DNZ - 1)) * DD;
    const paintDelta = () => {
      const h = dd.h;
      for (let k = 0; k < DNZ; k++) for (let i = 0; i < DNX; i++) {
        const y = h[k * DNX + i];
        if (y > 0.03) dcol.set(0x4f7d3a).lerp(dtmp.set(0x2f5a2a), clamp((y - 0.03) / 0.05, 0, 1));
        else if (y > 0) dcol.set(0xd8c08a).lerp(dtmp.set(0x6f9a4a), y / 0.03);
        else dcol.set(0xb59a6a).lerp(dtmp.set(0x3a5266), clamp(-y / 0.3, 0, 1));
        dl.put(i, k, 0.6 + (y > 0 ? y * DV : y * 1.1), dcol);
      }
      dl.done();
      const pts = dd.path.map(([i, k]) => [dX(i), dZ(k)]);
      dch.set(pts, (i) => { const [a, b] = dd.path[i], y = dd.h[b * DNX + a]; return 0.62 + Math.max(0, y) * DV + 0.015; }, 0.16, (i, n) => 0.1 + 0.1 * (1 - i / n));
    };
    const stats = { sin: 1, cut: 0, ox: 0, land: 0, av: 0 };

    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, minor, 0.12, 0.1);
        fitWide(stage, VIEW, 13.8);
        const k2 = `${s.mode}|${s.reset}`;
        if (k2 !== key) {
          key = k2;
          if (s.mode === 'meander') newRiver(3 + s.reset * 7); else { dd = makeDelta(DNX, DNZ, 5 + s.reset); dsteps = 0; }
        }
        mg.visible = s.mode === 'meander'; dg.visible = s.mode === 'delta';
        [lCut, lBar, lOx, lUp].forEach((l) => { l.visible = mg.visible && (l !== lUp || stage.host.clientWidth >= 560); });
        [lApex, lSea, lLobe].forEach((l) => { l.visible = dg.visible && (l !== lSea || stage.host.clientWidth >= 560); });
        if (s.mode === 'meander') {
          acc += dt * s.speed * 60;
          let n = 0;
          while (acc >= 1 && n < 12) {
            acc -= 1; n++; steps++;
            if (mm.step(0.035, s.erode, BELT)) { flash = 2.5; const o = mm.oxbows[mm.oxbows.length - 1]; o.mesh = ox[(mm.oxbows.length - 1) % OXN]; }
            // point-bar sand: stamp the inside bank every few steps
            if (steps % 14 === 0) {
              const P = mm.pts, C = mm.curv();
              for (let i = 2; i < P.length - 2; i += 2) {
                if (Math.abs(C[i]) < 0.2) continue;
                const a = P[i - 1], b = P[i + 1], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, sg = Math.sign(C[i]);
                const off = 0.75 * sg, q = S([P[i][0] - (ty / tl) * off, P[i][1] + (tx / tl) * off]);
                bars.place(barI, [q[0], TOP + 0.005, q[1]], null, 1); barI = (barI + 1) % NB;
              }
              bars.done();
            }
          }
          if (acc > 12) acc = 0;
          const P = mm.pts, C = mm.curv(), R = mm.R || new Float32Array(P.length), sp = P.map(S);
          chan.set(sp, TOP + 0.012, 0.3); bed.set(sp, TOP + 0.004, 0.42);
          // the outer banks being cut
          let e = 0, bestCut = -1, bv = 0, bestBar = -1;
          for (let i = 2; i < P.length - 2 && e < NE; i += 3) {
            const v = Math.abs(R[i]); if (v < 0.18) continue;
            const a = P[i - 1], b = P[i + 1], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, sg = -Math.sign(R[i]);
            const q = S([P[i][0] - (ty / tl) * 0.62 * sg, P[i][1] + (tx / tl) * 0.62 * sg]);
            ero.place(e++, [q[0], TOP + 0.03, q[1]], null, clamp(v * 2.5, 0.5, 1.4));
            if (v > bv && Math.abs(P[i][0]) < L / 2 - 6) { bv = v; bestCut = i; }
          }
          for (; e < NE; e++) ero.place(e, [0, -9, 0], null, 0.0001);
          ero.done();
          if (bestCut > 0) {
            const i = bestCut, a = P[i - 1], b = P[i + 1], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, sg = -Math.sign(R[i]);
            const q = S([P[i][0] - (ty / tl) * 2.2 * sg, P[i][1] + (tx / tl) * 2.2 * sg]); lCut.position.set(q[0], 0.55, q[1]);
            const qb = S([P[i][0] + (ty / tl) * 2.4 * sg, P[i][1] - (tx / tl) * 2.4 * sg]); lBar.position.set(qb[0], 0.5, qb[1]);
            bestBar = i;
          }
          lCut.visible = lCut.visible && bestCut > 0; lBar.visible = lBar.visible && bestBar > 0;
          // oxbows: fade from open water to marsh
          let lastOx = null;
          mm.oxbows.forEach((o, j) => {
            o.age += dt * s.speed * 60;
            if (!o.mesh) return;
            const k = clamp(o.age / 900, 0, 1);
            o.mesh.visible = k < 1; o.mesh.set(o.pts.map(S), TOP + 0.008, 0.3 * (1 - 0.4 * k));
            o.mesh.material.color.set(0x3f7fb8).lerp(new THREE.Color(0x4a6b3a), k);
            if (k < 1) lastOx = o;
          });
          lOx.visible = lOx.visible && !!lastOx;
          if (lastOx) { const m = lastOx.pts[(lastOx.pts.length / 2) | 0]; lOx.position.set(m[0] * SC, 0.55, m[1] * SC); }
          // moving water: faster on the outside of bends
          const n2 = P.length;
          for (let i = 0; i < NF; i++) {
            const f = fp[i];
            if (!s.flow) { fl.place(i, [0, -9, 0], null, 0.0001); continue; }
            const j = Math.min(n2 - 2, Math.floor(f[0] * (n2 - 1))), c = C[j] || 0;
            const v = 1 + clamp(-f[1] * c * 6, -0.6, 0.9);
            f[0] += (dt * 0.06 * v * Math.max(0.3, s.speed)) / Math.max(1, n2 / 90);
            if (f[0] >= 1) { f[0] = 0; f[1] = r() - 0.5; }
            const a = P[j], b = P[j + 1], u = f[0] * (n2 - 1) - j, tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
            const x = a[0] + tx * u - (ty / tl) * f[1] * 0.8, y = a[1] + ty * u + (tx / tl) * f[1] * 0.8;
            fl.place(i, [x * SC, TOP + 0.03, y * SC]);
          }
          fl.done();
          Object.assign(stats, { sin: mm.sinuosity(), cut: mm.cutoffs, ox: mm.oxbows.filter((o) => o.age < 900).length });
          lCut.element.innerHTML = flash > 0 ? '<b>Cut-off!</b> The river takes the short cut' : 'Cut bank: worn away';
          flash -= dt;
        } else {
          acc += dt * s.speed * 35; let n = 0;
          while (acc >= 1 && n < 8) { acc -= 1; n++; dd.step(1); dsteps++; }
          if (acc > 8) acc = 0;
          if (dd.land() > DNX * (DNZ - 4) * 0.72) { dd.reset(); dsteps = 0; }
          if (!dd.path.length) dd.trace();
          paintDelta();
          const end = dd.path[dd.path.length - 1] || [DNX / 2, 10];
          lLobe.position.set(dX(end[0]), 1.15, dZ(end[1]));
          Object.assign(stats, { land: dd.land() / (DNX * (DNZ - 4)), av: dd.avulsions });
        }
      },
      dispose() { stage.setShift(0, 0); },
      readout: (s) => s.mode === 'meander'
        ? compact(`<div class="big">Sinuosity ${stats.sin.toFixed(2)}</div>
          <div class="row"><span>The river is</span><b>${stats.sin > 1.5 ? 'meandering' : stats.sin > 1.1 ? 'winding' : 'nearly straight'}</b></div>
          <div class="row"><span>Cut-offs so far</span><b>${stats.cut}</b></div>
          <div class="row"><span>Oxbow lakes still open</span><b>${stats.ox}</b></div>
          ${fine('<small>A model (Howard–Knutson bend migration), in channel widths and model time.</small>')}`)
        : compact(`<div class="big">${Math.round(stats.land * 100)} % of the bay is new land</div>
          <div class="row"><span>River jumps (avulsions)</span><b>${stats.av}</b></div>
          <div class="row"><span>Where sediment goes</span><b>mouth bar, then levees</b></div>
          ${fine('<small>A model: steepest path with inertia; sediment drops where the river meets deep water.</small>')}`),
    };
  },
};
