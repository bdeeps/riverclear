// Chapter 3: carving. Two things on one model.
// 1. Lift, carry, drop: the Hjulström chart computed in river.js (liftSpeed, dropSpeed) for water
//    1 m deep: Shields threshold (Soulsby and Whitehouse 1997) with a cohesion term for settled mud
//    (a modelling choice, said so in the text), the rough-bed log law, and fall speeds from Ferguson
//    and Church (2004). The chart's shape matches Hjulström (1935); its exact values are computed.
// 2. A waterfall retreating upstream: a hard cap rock over soft rock. The plunge pool undercuts the
//    soft rock, the cap breaks off, and the fall steps back, leaving a gorge. Rate from the slider;
//    Niagara as the check: about 11 km in about 12,000 years (an average near 1 m a year), now
//    about 30 cm a year (New York State Museum). The valley sides wear back with age in the model,
//    so a gorge opens into a V downstream. 1 scene unit = 1 km along the river; heights stretched.
// Waterfalls in the text: Jog Falls, Sharavathi river, Karnataka, 253 m in four streams (Raja,
// Rani, Roarer, Rocket); Athirappilly, Chalakudy river, Kerala, about 25 m (Thrissur district).
import { THREE, M, clamp, smooth, swarm, liftSpeed, dropSpeed, GRAINS, grainState, board, panelBg, title, axes, dot, wrap, gridMesh, skirtMesh, waterMat, fitNarrow, fitWide, fine, compact, fmtN, sig, inReel, rng, COL, HEX, A } from '../river.js';

const NXC = 150, NZC = 50, X0 = -6.5, X1 = 6.5, ZW = 2.6, TOPY = 2.4, CAP = 0.34, BED0 = 0.75, XF0 = 5.7;
const xAt = (i) => X0 + ((X1 - X0) * i) / (NXC - 1), zAt = (k) => -ZW + (2 * ZW * k) / (NZC - 1);
// find the biggest grain a flow can lift, and the smallest that drops out (log search)
function biggestLifted(U) { let lo = Math.log(1e-6), hi = Math.log(0.5); if (liftSpeed(0.3e-3) > U) return 0; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (liftSpeed(Math.exp(m)) <= U) lo = m; else hi = m; } return Math.exp(lo); }
function smallestDropped(U) { let lo = Math.log(1e-6), hi = Math.log(0.5); if (dropSpeed(0.5) < U) return Infinity; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (dropSpeed(Math.exp(m)) >= U) hi = m; else lo = m; } return Math.exp(hi); }
const mm = (d) => (d >= 1e-3 ? `${sig(d * 1000, 2)} mm` : `${sig(d * 1e6, 2)} µm`);

