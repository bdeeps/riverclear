// Chapter 1: a river from source to sea. A sketch landscape (not a map): a glacier and springs in the
// mountains, a steep upper course in V-shaped valleys, tributaries joining, a middle course, a wide
// floodplain with meanders and an oxbow lake, a delta and the sea, with the basin's divide.
// The landscape is built from a hand-placed river line; heights are stretched. Courses follow the
// usual textbook split into upper, middle and lower course and the mouth.
// Ganga landmarks named in the readout (no heights except the source): the Bhagirathi leaves the
// Gangotri glacier at Gaumukh, 3,892 m (Uttarakhand government); it meets the Alaknanda at Devprayag
// and is called the Ganga below; it leaves the mountains at Haridwar; the Yamuna joins at Prayagraj;
// the river splits at Farakka into the Hooghly (India) and the Padma (Bangladesh); it reaches the
// Bay of Bengal through the Sundarbans delta; length 2,525 km (Uttarakhand government).
import { THREE, M, clamp, smooth, swarm, fbm, gridMesh, skirtMesh, ribbonMesh, waterMat, fitNarrow, fitWide, fine, compact, inReel, rng, HEX, A } from '../river.js';
import { arrow, tube } from '../kit.js';

const NXJ = 170, NZJ = 90, XA = -8, XB = 8, ZA = -4.5, ZB = 4.5, SEA_X = 6.3;
const xAt = (i) => XA + ((XB - XA) * i) / (NXJ - 1), zAt = (k) => ZA + ((ZB - ZA) * k) / (NZJ - 1);
const MAIN = [[-7.3, -3.1], [-6.5, -2.6], [-5.6, -1.8], [-4.6, -1.3], [-3.4, -0.8], [-2.3, -0.3], [-1.2, 0.2], [-0.2, 0.4], [0.6, -0.2], [1.3, 0.7], [2.1, 0.0], [2.9, 0.9], [3.7, 0.1], [4.5, 1.0], [5.4, 0.8], [6.0, 0.9]];
const TRIBS = [[[-6.9, 1.6], [-6.0, 0.9], [-5.2, -0.2], [-4.6, -1.3]], [[-3.6, -3.9], [-3.4, -2.8], [-3.0, -1.6], [-2.6, -0.4]], [[-1.4, 3.6], [-0.9, 2.5], [-0.5, 1.4], [-0.2, 0.4]]];
const DISTR = [[[6.0, 0.9], [6.6, 0.3], [7.4, -0.5]], [[6.0, 0.9], [6.8, 1.0], [7.5, 1.1]], [[6.0, 0.9], [6.5, 1.7], [7.2, 2.5]]];
const DIVIDE = [[-7.9, -4.0], [-5.6, -4.3], [-3.3, -4.25], [-1.0, -3.2], [1.5, -2.4], [4.0, -2.0], [6.2, -1.6], [6.3, 3.4], [4.0, 3.3], [1.5, 3.4], [-0.9, 4.2], [-3.0, 3.6], [-5.3, 2.9], [-7.6, 2.6], [-8.0, -1.0]];
function curve(pts, n) { const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))); return c.getSpacedPoints(n).map((v) => [v.x, v.z]); }
const STAGES = [
  { to: 0.08, name: 'Source', what: 'Melting ice at a glacier’s snout, springs and rain on the high slopes.', ganga: 'Gaumukh, the snout of the Gangotri glacier, about 3,900 m up: the Bhagirathi begins.', job: 'Collecting water' },
  { to: 0.4, name: 'Upper course', what: 'Steep and fast. It cuts down, in a narrow V-shaped valley with rapids and waterfalls.', ganga: 'The Bhagirathi’s gorges; at Devprayag it meets the Alaknanda and becomes the Ganga.', job: 'Mostly erosion' },
  { to: 0.52, name: 'Middle course', what: 'Gentler. Tributaries join, the valley widens, and the river starts to swing.', ganga: 'Haridwar, where the Ganga leaves the mountains for the plains.', job: 'Carrying' },
  { to: 0.9, name: 'Lower course', what: 'Nearly flat. A wide floodplain, meanders, oxbow lakes and banks of silt.', ganga: 'The Gangetic plain: the Yamuna joins at Prayagraj; at Farakka the river splits.', job: 'Mostly deposition' },
  { to: 1.01, name: 'Mouth and delta', what: 'It slows into the sea, drops its load and splits into many channels.', ganga: 'The Ganga–Brahmaputra delta and the Sundarbans, on the Bay of Bengal.', job: 'Building land' },
];
const stageOf = (u) => STAGES.find((s) => u < s.to) || STAGES[STAGES.length - 1];

