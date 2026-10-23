// Chapter 2: water finds a way. Rain on a height grid of 96 × 72 cells, each standing for a square
// 500 m across (so the land is 48 km by 36 km). The sea is along the front edge.
// The model (makeNetwork in river.js, labelled as a model in the text):
//   every cell sends its water to the neighbour down the steepest slope (D8 routing), after hollows
//   have been filled to their spill point (priority-flood);
//   a cell draining more than 14 cells (3.5 km²) is drawn as a stream;
//   stream orders are Strahler's; the bifurcation ratio is the average of N(k) ÷ N(k + 1);
//   "carve" runs the stream-power law with uplift (Braun and Willett 2013), in model units.
// Real figures in the text: Ganga basin in India 861,404 km², "nearly 26.2 %" of India's area
// (CWC, "About Ganga Basin"); the Ganga is 2,525 km long, and the Bhagirathi leaves the Gangotri
// glacier at Gaumukh at 3,892 m (Uttarakhand government, "Course of Ganga"; a 2019 study in the
// Journal of Glaciology gives about 3,950 m); the glacier is about 30 km long with an area of about
// 144 km²; its snout has retreated at rates measured between about 7 and 22 m a year, depending on
// the period and method (about 9 m a year for 2006–2015 in the same study).
// Typical bifurcation ratios of 3 to 5: Strahler (1957, Trans. AGU 38).
import { THREE, M, clamp, smooth, swarm, makeNetwork, fbm, rnd, board, panelBg, title, axes, fitNarrow, fitWide, fine, compact, fmtN, inReel, gridMesh, skirtMesh, waterMat, COL, HEX, A, rng } from '../river.js';

const MAXC = 600, NX = 96, NZ = 72, W = 11, D = (W * NZ) / NX, CELL_KM = 0.5, THR = 14, VS = 1.0;
const cx = (i) => -W / 2 + (i / (NX - 1)) * W, cz = (k) => -D / 2 + (k / (NZ - 1)) * D;
const ORD_HEX = [0, 0x6aa6d6, 0x3fa6ff, 0x2a86f0, 0x1f6ae0, 0x1c56c8, 0x1a44b0];
const BASIN_HEX = [0xff7a59, 0xffd35a, 0xa3e635, 0xc49bff, 0x8ef0ff, 0xff5a8a];

function shapeLand(net, s) {
  const { h, K } = net, seed = s.seed * 7;
  for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
    const c = k * NX + i, u = i / (NX - 1), v = 1 - k / (NZ - 1);
    let y = s.tilt * v * 2.4 + s.relief * 2.2 * fbm(u * 4.2 + seed, v * 3.3 + seed * 0.7, 5, seed);
    y += 0.6 * s.relief * Math.sin(Math.PI * u) * v;                                 // the land rises inland, a little more in the middle
    let hard = 1;
    if (s.rock === 'bands') {                                                          // tilted beds of hard and soft rock, striking left to right
      const band = 0.5 + 0.5 * Math.cos((2 * Math.PI * k) / 13 + 0.6 * fbm(u * 2, 0.3, 2, seed));
      y += 1.1 * s.relief * band * v; hard = band > 0.55 ? 0.4 : 1;
    }
    h[c] = Math.max(0, y) + (k === NZ - 1 ? -0.02 : 0); K[c] = hard;
  }
}