const VIEW = { pos: [0.5, 9.4, 11.6], target: [0.5, 1.4, 0] };
export default {
  id: 'carve',
  short: 'Carving',
  title: 'Lift, carry, drop: how rivers carve',
  subtitle: 'Fast water picks up rock and uses it to cut. Slow water lets it go. That is how valleys, gorges and waterfalls are made.',
  view: VIEW,
  learn: `<p>A river is a conveyor belt for broken rock. Whether it <b>lifts</b> a grain, <b>carries</b> it or <b>drops</b> it depends on how fast the water moves and how big the grain is.</p>
    <p>In 1935 the Swedish geographer <b>Filip Hjulström</b> drew this on one chart, from his studies of the River Fyris. The board shows the same chart worked out from later formulas for water 1 m deep. Three surprises:</p>
    <p><b>Sand is the easiest thing to move.</b> Grains of about 0.2 mm start rolling at about a third of a metre a second, a gentle walking pace.<br><b>Settled clay is hard to lift.</b> Mud grains are tiny but stick together once they settle, so it takes fast water to scour them. (The model adds that stickiness with one number chosen to give the chart’s shape. Real mud varies a lot.)<br><b>Once lifted, mud stays up.</b> Clay and silt sink so slowly that almost any flow keeps them in the water. That is why rivers in flood look brown, and why mud only settles in still water, in lakes, floodplains and the sea.</p>
    <p><b>Cutting down.</b> Sand and pebbles carried by fast water grind the riverbed like sandpaper. In the mountains, where rivers are steep and fast, they cut down quickly. The sides then slump and wash in, so a young river sits in a <b>V-shaped valley</b>. Where the river cuts faster than the sides can wear back, it makes a steep-sided <b>gorge</b>, like those of the Bhagirathi and Alaknanda in Garhwal, or the Narmada’s Marble Rocks at Bhedaghat.</p>
    <p><b>Waterfalls walk backwards.</b> Where hard rock lies over soft rock, the soft layer wears away faster. Water falling into the <b>plunge pool</b> scours under the hard lip until it breaks off, and the fall steps back upstream. Over thousands of years it leaves a gorge behind it. Niagara Falls has moved about 11 km in about 12,000 years. <b>Jog Falls</b> on the Sharavathi in Karnataka drops 253 m in four streams; <b>Athirappilly</b> on the Chalakudy in Kerala is about 25 m high and wide.</p>
    <p>${A('mountainclear', 'MountainClear')} races this cutting against the uplift of the Himalaya, and ${A('landslideclear', 'LandslideClear')} shows how steep valley sides fail.</p>
    <p class="tip"><b>Try it:</b> slide the water speed from a trickle to a torrent and watch which grains move. Then run time forward and watch the waterfall walk upstream.</p>`,
  terms: [
    { t: 'Erosion', d: 'Wearing away rock and soil and carrying it off.' },
    { t: 'Load', d: 'The sediment a river carries: rolled along the bed, held up in the water, or dissolved.' },
    { t: 'Hjulström curve', d: 'A chart of the water speed needed to lift, carry or drop grains of each size.' },
    { t: 'Abrasion', d: 'Grinding of the bed and banks by sand and pebbles the river carries.' },
    { t: 'V-shaped valley', d: 'A narrow valley cut by a fast river, whose sides slope in to the stream.' },
    { t: 'Gorge', d: 'A deep, narrow valley with steep rock walls.' },
    { t: 'Plunge pool', d: 'The deep pool scoured at the foot of a waterfall.' },
    { t: 'Knickpoint', d: 'A sudden step in a river’s course, such as a waterfall, which tends to move upstream.' },
  ],
  defaults: { U: 0.6, years: 4000, rate: 0.9, layers: true },
  controls: [
    { key: 'U', type: 'log', label: 'Water speed', min: 0.02, max: 5, fmt: (v) => `${v < 0.1 ? v.toFixed(2) : v.toFixed(1)} m/s`, ends: ['still pond', 'mountain torrent'] },
    { key: 'years', type: 'range', label: 'Time', min: 0, max: 14000, step: 100, fmt: (v) => `${fmtN(v)} years` },
    { key: 'rate', type: 'range', label: 'How fast the fall wears back', min: 0.1, max: 1.5, step: 0.05, fmt: (v) => `${v.toFixed(2)} m a year`, hint: 'Niagara has averaged about 0.9 m a year; today about 0.3.' },
    { key: 'layers', type: 'toggle', label: 'Show the rock layers' },
  ],
  quiz: [
    { q: 'Which grains does a slow river pick up most easily from its bed?', options: ['Settled clay', 'Sand', 'Large pebbles', 'Boulders'], answer: 1, why: 'Sand of about 0.2 mm moves at the lowest speed. Clay is tiny but sticks together once settled; pebbles are heavy.' },
    { q: 'Why does a river in flood look brown, even far downstream?', options: ['It is polluted', 'Clay and silt sink so slowly that the moving water keeps them up', 'Brown rocks dissolve', 'The sky reflects in it'], answer: 1, why: 'Fine mud falls so slowly that almost any flow holds it in suspension until the water is still.' },
    { q: 'Why do waterfalls move upstream?', options: ['The river flows backwards', 'Soft rock under the lip wears away, the hard lip breaks off, and the fall steps back', 'Earthquakes push them', 'Water piles up behind them'], answer: 1, why: 'The plunge pool undercuts the soft layer until the hard cap collapses, again and again.' },
  ],
  reel: [
    { ms: 5500, caption: 'Slow water lets grains drop. Fast water lifts sand first, then gravel and stones.', set: { years: 0, rate: 0.9, layers: true }, anim: { U: [0.1, 3, true] }, view: { pos: [-2.4, 5.8, 9.4], target: [-2.4, 2.8, 0] }, spin: 0 },
    { ms: 5500, caption: 'Hard rock over soft: the waterfall eats its way upstream and leaves a gorge.', set: { U: 1.2, layers: true }, anim: { years: [0, 12000] }, view: { pos: [7, 8.5, 9], target: [1.2, 1.4, 0] }, spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const land = gridMesh(NXC, NZC, X1 - X0, 2 * ZW); land.position.x = (X0 + X1) / 2; root.add(land);
    const xs = Array.from({ length: NXC }, (_, i) => xAt(i));
    // front cut-away: cap rock, soft rock (two skirts, one per layer, drawn as stripes)
    const softSk = skirtMesh(xs, xs.map(() => ZW), xs.map(() => TOPY - CAP), -0.05, M.matte(HEX.shale)); root.add(softSk);
    const capSk = skirtMesh(xs, xs.map(() => ZW + 0.002), xs.map(() => TOPY), TOPY - CAP, M.matte(HEX.cap)); root.add(capSk);
    const backSk = skirtMesh(xs, xs.map(() => -ZW), xs.map(() => TOPY), -0.05, M.matte(0x6a5640)); root.add(backSk);
    const river = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.62), waterMat(0x3a8fe0, 0.85)); river.renderOrder = 2; root.add(river);
    const low = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.62), waterMat(0x3a8fe0, 0.85)); low.renderOrder = 2; root.add(low);
    const fall = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1, 0.6), waterMat(0xcfe8ff, 0.75)); fall.renderOrder = 3; root.add(fall);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24), waterMat(0x1d5f9e, 0.9)); pool.scale.z = 0.7; root.add(pool);
    const NFOAM = 80, foam = swarm(NFOAM, new THREE.SphereGeometry(0.035, 6, 4), M.glow(0xffffff)); foam.castShadow = false; foam.frustumCulled = false; root.add(foam);
    // grains in the upper river, one swarm per class
    const r = rng(7), PER = 26, gr = GRAINS.map((g, j) => {
      const size = [0.016, 0.02, 0.028, 0.05, 0.09][j];
      const sw = swarm(PER, new THREE.IcosahedronGeometry(size, 0), M.matte(g.hex)); sw.frustumCulled = false; root.add(sw);
      return { sw, p: Array.from({ length: PER }, () => [X0 + 0.3 + r() * 5, (r() - 0.5) * 0.5, r(), r() < 0.5]) };
    });
    const lFall = stage.label('Waterfall', [0, 0, 0], root, 'hot'), lCap = stage.label('Hard cap rock', [X0 + 0.9, TOPY - CAP / 2, ZW + 0.1], root), lSoft = stage.label('Soft rock', [X0 + 0.9, 1.2, ZW + 0.1], root);
    const lGorge = stage.label('Gorge', [0, 0, 0], root), lV = stage.label('Older: opens into a V', [X1 - 1.2, TOPY + 0.2, -1.3], root), lUp = stage.label('Flow →', [X0 + 0.5, TOPY + 0.25, 0.2], root);
    const minor = [lCap, lSoft, lV, lUp];
    const col = new THREE.Color(), tmp = new THREE.Color();

    let cur = null, lastKey = '';
    const brd = board(root, 5.7, 3.8, 900, 600, (g, w, h) => {
      panelBg(g, w, h);
      if (!cur) return;
      title(g, 'Lift, carry or drop?', 'Computed for water 1 m deep, after Hjulström (1935)');
      const ax = axes(g, w, h, { xMin: 0.001, xMax: 300, yMin: 0.001, yMax: 10, xLog: true, yLog: true, xTicks: [0.001, 0.01, 0.1, 1, 10, 100], yTicks: [0.001, 0.01, 0.1, 1, 10], xFmt: (v) => (v < 1 ? String(v) : String(v)), yFmt: (v) => String(v), xLabel: 'grain size, mm', yLabel: 'water speed, m/s', y1: 110 });
      const curve = (f, c, wid) => { g.strokeStyle = c; g.lineWidth = wid; g.beginPath(); for (let e = -3; e <= Math.log10(300); e += 0.05) { const d = Math.pow(10, e) / 1000, y = ax.Y(clamp(f(d), 0.001, 10)); e === -3 ? g.moveTo(ax.X(d * 1000), y) : g.lineTo(ax.X(d * 1000), y); } g.stroke(); };
      curve((d) => liftSpeed(d), COL.hot, 4); curve((d) => dropSpeed(d), COL.e, 4);
      g.font = 'bold 21px sans-serif'; g.fillStyle = COL.hot; g.fillText('EROSION: grains lifted', ax.X(0.02), ax.Y(3.2));
      g.fillStyle = COL.text; g.fillText('TRANSPORT: kept moving', ax.X(0.004), ax.Y(0.09));
      g.fillStyle = COL.e; g.fillText('DEPOSITION', ax.X(5), ax.Y(0.012));
      const y = ax.Y(cur.U); g.strokeStyle = COL.gold; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(ax.x0, y); g.lineTo(ax.x1, y); g.stroke(); g.setLineDash([]);
      g.fillStyle = COL.gold; g.font = 'bold 20px sans-serif'; g.fillText(`${cur.U.toFixed(2)} m/s`, ax.x1 - 110, y - 10);
      GRAINS.forEach((gn) => { const st = grainState(gn.d, cur.U); dot(g, ax.X(gn.d * 1000), y, st === 'lifted' ? COL.hot : st === 'carried' ? COL.text : COL.e, 8); });
    }, [0, 0, 0]);

    const st = { lifted: 0, dropped: Infinity, xf: XF0, gorge: 0 };
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, minor, 0.14, 0.05);
        fitWide(stage, VIEW, 13.6, 1.15);
        brd.mesh.visible = !narrow || inReel();
        const tallReel = inReel() && stage.camera.aspect < 0.8;
        brd.mesh.position.set(tallReel ? stage.controls.target.x : 3.3, tallReel ? 5.6 : 4.9, -ZW - 0.3); brd.mesh.rotation.x = -0.2;
        const retreat = (s.years * s.rate) / 1000, xf = XF0 - retreat, wet = Math.min(1, s.U / 1.5);
        st.xf = xf; st.gorge = retreat;
        const key = `${s.years}|${s.rate}|${s.layers}`;
        if (key !== lastKey) {
          lastKey = key;
          const fronts = [];
          for (let k = 0; k < NZC; k++) for (let i = 0; i < NXC; i++) {
            const x = xAt(i), z = zAt(k), az = Math.abs(z);
            let y;
            if (x < xf) { const ch = Math.max(0, 1 - az / 0.4); y = TOPY - 0.14 * smooth(ch) - 0.03 * (x - X0) / (X1 - X0); }
            else {
              const age = ((x - xf) * 1000) / Math.max(0.05, s.rate), bed = BED0 - 0.12 * (x - xf) / (X1 - X0);
              const steep = 4.2 / (1 + age / 2500), w0 = 0.34;
              y = Math.min(TOPY, bed + Math.max(0, az - w0) * steep);
            }
            const t = clamp((y - BED0) / (TOPY - BED0), 0, 1);
            if (y > TOPY - 0.02) col.set(0x5f8a46).lerp(tmp.set(0x6b7a44), clamp((x - X0) / 14, 0, 1));
            else if (s.layers && y > TOPY - CAP) col.set(HEX.cap);
            else col.set(HEX.shale).lerp(tmp.set(0x8a7a62), 1 - t);
            land.put(i, k, y, col);
            if (k === NZC - 1) fronts.push(y);
          }
          land.done();
          capSk.update(fronts.map((y) => Math.max(TOPY - CAP, y)));
          softSk.update(fronts.map((y) => Math.min(TOPY - CAP, y)));
          capSk.visible = s.layers;
          softSk.material.color.set(s.layers ? HEX.shale : 0x8a6a4a);
        }
        // water
        const uw = xf - X0; river.scale.x = Math.max(0.01, uw); river.position.set(X0 + uw / 2, TOPY - 0.1, 0);
        const lw = X1 - xf; low.visible = lw > 0.05; low.scale.x = Math.max(0.01, lw); low.position.set(xf + lw / 2, BED0 + 0.02, 0);
        const drop = TOPY - 0.07 - BED0; fall.scale.y = drop; fall.position.set(xf + 0.05, BED0 + drop / 2, 0); fall.visible = xf < X1 - 0.02;
        pool.position.set(xf + 0.3, BED0 + 0.01, 0); pool.visible = fall.visible;
        river.material.color.set(0x3a8fe0).lerp(tmp.set(0x9a7a50), clamp((s.U - 0.4) / 2, 0, 0.75));
        for (let i = 0; i < NFOAM; i++) { const a = (i * 2.399 + time * 3) % 6.283, rr = 0.1 + ((i * 0.37 + time * 0.5) % 1) * 0.35; foam.place(i, [xf + 0.3 + Math.cos(a) * rr, BED0 + 0.06 + ((i * 0.13 + time) % 1) * 0.15, Math.sin(a) * rr * 0.7], null, fall.visible ? 1 : 0.0001); }
        foam.done();
        // grains: lifted ones race along with the water, carried ones roll, dropped ones rest
        GRAINS.forEach((gn, j) => {
          const state = grainState(gn.d, s.U), G2 = gr[j];
          G2.p.forEach((p, i) => {
            const moving = state === 'lifted' || (state === 'carried' && p[3]);
            const fine2 = j < 2, hop = fine2 ? 0.05 + 0.08 * p[2] : 0.012 + 0.04 * p[2] * (state === 'lifted' ? 1 : 0.2);
            if (moving) { p[0] += dt * Math.min(2.2, s.U * (fine2 ? 1.2 : 0.7)) * (0.6 + 0.6 * p[2]); if (p[0] > xf - 0.05) p[0] = X0 + 0.1; }
            const yb = TOPY - 0.13 + (moving ? hop + 0.02 * Math.sin(time * 6 + i) : 0) + [0.0, 0.0, 0.01, 0.02, 0.04][j];
            const show = fine2 ? moving : true;
            G2.sw.place(i, [Math.min(p[0], xf - 0.05), yb, p[1]], [p[2] * 3, i, 0], show ? 1 : 0.0001);
          });
          G2.sw.done();
        });
        st.lifted = biggestLifted(s.U); st.dropped = smallestDropped(s.U);
        cur = { U: s.U }; brd.redraw();
        lFall.position.set(xf, TOPY + 0.45, 0.4);
        lGorge.position.set(Math.min(X1 - 0.6, xf + Math.max(0.6, retreat / 2)), BED0 + 0.55, 1.0); lGorge.visible = retreat > 0.6;
        lGorge.element.innerHTML = `Gorge: ${sig(retreat, 2)} km`;
        lV.visible = lV.visible && retreat > 3;
      },
      dispose() { stage.setShift(0, 0); },
      readout: (s) => compact(`<div class="big">${s.U.toFixed(2)} m/s</div>
        <div class="row"><span>Biggest grain it can lift</span><b>${st.lifted ? mm(st.lifted) : 'none'}</b></div>
        <div class="row"><span>Grains that drop out</span><b>${isFinite(st.dropped) ? `${mm(st.dropped)} and bigger` : 'none'}</b></div>
        <div class="row"><span>Waterfall has moved back</span><b>${sig(st.gorge, 2)} km in ${fmtN(s.years)} years</b></div>
        ${fine('<small>Lift and drop speeds computed for water 1 m deep (Shields, log law, Ferguson–Church). Valley model with heights stretched.</small>')}`),
    };
  },
};