const VIEW = { pos: [0.3, 12.2, 14.2], target: [0.3, 0.2, 0.3] };
export default {
  id: 'journey',
  short: 'Source to sea',
  title: 'A river from source to sea',
  subtitle: 'Every river is rain and melt running downhill to the sea, collecting, cutting and building as it goes.',
  view: VIEW,
  learn: `<p>A river is <b>rain and melting snow and ice running downhill</b>, gathered into one channel. It starts high up and ends at the sea, a lake, or sometimes in a desert where it dries away.</p>
    <p><b>Source.</b> High in the hills a river is fed by rain, by <b>springs</b> where groundwater comes out, and in the Himalaya by <b>glaciers</b>. The Ganga’s headwater, the Bhagirathi, flows out of an ice cave at <b>Gaumukh</b>, the snout of the Gangotri glacier, at about 3,900 m. The Ganga then runs about <b>2,525 km</b> to the Bay of Bengal.</p>
    <p><b>Upper course.</b> Steep and fast. The river carries rocks that grind its bed, so it <b>cuts down</b> into a narrow <b>V-shaped valley</b>, with rapids and waterfalls.</p>
    <p><b>Middle course.</b> <b>Tributaries</b> join at <b>confluences</b>, so the river grows. The slope eases, the valley widens and the river starts to bend.</p>
    <p><b>Lower course.</b> On the plain it is wide, deep and slow-looking (though it carries far more water). It swings in <b>meanders</b>, leaves <b>oxbow lakes</b> and spreads silt over its <b>floodplain</b> in floods, which is why river plains are so fertile.</p>
    <p><b>Mouth.</b> Meeting the sea it slows, drops its mud and builds a <b>delta</b>, splitting into many channels, as the Ganga and Brahmaputra do in the Sundarbans.</p>
    <p>All the land that drains into one river is its <b>basin</b>, ringed by a <b>divide</b> of high ground. A river does three jobs, <b>erosion</b>, <b>transport</b> and <b>deposition</b>, and which one wins changes along the way. The next chapters take each in turn. For floods, see ${A('floodclear', 'FloodClear')}.</p>
    <p class="tip"><b>Try it:</b> drag <b>Follow the river</b> from source to sea and read how its job changes. Turn on the basin, then the groundwater.</p>`,
  terms: [
    { t: 'Source', d: 'Where a river begins: a spring, a glacier, a lake or many small streams on high ground.' },
    { t: 'Mouth', d: 'Where a river ends, usually in the sea or a lake.' },
    { t: 'Tributary', d: 'A smaller river that joins a bigger one.' },
    { t: 'Confluence', d: 'The point where two rivers meet.' },
    { t: 'Floodplain', d: 'The flat land beside a lowland river, built of silt the river spread in floods.' },
    { t: 'Delta', d: 'Land built of river sediment where a river meets the sea.' },
    { t: 'Groundwater', d: 'Water that has soaked into the ground and fills the gaps in soil and rock.' },
  ],
  defaults: { u: 0.25, basin: false, ground: false, flow: true },
  controls: [
    { key: 'u', type: 'range', label: 'Follow the river', min: 0, max: 1, step: 0.005, fmt: (v) => stageOf(v).name, ends: ['source', 'sea'] },
    { key: 'basin', type: 'toggle', label: 'Show the drainage basin and its divide' },
    { key: 'ground', type: 'toggle', label: 'X-ray: groundwater seeping into the river' },
    { key: 'flow', type: 'toggle', label: 'Show the water moving' },
  ],
  quiz: [
    { q: 'In which part of a river’s course does it mostly cut down into its bed?', options: ['The upper course', 'The lower course', 'The delta', 'An oxbow lake'], answer: 0, why: 'Up in the hills the river is steep and fast, and grinds its bed with the rock it carries.' },
    { q: 'Where does the Ganga’s headwater, the Bhagirathi, come from?', options: ['A lake in the Deccan', 'The snout of the Gangotri glacier at Gaumukh', 'The Bay of Bengal', 'A dam'], answer: 1, why: 'The Bhagirathi flows out of the Gangotri glacier at Gaumukh, at about 3,900 m.' },
    { q: 'Why are river floodplains good for farming?', options: ['They never flood', 'Floods spread fresh silt over them, year after year', 'They are high and dry', 'They are made of rock'], answer: 1, why: 'Floodplains are built from silt the river leaves behind when it spills over its banks.' },
  ],
  reel: [
    { ms: 5500, caption: 'A river is rain and melt running downhill, from a glacier or spring all the way to the sea.', set: { basin: false, ground: false, flow: true }, anim: { u: [0.02, 0.98] }, view: { pos: [9.5, 10.5, 10.5], target: [0.3, 0.6, 0] }, spin: 0 },
    { ms: 5000, caption: 'All the land that drains into it is its basin. The high ground around it is the divide.', set: { basin: true, u: 0.5 }, view: { pos: [7.5, 13.5, 8.5], target: [0.3, 0.4, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const main = curve(MAIN, 320), tribs = TRIBS.map((t) => curve(t, 90)), distr = DISTR.map((t) => curve(t, 40)), divide = curve(DIVIDE.concat([DIVIDE[0]]), 220);
    // river bed height along the main river: steep and concave at the top, nearly flat on the plain
    const bedAt = (u) => 0.14 + 3.0 * Math.pow(1 - smooth(clamp(u / 0.5, 0, 1)), 1.6) * (1 - u * 0.2);
    const near = (x, z, line) => { let best = 1e9, bi = 0; for (let i = 0; i < line.length; i += 2) { const dx = x - line[i][0], dz = z - line[i][1], d = dx * dx + dz * dz; if (d < best) { best = d; bi = i; } } return [Math.sqrt(best), bi / (line.length - 1)]; };
    const mount = (x) => smooth(clamp((-x - 0.4) / 5.5, 0, 1));
    const land = gridMesh(NXJ, NZJ, XB - XA, ZB - ZA); root.add(land);
    const col = new THREE.Color(), tmp = new THREE.Color(), H = new Float32Array(NXJ * NZJ);
    for (let k = 0; k < NZJ; k++) for (let i = 0; i < NXJ; i++) {
      const x = xAt(i), z = zAt(k), mt = mount(x);
      let y = 0.18 + mt * (2.0 + 1.5 * fbm(x * 0.45 + 3, z * 0.45 + 1, 5, 4)) + 0.05 * fbm(x * 2, z * 2, 2, 9);
      const [dm, um] = near(x, z, main);
      const bed = bedAt(um), side = 0.22 + 1.4 * mt;            // V-shaped in the hills, a wide flat plain below
      y = Math.min(y, bed + Math.max(0, dm - 0.08 - 0.5 * (1 - mt) * smooth(clamp((x + 0.5) / 2, 0, 1))) * (mt > 0.05 ? 2.4 * side : 0.4) + (1 - mt) * 0.02);
      for (const t of tribs) { const [dt2, ut] = near(x, z, t), tb = bedAt(0.1 + ut * 0.25) + 0.05; y = Math.min(y, tb + Math.max(0, dt2 - 0.05) * 2.2 * (0.3 + mt)); }
      if (x > SEA_X) y = Math.min(y, 0.14 - (x - SEA_X) * 0.5);
      H[k * NXJ + i] = y;
      if (y > 3.2) col.set(HEX.snow); else if (y > 1.6) col.set(0x5f574e).lerp(tmp.set(0x7a7066), (y - 1.6) / 1.6); else if (y > 0.55) col.set(0x4d7a3a).lerp(tmp.set(0x7d7368), (y - 0.55) / 1.05); else col.set(0x6d9a48).lerp(tmp.set(0x4d7a3a), clamp((y - 0.2) / 0.35, 0, 1));
      if (x > SEA_X - 0.5 && y < 0.2) col.set(0xd8c08a);
      land.put(i, k, y, col);
    }
    land.done();
    const hAt = (x, z) => { const i = clamp(Math.round(((x - XA) / (XB - XA)) * (NXJ - 1)), 0, NXJ - 1), k = clamp(Math.round(((z - ZA) / (ZB - ZA)) * (NZJ - 1)), 0, NZJ - 1); return H[k * NXJ + i]; };
    const xs = Array.from({ length: NXJ }, (_, i) => xAt(i)), zs = Array.from({ length: NZJ }, (_, k) => zAt(k)), side = M.matte(0x6a5640);
    const skirts = [skirtMesh(xs, xs.map(() => ZB), xs.map((x) => hAt(x, ZB)), -0.4, side), skirtMesh(xs, xs.map(() => ZA), xs.map((x) => hAt(x, ZA)), -0.4, side), skirtMesh(zs.map(() => XA), zs, zs.map((z) => hAt(XA, z)), -0.4, side)]; root.add(...skirts);
    const sea = new THREE.Mesh(new THREE.BoxGeometry(XB - SEA_X + 0.8, 0.5, ZB - ZA), waterMat(HEX.sea, 0.88)); sea.position.set((SEA_X + XB) / 2 + 0.4, -0.14, 0); root.add(sea);
    // water
    const wm = waterMat(0x3a9bff, 0.95);
    const rv = ribbonMesh(330, wm); rv.renderOrder = 3; rv.set(main, (i) => hAt(main[i][0], main[i][1]) + 0.03, 0, (i, n) => 0.06 + 0.2 * Math.pow(i / n, 0.8)); root.add(rv);
    tribs.forEach((t) => { const m = ribbonMesh(100, wm); m.renderOrder = 3; m.set(t, (i) => hAt(t[i][0], t[i][1]) + 0.03, 0, (i, n) => 0.04 + 0.05 * (i / n)); root.add(m); });
    distr.forEach((t) => { const m = ribbonMesh(50, wm); m.renderOrder = 3; m.set(t, (i) => Math.max(0.16, hAt(t[i][0], t[i][1]) + 0.03), 0.1); root.add(m); });
    const oxPts = curve([[2.2, 1.6], [2.6, 2.1], [3.1, 2.0], [3.2, 1.5]], 30);
    const ox = ribbonMesh(40, waterMat(0x3f7fb8, 0.95)); ox.set(oxPts, (i) => hAt(oxPts[i][0], oxPts[i][1]) + 0.03, 0.12); root.add(ox);
    const glacier = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), M.matte(HEX.ice, { roughness: 0.4 })); glacier.scale.set(0.9, 0.22, 0.55); glacier.rotation.y = 0.6; glacier.position.set(-7.55, hAt(-7.55, -3.35) + 0.05, -3.35); root.add(glacier);
    // the divide and the basin
    const div = tube(divide.map(([x, z]) => [x, Math.max(hAt(x, z), 0.2) + 0.08, z]), 0.035, M.glow(0xffe27a), true, 400); root.add(div);
    // groundwater: a blue layer under the plain and arrows into the river
    const gw = new THREE.Mesh(new THREE.BoxGeometry(SEA_X + 1.5, 0.28, ZB - ZA - 0.02), new THREE.MeshStandardMaterial({ color: 0x3a7ad0, transparent: true, opacity: 0.5, depthWrite: false })); gw.position.set((SEA_X - 1.5) / 2 - 0.4, -0.12, 0); root.add(gw);
    const gArrows = [];
    for (let j = 0; j < 10; j++) { const p = main[120 + j * 18] || main[main.length - 1], sgn = j % 2 ? 1 : -1, a = arrow(0x8fd4ff, 0.55, 0.16, 0.025); a.position.set(p[0], 0.08, p[1] + sgn * 0.75); a.rotation.x = sgn * Math.PI / 2; root.add(a); gArrows.push(a); }
    // moving water and the marker
    const NF = 300, fl = swarm(NF, new THREE.SphereGeometry(0.028, 6, 4), M.glow(0xdff2ff)); fl.castShadow = false; fl.frustumCulled = false; root.add(fl);
    const r = rng(5), fp = Array.from({ length: NF }, () => [r(), r() - 0.5]);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), M.glow(0xffb547)); root.add(marker);
    const lMark = stage.label('', [0, 0, 0], root, 'hot');
    const L = (t, p) => stage.label(t, p, root);
    const lab = [L('Glacier', [-7.5, 3.3, -3.35]), L('Tributary', [-6.6, 2.5, 1.3]), L('V-shaped valley', [-4.4, 2.6, -1.3]), L('Confluence', [-2.6, 1.2, -0.4]), L('Floodplain', [1.6, 0.6, -1.4]), L('Meanders', [3.3, 0.6, 0.5]), L('Oxbow lake', [2.8, 0.6, 2.3]), L('Delta', [6.6, 0.6, 1.9]), L('Sea', [7.6, 0.4, -2.6])];
    const lDiv = L('Divide', [-1.0, 2.2, -3.2]), lGw = L('Groundwater seeps into the river', [1.2, -0.1, 3.6]);
    const minor = lab.slice(1, 8);

    const st = { stage: STAGES[0], i: 0 };
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fitNarrow(stage, minor, 0.12, 0.05);
        fitWide(stage, VIEW, 16.6, 1.22);
        const i = Math.round(clamp(s.u, 0, 1) * (main.length - 1)), p = main[i];
        st.stage = stageOf(s.u); st.i = i;
        marker.position.set(p[0], hAt(p[0], p[1]) + 0.2, p[1]);
        lMark.position.set(p[0], hAt(p[0], p[1]) + 0.7, p[1]); lMark.element.innerHTML = `<b>${st.stage.name}</b>: ${st.stage.job.toLowerCase()}`;
        div.visible = lDiv.visible = s.basin;
        gw.visible = s.ground; land.material.transparent = s.ground; land.material.opacity = s.ground ? 0.55 : 1; land.material.depthWrite = !s.ground; side.transparent = s.ground; side.opacity = s.ground ? 0.35 : 1; side.depthWrite = !s.ground; lGw.visible = s.ground; gArrows.forEach((a) => { a.visible = s.ground; a.set(0.45 + 0.1 * Math.sin(time * 3)); });
        const n = main.length;
        for (let j = 0; j < NF; j++) {
          const f = fp[j];
          if (!s.flow) { fl.place(j, [0, -9, 0], null, 0.0001); continue; }
          const jj = Math.min(n - 2, Math.floor(f[0] * (n - 1)));
          const sp = 0.018 + 0.05 * (1 - smooth(clamp(f[0] / 0.5, 0, 1)));      // faster down the steep upper course
          f[0] += dt * sp; if (f[0] >= 1) { f[0] = 0; f[1] = r() - 0.5; }
          const a = main[jj], b = main[jj + 1], w = 0.06 + 0.2 * Math.pow(jj / n, 0.8), tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
          const x = a[0] - (tz / tl) * f[1] * w * 0.8, z = a[1] + (tx / tl) * f[1] * w * 0.8;
          fl.place(j, [x, hAt(a[0], a[1]) + 0.06, z]);
        }
        fl.done();
      },
      dispose() { stage.setShift(0, 0); },
      readout: (s) => compact(`<div class="big">${st.stage.name}</div>
        <div class="row"><span>Its main job</span><b>${st.stage.job}</b></div>
        <div class="row"><span>Distance along this river</span><b>${Math.round(s.u * 100)} %</b></div>
        <p style="margin:.4em 0 0;max-width:30ch">${st.stage.what}</p>
        ${fine(`<small>On the Ganga: ${st.stage.ganga}</small>`)}`, 2),
    };
  },
};