const VIEW = { pos: [0.6, 13.6, 12.6], target: [0.6, 0.4, 0.4] };
export default {
  id: 'network',
  short: 'Water finds a way',
  title: 'Water finds a way',
  subtitle: 'Rain runs down the steepest slope. Trickles join, and a river network grows like a tree.',
  view: VIEW,
  learn: `<p>No one digs a river. Rain does it. Every drop that does not soak in or evaporate runs <b>downhill</b>, and it always takes the <b>steepest way down</b> from where it is. Drops from neighbouring slopes meet in the same hollow, so trickles join into rills, rills into streams, and streams into a river.</p>
    <p>The model does exactly that on a patch of land 48 km by 36 km, cut into 500 m squares. Each square sends its water to the lowest of its eight neighbours. A hollow fills like a lake until it spills. Add up all the squares upstream of a point and you get its <b>drainage area</b>. Where that area is big enough, the model draws a stream.</p>
    <p><b>Basins and divides.</b> All the land that drains to one river is its <b>drainage basin</b> (catchment). The high ground between two basins is a <b>divide</b>: a drop landing on one side ends in one river, a drop a metre away in another. The <b>Ganga basin</b> covers 861,404 km² of India, nearly <b>26 %</b> of the country (Central Water Commission), plus land in Nepal, Tibet and Bangladesh.</p>
    <p><b>Stream order.</b> Arthur Strahler gave every stream a number. A stream with no tributaries is <b>order 1</b>. Where two order-1 streams meet they make an order-2 stream, two order-2 streams make order 3, and so on. A small stream joining a big one does not raise its order. Each order has roughly <b>three to five times</b> fewer streams than the one below it. Robert Horton spotted that pattern in 1945.</p>
    <p><b>Trees and trellises.</b> On even rock, networks branch like a tree: <b>dendritic</b>. Where hard and soft beds run in bands, streams follow the soft valleys and join at right angles: <b>trellis</b>.</p>
    <p><b>Why rivers flow in the dry season.</b> Rain that soaked in moves slowly through the ground as <b>groundwater</b> and seeps into the riverbed for months. That steady seep is <b>baseflow</b>. Himalayan rivers also get melt from snow and glaciers. The Bhagirathi, the Ganga's source stream, leaves the <b>Gangotri glacier</b> (about 30 km long) at its snout, <b>Gaumukh</b>, at about 3,900 m. The snout has been pulling back, at rates measured between about 7 and 22 m a year depending on the years and method. ${A('mountainclear', 'MountainClear')} has more on glaciers, and ${A('rainclear', 'RainClear')} on where the rain comes from.</p>
    <p class="tip"><b>Try it:</b> press <b>Rain</b> and watch the network grow headward from the coast. Then switch the rock to bands, tilt the land more, or let it <b>carve</b> its valleys for a while.</p>`,
  terms: [
    { t: 'Drainage basin', d: 'All the land that drains to one river and its tributaries. Also called a catchment or watershed.' },
    { t: 'Divide', d: 'The high ground between two basins. Rain on either side ends up in different rivers.' },
    { t: 'Tributary', d: 'A stream or river that flows into a bigger one.' },
    { t: 'Confluence', d: 'The place where two rivers meet, such as Devprayag, where the Bhagirathi and Alaknanda become the Ganga.' },
    { t: 'Stream order', d: 'Strahler’s numbering: unbranched streams are order 1; two of order n meeting make order n + 1.' },
    { t: 'Bifurcation ratio', d: 'How many streams of one order there are for each stream of the next order up. Usually about 3 to 5.' },
    { t: 'Baseflow', d: 'The part of a river’s flow that seeps in from groundwater, which keeps it running between rains.' },
    { t: 'Dendritic, trellis', d: 'Network patterns: branching like a tree on even rock; at right angles where hard and soft bands alternate.' },
  ],
  defaults: { tilt: 0.55, relief: 0.6, rock: 'even', rain: true, carve: false, basins: false, seed: 1, go: 0, drop: 0 },
  controls: [
    { key: 'tilt', type: 'range', label: 'Tilt the land towards the sea', min: 0.1, max: 1.5, step: 0.05, fmt: (v) => v.toFixed(2) },
    { key: 'relief', type: 'range', label: 'Raise the hills', min: 0.15, max: 1.4, step: 0.05, fmt: (v) => v.toFixed(2) },
    { key: 'rock', type: 'seg', label: 'Rock', options: [{ v: 'even', label: 'Even rock' }, { v: 'bands', label: 'Hard and soft bands' }] },
    { key: 'rain', type: 'toggle', label: 'Rain', hint: 'Turning it on regrows the network from the coast.' },
    { key: 'carve', type: 'toggle', label: 'Let the rivers carve', hint: 'Stream-power erosion with slow uplift: a model, in model time.' },
    { key: 'basins', type: 'toggle', label: 'Colour the biggest basins and their divides' },
    { key: 'acts', type: 'buttons', label: 'More', items: [
      { label: 'Follow one drop', act: (s) => { s.drop = (s.drop || 0) + 1; } },
      { label: 'New landscape', act: (s) => { s.seed = (s.seed % 9) + 1; s.carve = false; } },
    ] },
  ],
  quiz: [
    { q: 'Two order-2 streams meet. What is the order of the stream below the junction?', options: ['2', '3', '4', 'It depends on their length'], answer: 1, why: 'In Strahler’s scheme two streams of the same order n make order n + 1. A smaller stream joining would not raise it.' },
    { q: 'What is a divide?', options: ['A dam across a river', 'The high ground between two drainage basins', 'Where a river splits in a delta', 'A waterfall'], answer: 1, why: 'Rain falling on either side of a divide drains to different rivers.' },
    { q: 'Why does a big river keep flowing weeks after the last rain?', options: ['The sea pushes water back up it', 'Groundwater seeps in steadily (baseflow), and in the Himalaya snow and ice melt too', 'Evaporation adds water', 'It does not: all rivers dry up between rains'], answer: 1, why: 'Water that soaked in moves slowly through the ground and seeps into the riverbed for months.' },
  ],
  reel: [
    { ms: 6000, caption: 'Rain runs down the steepest way. Trickles join, and a river network grows from the coast.', set: { tilt: 0.55, relief: 0.6, rock: 'even', rain: false, carve: false, basins: false, seed: 1 }, act: (s) => { s.rain = true; }, view: { pos: [0.4, 9.6, 8.6], target: [0.4, 0.2, 0.3] }, spin: 0 },
    { ms: 5500, caption: 'Every drop lands in one basin. The high ground between basins is the divide.', set: { basins: true, rain: true }, view: { pos: [0.4, 10.6, 7.2], target: [0.4, 0.2, 0.2] }, spin: 0.3 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const net = makeNetwork(NX, NZ, 1);
    const land = gridMesh(NX, NZ, W, D); root.add(land);
    const sideMat = M.matte(0x6a5640);
    const xs = Array.from({ length: NX }, (_, i) => cx(i));
    const front = skirtMesh(xs, xs.map(() => D / 2), xs.map(() => 0.05), -0.25, sideMat); root.add(front);
    const zs = Array.from({ length: NZ }, (_, k) => cz(k));
    const left = skirtMesh(zs.map(() => -W / 2), zs, zs.map(() => 0.05), -0.25, sideMat), right = skirtMesh(zs.map(() => W / 2), zs, zs.map(() => 0.05), -0.25, sideMat);
    const back = skirtMesh(xs, xs.map(() => -D / 2), xs.map(() => 0.05), -0.25, sideMat); root.add(left, right, back);
    const sea = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.3, 1.6), waterMat(HEX.sea, 0.85)); sea.position.set(0, -0.1, D / 2 + 0.8); root.add(sea);
    // raindrops running down, and one followed drop
    const ND = 700, drops = swarm(ND, new THREE.SphereGeometry(0.035, 6, 4), M.glow(0xbfe6ff)); drops.castShadow = false; drops.frustumCulled = false; root.add(drops);
    const r = rng(11), dp = Array.from({ length: ND }, () => ({ c: (r() * NX * NZ) | 0, f: r() }));
    const NT = 220, trail = swarm(NT, new THREE.SphereGeometry(0.06, 8, 6), M.glow(0xffe27a)); trail.castShadow = false; trail.frustumCulled = false; root.add(trail);
    const lSea = stage.label('Sea', [W / 2 - 0.8, 0.25, D / 2 + 0.9], root);
    const lRiver = stage.label('', [0, 0.5, D / 2 - 0.3], root, 'hot');
    const lHills = stage.label('Hills and divides', [-W / 2 + 0.6, 2.4, 0.4], root);
    const minor = [lSea, lHills];

    const yOf = (c) => 0.05 + net.h[c] * VS;
    const pOf = (c) => [cx(c % NX), yOf(c) + 0.04, cz((c / NX) | 0)];
    const col = new THREE.Color(), cLow = new THREE.Color(0x3f6b30), cMid = new THREE.Color(0x6b6a3a), cHigh = new THREE.Color(0x6a5c4e), cTop = new THREE.Color(0x8d8379), tmp = new THREE.Color();
    let key = '', growT = 99, shown = THR, maxAcc = 1, last = null, trailPath = [], trailT = 0, dropKey = 0, carveSteps = 0, tick = 0;

    const paint = (s) => {
      const top = new Map(); net.basins.slice(0, 6).forEach(([b], j) => top.set(b, j));
      let hmax = 0.01; for (let c = 0; c < net.N; c++) hmax = Math.max(hmax, net.h[c]);
      for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
        const c = k * NX + i, y = net.h[c], t = y / hmax;
        if (t < 0.35) col.copy(cLow).lerp(cMid, t / 0.35); else if (t < 0.7) col.copy(cMid).lerp(cHigh, (t - 0.35) / 0.35); else col.copy(cHigh).lerp(cTop, (t - 0.7) / 0.3);
        if (s.rock === 'bands' && net.K[c] < 0.5) col.lerp(tmp.set(0x5d5a58), 0.35);
        if (s.basins) {
          const j = top.get(net.basin[c]);
          col.lerp(tmp.set(j === undefined ? 0x555a66 : BASIN_HEX[j]), j === undefined ? 0.45 : 0.42);
          let edge = false;
          for (const [a, b] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const ii = i + a, kk = k + b; if (ii >= 0 && kk >= 0 && ii < NX && kk < NZ && net.basin[kk * NX + ii] !== net.basin[c] && (top.has(net.basin[c]) || top.has(net.basin[kk * NX + ii]))) edge = true; }
          if (edge) col.set(0xffffff);
        }
        const a = net.acc[c];
        if (a >= shown && net.ord[c] > 0) col.set(ORD_HEX[Math.min(6, net.ord[c])]);
        land.put(i, k, 0.05 + y * VS - (a >= shown ? 0.02 : 0), col);
      }
      // widen big rivers by one cell so they read from afar
      land.done();
      front.update(xs.map((_, i) => yOf((NZ - 1) * NX + i)));
      left.update(zs.map((_, k) => yOf(k * NX))); right.update(zs.map((_, k) => yOf(k * NX + NX - 1))); back.update(xs.map((_, i) => yOf(i)));
    };

    let cur = null;
    const brd = board(root, 4.6, 3.07, 900, 600, (g, w, h) => {
      panelBg(g, w, h);
      if (!cur) return;
      title(g, 'Streams of each order', `Horton’s law of stream numbers · ${cur.basins} km² drain to the biggest river`);
      const n = cur.counts.length, mx = Math.max(1, ...cur.counts);
      const ax = axes(g, w, h, { xMin: 0.5, xMax: Math.max(4, n) + 0.5, yMin: 1, yMax: Math.pow(10, Math.ceil(Math.log10(mx * 1.5))), yLog: true, xTicks: Array.from({ length: Math.max(4, n) }, (_, i) => i + 1), yTicks: [1, 10, 100, 1000].filter((t) => t <= Math.pow(10, Math.ceil(Math.log10(mx * 1.5)))), xLabel: 'Strahler order', yLabel: 'number of streams (log scale)', y1: 120 });
      cur.counts.forEach((v, i) => {
        const x = ax.X(i + 1), y = ax.Y(Math.max(1, v)), bw = 64;
        g.fillStyle = '#' + ORD_HEX[Math.min(6, i + 1)].toString(16).padStart(6, '0'); g.fillRect(x - bw / 2, y, bw, ax.y0 - y);
        g.fillStyle = COL.text; g.font = 'bold 22px sans-serif'; const t = String(v); g.fillText(t, x - g.measureText(t).width / 2, y - 10);
        if (i < n - 1 && cur.counts[i + 1]) { g.fillStyle = COL.gold; g.font = '19px sans-serif'; const q = `÷${(v / cur.counts[i + 1]).toFixed(1)}`; g.fillText(q, (x + ax.X(i + 2)) / 2 - g.measureText(q).width / 2, Math.min(y, ax.Y(cur.counts[i + 1])) - 40); }
      });
      g.fillStyle = COL.soft; g.font = '19px sans-serif'; g.fillText('Real river networks: usually ÷3 to ÷5 (Strahler 1957)', ax.x0 + 12, ax.y1 + 4);
    }, [3.4, 3.95, -D / 2 - 0.5]);
    brd.mesh.rotation.x = -0.25;

    const rebuild = (s) => { shapeLand(net, s); net.route(THR); carveSteps = 0; };
    const stats = { area: 0, share: 0, bif: 0, max: 0, counts: [] };
    const restat = () => {
      net.route(THR);
      maxAcc = 1; for (let c = 0; c < net.N; c++) if (net.acc[c] > maxAcc) maxAcc = net.acc[c];
      const cs = net.counts, ratios = []; for (let i = 0; i < cs.length - 1; i++) if (cs[i + 1]) ratios.push(cs[i] / cs[i + 1]);
      Object.assign(stats, { area: net.basins[0][1] * CELL_KM * CELL_KM, share: net.basins[0][1] / net.N, bif: ratios.length ? ratios.reduce((a, b) => a + b) / ratios.length : 0, max: net.maxOrd, counts: cs.slice() });
      cur = { counts: cs.slice(), basins: fmtN(stats.area) };
      brd.redraw();
    };

    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, minor, 0.12, 0.1);
        fitWide(stage, VIEW, 11.6);
        brd.mesh.visible = stage.host.clientWidth >= 560 || inReel();
        const k2 = `${s.tilt}|${s.relief}|${s.rock}|${s.seed}`;
        if (k2 !== key) { key = k2; rebuild(s); restat(); growT = s.rain ? 0 : 99; }
        if (s.rain && !last) growT = 0;
        last = s.rain;
        if (s.carve && carveSteps < MAXC) { for (let n = 0; n < 2; n++) { net.carve(1, 0.0005, 0.03); net.route(THR); } carveSteps += 2; tick += dt; if (tick > 0.3) { tick = 0; restat(); } }
        growT += dt;
        const g = smooth(growT / 5.5);
        shown = s.rain ? Math.max(THR, maxAcc * Math.pow(THR / maxAcc, g)) : 1e9;
        paint(s);
        // drops follow the arrows of steepest descent
        const show = s.rain ? ND : 0;
        for (let i = 0; i < ND; i++) {
          const p = dp[i];
          if (i >= show) { drops.place(i, [0, -5, 0], null, 0.0001); continue; }
          p.f += dt * 5;
          while (p.f >= 1) { p.f -= 1; const nx = net.rec[p.c]; if (nx === p.c) { p.c = (r() * net.N) | 0; } else p.c = nx; }
          const a = pOf(p.c), b = pOf(net.rec[p.c]);
          drops.place(i, [a[0] + (b[0] - a[0]) * p.f, a[1] + (b[1] - a[1]) * p.f + 0.03, a[2] + (b[2] - a[2]) * p.f]);
        }
        drops.done();
        // one followed drop, from a high cell to the sea
        if (s.drop !== dropKey) {
          dropKey = s.drop; let best = 0, bh = -1; const rr = rng(97 + s.drop);
          for (let t = 0; t < 40; t++) { const c = (rr() * net.N * 0.5) | 0; if (net.h[c] > bh) { bh = net.h[c]; best = c; } }
          trailPath = [best]; let c = best; while (net.rec[c] !== c && trailPath.length < NT) { c = net.rec[c]; trailPath.push(c); }
          trailT = 0;
        }
        trailT += dt * 22;
        for (let i = 0; i < NT; i++) { const on = i < trailPath.length && i < trailT; trail.place(i, on ? pOf(trailPath[i]) : [0, -5, 0], null, on ? 1 : 0.0001); }
        trail.done();
        lRiver.element.innerHTML = s.rain ? `Order-${stats.max} river reaches the sea` : 'Dry land: press Rain';
        const mouth = net.basins[0]?.[0] ?? 0; lRiver.position.set(cx(mouth % NX), 0.55, D / 2 - 0.1);
      },
      dispose() { stage.setShift(0, 0); },
      readout: (s) => compact(`<div class="big">${s.rain ? `${stats.counts.reduce((a, b) => a + b, 0)} streams, up to order ${stats.max}` : 'Waiting for rain'}</div>
        <div class="row"><span>Biggest basin</span><b>${fmtN(stats.area)} km² · ${Math.round(stats.share * 100)} % of the land</b></div>
        <div class="row"><span>Streams of order 1, 2, 3…</span><b>${stats.counts.join(' · ')}</b></div>
        <div class="row"><span>Bifurcation ratio</span><b>${stats.bif.toFixed(1)}</b></div>
        <div class="row"><span>Pattern</span><b>${s.rock === 'bands' ? 'trellis-like' : 'dendritic'}</b></div>
        ${s.carve ? `<div class="row"><span>Carving</span><b>${fmtN(carveSteps)} model steps${carveSteps >= MAXC ? ' (done)' : ''}</b></div>` : ''}
        ${fine('<small>A model: steepest-descent routing on a 500 m grid; a stream drains at least 3.5 km².</small>')}`),
    };
  },
};
