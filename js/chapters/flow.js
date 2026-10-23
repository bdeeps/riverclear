// Chapter 5: how much water and mud. Discharge Q = width × depth × mean speed, with the mean speed
// from Manning's equation (manning() in river.js, as in FloodClear) for a rectangular channel.
// The speed profile drawn in the water is the one-seventh power law, u(y) = (8/7) U (y/d)^(1/7),
// a standard approximation whose depth average is U.
// Sediment load = Q × concentration (1 g/L = 1 kg/m³); tonnes a day = Q × c × 86,400 ÷ 1,000.
// Gauged flows for comparison (GAUGES in river.js, GRDC records): Ganga at Farakka 1949–1973, mean
// 12,037 m³/s, highest 65,072 m³/s (5.4 times the mean); Brahmaputra at Pandu 1956–1979, mean
// 18,100 m³/s. The "big plains river" preset is illustrative, chosen to give a Farakka-sized flow;
// its width and depth are not measured values.
// Sediment to the Bay of Bengal (SED_GB): about 650 to 1,840 million tonnes a year for the Ganga and
// Brahmaputra together, depending on the study.
// An Olympic pool holds 2,500 m³ (50 m × 25 m × 2 m).
import { THREE, M, box, clamp, swarm, manning, GAUGES, SED_GB, board, panelBg, title, axes, dot, layout, reelView, fine, compact, fmtN, sig, inReel, rng, waterMat, COL, HEX, A } from '../river.js';

const NS = [{ v: 0.03, label: 'Smooth sand' }, { v: 0.035, label: 'Natural channel' }, { v: 0.05, label: 'Boulders' }];
const sw = (w) => clamp(1.2 + 1.55 * Math.log10(w / 2), 1.2, 7.4);      // drawn width (log scale)
const sd = (d) => clamp(0.35 + 0.85 * Math.log10(1 + d * 2), 0.3, 1.9);  // drawn depth (log scale)
const LEN = 3.2, BANK = 2.2;

export default {
  id: 'flow',
  short: 'Water and mud',
  title: 'How much water, how much mud',
  subtitle: 'A river’s flow is just width × depth × speed. In the monsoon all three rise at once.',
  view: { pos: [0, 5.9, 13.4], target: [0, 4.75, 0] },
  learn: `<p>How big is a river? The useful answer is its <b>discharge</b>: how many cubic metres of water pass a point each second (m³/s). It is a simple sum:</p>
    <p><b>discharge = width × depth × average speed</b></p>
    <p>A stream 5 m wide and half a metre deep, flowing at 1 m/s, carries 2.5 m³ (2,500 litres) every second. The Ganga at <b>Farakka</b> averaged about <b>12,000 m³/s</b> over 1949 to 1973, and the Brahmaputra at <b>Pandu</b> near Guwahati about <b>18,000 m³/s</b> over 1956 to 1979 (Global Runoff Data Centre records).</p>
    <p><b>What sets the speed?</b> The slope pulls the water downhill; friction with the bed and banks holds it back. <b>Manning’s equation</b> (1889) balances the two: water runs faster on a steeper slope, over a smoother bed, and in a deeper channel, where less of it rubs against the bottom. That is why a big lowland river on an almost flat plain can flow as fast as a small mountain stream.</p>
    <p><b>How it is measured.</b> At a gauging station, hydrologists measure the speed at many points across the river, by current meter or with sound (acoustic Doppler) instruments, and the depth along the same line. Adding up width × depth × speed for each strip gives the flow. They also read the water <b>level</b> every day. Plotting flow against level gives a <b>rating curve</b> (the board), so a level reading alone tells the flow. India’s <b>Central Water Commission</b> runs this network across the country and uses it to forecast floods.</p>
    <p><b>The monsoon pulse.</b> Indian rivers carry most of their year’s water in a few monsoon months. The highest flow on the Farakka record was about <b>five times</b> its average. How rain becomes a flood peak is in ${A('floodclear', 'FloodClear')}.</p>
    <p><b>Mud.</b> The water also carries sediment. Multiply the flow by how many grams of mud each litre holds and you have the <b>sediment load</b>. The Ganga and Brahmaputra together carry somewhere between about <b>650 million and 1.8 billion tonnes</b> a year to the Bay of Bengal, depending on the study: most of it in the monsoon, much of it the Himalaya on its way to the sea, and the stuff the delta is built from.</p>
    <p class="tip"><b>Try it:</b> start with the mountain stream, then the big plains river. Make the bed rough with boulders, then steepen the slope. Watch the speed, the flow and the dot on the rating curve.</p>`,
  terms: [
    { t: 'Discharge', d: 'The volume of water flowing past a point each second, in m³/s. Also called flow.' },
    { t: 'Stage', d: 'The height of the water surface at a gauging station.' },
    { t: 'Rating curve', d: 'A graph of flow against water level at one station, used to turn a level reading into a flow.' },
    { t: 'Gauging station', d: 'A place on a river where level, speed and flow are measured regularly.' },
    { t: 'Manning’s equation', d: 'Mean speed = R^(2/3) × √slope ÷ n: deeper, steeper and smoother channels flow faster.' },
    { t: 'Sediment load', d: 'The mass of sand, silt and clay a river carries, often in tonnes a day or a year.' },
  ],
  defaults: { w: 5, d: 0.5, S: 0.01, n: 0.05, c: 0.5, preset: 'stream' },
  controls: [
    { key: 'acts', type: 'buttons', label: 'Start from', items: [
      { label: 'Mountain stream', act: (s) => Object.assign(s, { w: 5, d: 0.5, S: 0.01, n: 0.05, c: 0.5 }) },
      { label: 'Big plains river', act: (s) => Object.assign(s, { w: 1500, d: 8, S: 0.00005, n: 0.03, c: 1 }) },
    ] },
    { key: 'w', type: 'log', label: 'Width', min: 2, max: 3000, fmt: (v) => `${sig(v, 2)} m` },
    { key: 'd', type: 'log', label: 'Average depth', min: 0.2, max: 20, fmt: (v) => `${sig(v, 2)} m` },
    { key: 'S', type: 'log', label: 'Slope', min: 0.00002, max: 0.03, fmt: (v) => `${sig(v * 1000, 2)} m drop per km` },
    { key: 'n', type: 'seg', label: 'Bed', options: NS.map((o) => ({ v: o.v, label: o.label })) },
    { key: 'c', type: 'log', label: 'Mud in the water', min: 0.05, max: 10, fmt: (v) => `${sig(v, 2)} g per litre` },
  ],
  quiz: [
    { q: 'A river is 100 m wide and 2 m deep, flowing at 1 m/s. What is its discharge?', options: ['102 m³/s', '200 m³/s', '50 m³/s', '2,000 m³/s'], answer: 1, why: 'Width × depth × speed = 100 × 2 × 1 = 200 cubic metres every second.' },
    { q: 'Why can a deep lowland river flow fast on an almost flat slope?', options: ['The sea pulls it', 'In deep water less of the flow rubs against the bed, so friction holds it back less', 'Lowland water is lighter', 'It cannot: lowland rivers are always slow'], answer: 1, why: 'Manning’s equation: speed grows with the hydraulic radius (roughly the depth) to the power 2/3.' },
    { q: 'What does a rating curve let a gauging station do?', options: ['Predict rain', 'Turn a reading of water level into a flow', 'Measure the mud', 'Count fish'], answer: 1, why: 'Once flow has been measured at many levels, the level alone tells you the flow.' },
  ],
  reel: [
    { ms: 5500, caption: 'Flow is width × depth × speed. A big plains river moves over 10,000 tonnes of water a second.', set: { w: 5, d: 0.5, S: 0.01, n: 0.05, c: 1 }, anim: { w: [5, 1500, true], d: [0.5, 8, true], S: [0.01, 0.00005, true], n: [0.05, 0.03] }, view: reelView(2.9, 1, 0, 0.9), spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const earthMat = M.matte(0x7d6a4c), grass = M.matte(0x5f9a4c);
    const left = box(1, 1, LEN, earthMat), right = box(1, 1, LEN, earthMat), bed = box(1, 0.3, LEN, M.matte(0x6a5a40));
    const gl = box(1, 0.04, LEN, grass), gr = box(1, 0.04, LEN, grass);
    const water = new THREE.Mesh(new THREE.BoxGeometry(1, 1, LEN), waterMat(0x2f86d8, 0.6)); water.renderOrder = 2;
    root.add(left, right, bed, gl, gr, water);
    const NP = 420, parts = swarm(NP, new THREE.SphereGeometry(0.03, 6, 4), M.glow(0xdff2ff)); parts.castShadow = false; parts.frustumCulled = false; root.add(parts);
    const NM = 300, mud = swarm(NM, new THREE.SphereGeometry(0.022, 5, 4), M.glow(0xc9a77c)); mud.castShadow = false; mud.frustumCulled = false; root.add(mud);
    const r = rng(41), pp = Array.from({ length: NP }, () => [r() - 0.5, r(), r() * LEN]), mp = Array.from({ length: NM }, () => [r() - 0.5, r(), r() * LEN]);
    const lW = stage.label('', [0, 0, 0], root), lD = stage.label('', [0, 0, 0], root), lQ = stage.label('', [0, 0, 0], root, 'hot');
    const lNote = stage.label('Width and depth drawn on log scales', [0, 0, 0], root);
    const minor = [lNote];

    let cur = null;
    const brd = board(root, 5.7, 3.8, 900, 600, (g, w, h) => {
      panelBg(g, w, h);
      if (!cur) return;
      title(g, 'Rating curve: flow at each water level', `This channel: ${sig(cur.w, 2)} m wide, slope ${sig(cur.S * 1000, 2)} m per km`);
      const dMax = Math.max(1, cur.d * 2.2), qMax = manning(cur.w, dMax, cur.S, cur.n).Q;
      const yMax = Math.pow(10, Math.ceil(Math.log10(Math.max(10, qMax, GAUGES.farakka.max * (cur.w > 200 ? 1.2 : 0)))));
      const ax = axes(g, w, h, { xMin: 0, xMax: dMax, yMin: 0.1, yMax, yLog: true, xTicks: [0, dMax / 4, dMax / 2, (3 * dMax) / 4, dMax].map((v) => +sig(v, 2)), yTicks: [0.1, 1, 10, 100, 1000, 10000, 100000].filter((t) => t <= yMax), yFmt: (v) => fmtN(v, v < 1 ? 1 : 0), xLabel: 'water depth, m', yLabel: 'flow, m³/s (log scale)', y1: 110 });
      if (cur.w > 200) [[GAUGES.farakka.mean, 'Farakka, mean (GRDC 1949–73)'], [GAUGES.farakka.max, 'Farakka, highest on that record']].forEach(([q, t]) => { const y = ax.Y(q); g.strokeStyle = COL.e; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(ax.x0, y); g.lineTo(ax.x1, y); g.stroke(); g.setLineDash([]); g.fillStyle = COL.e; g.font = '18px sans-serif'; g.fillText(t, ax.x0 + 12, y - 8); });
      g.strokeStyle = COL.water; g.lineWidth = 5; g.beginPath();
      for (let i = 0; i <= 60; i++) { const dd = Math.max(0.01, (dMax * i) / 60), y = ax.Y(clamp(manning(cur.w, dd, cur.S, cur.n).Q, 0.1, yMax)); i ? g.lineTo(ax.X(dd), y) : g.moveTo(ax.X(dd), y); }
      g.stroke();
      dot(g, ax.X(cur.d), ax.Y(clamp(cur.Q, 0.1, yMax)), COL.gold, 10);
    }, [0, 0, 0]);

    const st = { U: 0, Q: 0 };
    let key = '';
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        const narrow = layout(stage, brd, { minor, modelTop: 2.9, w: 12.6, base: 0.9 });
        const m = manning(s.w, s.d, s.S, s.n); st.U = m.U; st.Q = m.Q;
        const W = sw(s.w), Dd = sd(s.d), H = Dd + 0.7, y0 = 0.3;
        bed.scale.set(W + 0.02, 1, 1); bed.position.set(0, y0 - 0.15 + 0.15, 0); bed.position.y = y0 - 0.15;
        left.scale.set(BANK, H + 0.3, 1); left.position.set(-W / 2 - BANK / 2, y0 - 0.3 + (H + 0.3) / 2, 0);
        right.scale.set(BANK, H + 0.3, 1); right.position.set(W / 2 + BANK / 2, y0 - 0.3 + (H + 0.3) / 2, 0);
        gl.scale.x = BANK; gl.position.set(-W / 2 - BANK / 2, y0 + H + 0.02, 0); gr.scale.x = BANK; gr.position.set(W / 2 + BANK / 2, y0 + H + 0.02, 0);
        water.scale.set(W, Dd, 1); water.position.set(0, y0 + Dd / 2, 0);
        water.material.color.set(0x2f86d8).lerp(new THREE.Color(0x8a6a44), clamp(Math.log10(s.c * 10) / 2.3, 0, 0.85));
        const vis = 0.5 + 1.6 * Math.sqrt(st.U);
        for (let i = 0; i < NP; i++) {
          const p = pp[i], yy = 0.04 + p[1] * 0.92, u = (8 / 7) * Math.pow(yy, 1 / 7) * (1 - 0.35 * Math.pow(Math.abs(p[0]) * 2, 6));
          p[2] += dt * vis * u; if (p[2] > LEN) p[2] -= LEN;
          parts.place(i, [p[0] * W * 0.96, y0 + yy * Dd, p[2] - LEN / 2]);
        }
        parts.done();
        const nm = Math.round(clamp(Math.log10(s.c / 0.05) / 2.3, 0.05, 1) * NM);
        for (let i = 0; i < NM; i++) { const p = mp[i]; p[2] += dt * vis * 0.9; if (p[2] > LEN) p[2] -= LEN; mud.place(i, [p[0] * W * 0.96, y0 + (0.03 + p[1] * 0.94) * Dd, p[2] - LEN / 2], null, i < nm ? 1 : 0.0001); }
        mud.done();
        lW.position.set(0, y0 + H + 0.35, LEN / 2); lNote.position.set(-W / 2 - BANK / 2, y0 + H + 0.35, -LEN / 2); lW.element.innerHTML = `${sig(s.w, 2)} m wide`;
        lD.position.set(W / 2 + 0.2, y0 + Dd / 2, LEN / 2 + 0.05); lD.element.innerHTML = `${sig(s.d, 2)} m deep`; lD.visible = !narrow;
        lQ.position.set(-W / 2 + 0.2, y0 + Dd + 0.15, LEN / 2 - 0.3); lQ.element.innerHTML = `${sig(st.U, 2)} m/s → <b>${fmtN(st.Q, st.Q < 10 ? 1 : 0)} m³/s</b>`;
        const k2 = `${s.w}|${s.d}|${s.S}|${s.n}`;
        if (k2 !== key) { key = k2; cur = { w: s.w, d: s.d, S: s.S, n: s.n, Q: st.Q }; brd.redraw(); }
      },
      dispose() { stage.setShift(0, 0); },
      readout: (s) => {
        const tday = (st.Q * s.c * 86400) / 1000, myr = (tday * 365) / 1e6, pool = 2500 / Math.max(1e-9, st.Q);
        return compact(`<div class="big">${fmtN(st.Q, st.Q < 10 ? 1 : 0)} m³/s</div>
          <div class="row"><span>Average speed (Manning)</span><b>${sig(st.U, 2)} m/s</b></div>
          <div class="row"><span>Width × depth × speed</span><b>${sig(s.w, 3)} × ${sig(s.d, 2)} × ${sig(st.U, 2)}</b></div>
          <div class="row"><span>Fills an Olympic pool in</span><b>${pool < 1 ? `${sig(pool, 2)} s` : pool < 120 ? `${fmtN(pool, 0)} s` : `${fmtN(pool / 60, 0)} min`}</b></div>
          <div class="row"><span>Mud carried</span><b>${tday < 10 ? sig(tday, 2) : fmtN(tday)} tonnes a day</b></div>
          <div class="row"><span>If it kept that up all year</span><b>${myr < 1 ? sig(myr, 2) : fmtN(myr)} million t</b></div>
          ${fine(`<small>Ganga and Brahmaputra together: about ${fmtN(SED_GB.lo)} to ${fmtN(SED_GB.hi)} million tonnes a year, by study. Speed from Manning’s equation.</small>`)}`);
      },
    };
  },
};
