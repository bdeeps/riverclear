// Chapter 6: rivers and people. A sketch map of India (outline and rivers from river.js: indicative,
// not survey lines, no borders) with places where people and rivers meet. Facts, dated and sourced:
//   Tehri: 260.5 m earth and rockfill dam on the Bhagirathi, India's tallest; first unit in commercial
//     operation from 22 September 2006 (THDC India). The old town of Tehri was submerged.
//   Farakka Barrage: in operation from 21 April 1975; about 2.3 km long; diverts water down a feeder
//     canal to the Hooghly. Dry-season sharing with Bangladesh under the Ganges Water Treaty of 1996.
//   Sardar Sarovar (Narmada): dedicated to the nation on 17 September 2017; height raised to
//     138.68 m (PMIndia release). Displacement was long contested (Narmada Bachao Andolan).
//   Interlinking: the National Perspective Plan of August 1980; NWDA has identified 30 links,
//     16 peninsular and 14 Himalayan; the Ken–Betwa link is the first under implementation; its
//     foundation stone, with the Daudhan dam, was laid at Khajuraho on 25 December 2024 (PMIndia).
//   Namami Gange: approved by the Union Cabinet on 13 May 2015 with ₹20,000 crore for 2015–2020,
//     after about ₹4,000 crore spent since 1985 (PMIndia; Rajya Sabha answer, 3 August 2015).
//   Kumbh Mela: inscribed on UNESCO's Representative List of the Intangible Cultural Heritage of
//     Humanity in 2017.
//   Sundarbans: UNESCO World Heritage, India 1987, Bangladesh 1997.
//   Majuli: district of Assam since 2016; area figures differ (see chapter 4).
//   Kosi: embankment breach at Kusaha, Nepal, 18 August 2008 (FloodClear).
// Flood safety is FloodClear's, from NDMA: 15 cm of moving water can knock you over; 112, 1078.
import { THREE, M, clamp, board, panelBg, wrap, fitNarrow, fitWide, fine, compact, inReel, INDIA, RIVERS, COL, A } from '../river.js';
import { tube } from '../kit.js';

const K = 0.42, LON0 = 82.6, LAT0 = 22.6;
const P = (lon, lat, y = 0) => [(lon - LON0) * K, y, -(lat - LAT0) * K];
const PLACES = {
  gaumukh: { name: 'Gaumukh', at: [79.08, 30.93], river: 'Bhagirathi (Ganga)', when: 'Glacier retreating', kind: 'Source', text: 'The Bhagirathi flows out of the snout of the Gangotri glacier, about 30 km long, at about 3,900 m. The snout has been retreating, at rates measured between about 7 and 22 m a year. Pilgrims walk here from Gangotri, where the river is worshipped as the goddess Ganga.', src: 'Uttarakhand government; Journal of Glaciology' },
  tehri: { name: 'Tehri Dam', at: [78.48, 30.38], river: 'Bhagirathi', when: 'Power from 2006', kind: 'Dam', text: 'An earth and rockfill dam 260.5 m high, the tallest in India, run by THDC. Its first unit began commercial operation on 22 September 2006. It stores monsoon water for power, irrigation and drinking water; the old town of Tehri and many villages were submerged and their people resettled.', src: 'THDC India Ltd' },
  prayagraj: { name: 'Prayagraj', at: [81.88, 25.43], river: 'Ganga and Yamuna', when: 'Kumbh Mela', kind: 'Confluence', text: 'The Yamuna joins the Ganga here. The confluence is sacred in Hindu tradition and hosts the Kumbh Mela, one of the largest gatherings of people on Earth, inscribed by UNESCO in 2017 as Intangible Cultural Heritage of Humanity.', src: 'UNESCO' },
  varanasi: { name: 'Namami Gange', at: [83.0, 25.32], river: 'Ganga', when: 'Approved 13 May 2015', kind: 'Clean-up', text: 'The Union Cabinet approved the Namami Gange programme in May 2015 with ₹20,000 crore for 2015 to 2020, after about ₹4,000 crore spent since 1985. Untreated sewage from towns and cities is the biggest problem it targets, with sewage treatment plants, riverfront work and monitoring.', src: 'PMIndia; Rajya Sabha answer, 2015' },
  kenbetwa: { name: 'Ken–Betwa link', at: [79.9, 24.6], river: 'Ken to Betwa', when: 'Begun 25 Dec 2024', kind: 'River link', text: 'The National Perspective Plan of 1980 proposed moving water from surplus basins to deficit ones; the National Water Development Agency has identified 30 links. Ken–Betwa is the first being built, with the Daudhan dam. Supporters point to water for Bundelkhand; critics raise concerns about forest and wildlife and the cost.', src: 'PMIndia; NWDA' },
  farakka: { name: 'Farakka Barrage', at: [87.92, 24.8], river: 'Ganga', when: 'Since 1975', kind: 'Barrage', text: 'A barrage about 2.3 km long, in operation since 21 April 1975. It sends part of the Ganga down a feeder canal into the Hooghly, to keep the channel to Kolkata’s port flowing. How much water flows on to Bangladesh in the dry season is set by a treaty of 1996.', src: 'Farakka Barrage Project; treaty 1996' },
  kosi: { name: 'Kosi', at: [86.93, 26.52], river: 'Kosi', when: 'Breach 18 Aug 2008', kind: 'Shifting river', text: 'A river so loaded with Himalayan sediment that it has shifted its course across north Bihar many times. Held between embankments since the 1950s, it broke through at Kusaha in Nepal in 2008 and took an old course; about 3 million people were affected.', src: 'FloodClear; Gole and Chitale 1966' },
  majuli: { name: 'Majuli', at: [94.17, 26.95], river: 'Brahmaputra', when: 'District since 2016', kind: 'River island', text: 'One of the largest river islands in the world, in the braided Brahmaputra, home to Vaishnavite monasteries called satras. Bank erosion has shrunk it a great deal over the past century, though estimates of its size differ.', src: 'Assam government; published studies' },
  sundarbans: { name: 'Sundarbans', at: [88.9, 21.95], river: 'Ganga–Brahmaputra delta', when: 'UNESCO 1987', kind: 'Delta', text: 'The largest mangrove forest on Earth, on the delta of the Ganga, Brahmaputra and Meghna, shared by India and Bangladesh. A UNESCO World Heritage site (India 1987, Bangladesh 1997) and home of the Bengal tiger. Tides reach far inland through its creeks.', src: 'UNESCO World Heritage Centre' },
  sardar: { name: 'Sardar Sarovar', at: [73.75, 21.83], river: 'Narmada', when: 'Dedicated 17 Sep 2017', kind: 'Dam', text: 'A concrete dam on the Narmada, dedicated to the nation on 17 September 2017 after its height was raised to 138.68 m. It sends canal water to Gujarat and Rajasthan and power to Madhya Pradesh, Maharashtra and Gujarat; for decades the Narmada Bachao Andolan campaigned over the people its reservoir displaced.', src: 'PMIndia' },
  jog: { name: 'Jog Falls', at: [74.81, 14.23], river: 'Sharavathi', when: 'Best Aug–Dec', kind: 'Waterfall', text: 'The Sharavathi drops 253 m in four streams, named Raja, Rani, Roarer and Rocket, off the edge of the Western Ghats. Like most rivers of the Ghats’ west slope it is short and steep and races to the Arabian Sea; most of the Deccan’s big rivers flow east to the Bay of Bengal.', src: 'Karnataka tourism' },
};
const ORDER = ['gaumukh', 'tehri', 'prayagraj', 'varanasi', 'kenbetwa', 'farakka', 'kosi', 'majuli', 'sundarbans', 'sardar', 'jog'];
const KIND_HEX = { Source: 0x8ef0ff, Dam: 0xff7a59, Confluence: 0xffe27a, 'Clean-up': 0xa3e635, 'River link': 0xc49bff, Barrage: 0xff7a59, 'Shifting river': 0xff5a8a, 'River island': 0xffe27a, Delta: 0xa3e635, Waterfall: 0x8ef0ff };

const VIEW = { pos: [1.4, 13.8, 9.4], target: [1.4, 0, 0.4] };
export default {
  id: 'people',
  short: 'Rivers and people',
  title: 'Rivers and people',
  subtitle: 'We drink from rivers, farm their plains, pray at their banks, dam them, and pollute them.',
  view: VIEW,
  learn: `<p>Every great early civilisation grew beside a river. The Greek historian <b>Herodotus</b>, about 2,450 years ago, called Egypt the “gift of the river”: the Nile’s floods spread fresh silt each year. The cities of the <b>Indus</b> civilisation, such as Harappa and Mohenjo-daro, stood on the Indus and its tributaries. Many settlements also lay along the now-dry Ghaggar–Hakra, which some scholars identify with the Sarasvati of the Rigveda; that identification is still debated.</p>
    <p>In India rivers are also sacred. The <b>Ganga</b> is worshipped as a goddess, and festivals such as Ganga Dussehra and the <b>Kumbh Mela</b> at Prayagraj (on UNESCO’s list of Intangible Cultural Heritage since 2017) draw millions to bathe at the banks.</p>
    <p><b>Dams and barrages.</b> A <b>dam</b> holds back a reservoir to store monsoon water for dry months, for drinking, farms and power. A <b>barrage</b> is lower, with gates, and raises the river to divert it into canals. They also trap sediment that would have reached the plains and delta, change the river below, and flood land and homes above. <b>Tehri</b> (2006), <b>Farakka</b> (1975) and <b>Sardar Sarovar</b> (2017) show both sides.</p>
    <p><b>Linking rivers.</b> India’s National Perspective Plan of 1980 proposed canals to move water from rivers with more to rivers with less. Thirty links have been identified; the first, <b>Ken–Betwa</b>, was begun in December 2024. Supporters stress water for dry regions; critics raise ecological and cost concerns.</p>
    <p><b>Keeping rivers clean.</b> Sewage from towns and waste from industry are the main threats. The <b>Namami Gange</b> programme, approved in 2015 with ₹20,000 crore for five years, builds sewage treatment and monitors the river.</p>
    <p><b>Watching rivers.</b> The <b>Central Water Commission</b>, set up in 1945, gauges India’s rivers and forecasts floods. Satellites now measure rivers from space: NASA and CNES’s SWOT satellite, launched in December 2022, maps the height of rivers and lakes.</p>
    <p><b>Floods.</b> From NDMA: move to higher ground early, and never walk or drive through moving water: 15 cm can knock you over. Call <b>112</b>; NDMA’s helpline is <b>1078</b>. ${A('floodclear', 'FloodClear')} explains floods in full, and ${A('volcanicislandclear', 'VolcanicIslandClear')} shows how fire builds land where rivers wear it down.</p>
    <p class="tip"><b>Try it:</b> pick a place on the map and read its story. Turn the rivers on and off to see how much of India one basin covers.</p>`,
  terms: [
    { t: 'Dam', d: 'A wall across a river that holds back a reservoir.' },
    { t: 'Barrage', d: 'A low dam with gates that raises the water to divert it into canals.' },
    { t: 'Reservoir', d: 'A lake made by a dam to store water.' },
    { t: 'Interlinking', d: 'Joining river basins with canals to move water from one to another.' },
    { t: 'Sewage treatment plant', d: 'A works that cleans waste water from homes before it goes back into a river.' },
    { t: 'Central Water Commission', d: 'India’s national body for river data, water planning and flood forecasting, founded in 1945.' },
  ],
  defaults: { place: 'gaumukh', rivers: true },
  controls: [
    { key: 'pick', type: 'buttons', label: 'Pick a place', items: ORDER.map((k) => ({ label: PLACES[k].name, act: (s) => { s.place = k; } })) },
    { key: 'rivers', type: 'toggle', label: 'Show the rivers' },
  ],
  quiz: [
    { q: 'What is the main difference between a dam and a barrage?', options: ['A barrage is made of ice', 'A dam stores a deep reservoir; a barrage is lower, with gates, mainly to divert water into canals', 'They are the same', 'A dam only makes electricity'], answer: 1, why: 'Dams store water; barrages such as Farakka raise and divert the river.' },
    { q: 'What is the biggest source of pollution the Namami Gange programme targets?', options: ['Sea water', 'Untreated sewage from towns and cities', 'Fish', 'Rainwater'], answer: 1, why: 'Sewage from towns and cities, with industrial waste, is the main problem, hence the sewage treatment plants.' },
    { q: 'Herodotus called Egypt “the gift of the river”. Why?', options: ['The Nile’s floods spread fertile silt each year', 'The Nile was full of gold', 'Rivers bring rain', 'The Nile froze in winter'], answer: 0, why: 'Each flood left fresh silt on the fields, making farming possible in a desert land.' },
  ],
  reel: [
    { ms: 5500, caption: 'Rivers feed India’s fields and cities, and are dammed, linked, cleaned and revered.', set: { place: 'farakka', rivers: true }, act: (s) => { s.place = 'farakka'; }, view: { pos: [1.0, 11, 8.8], target: [1.0, 0, 0.3] }, spin: 0.35 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const shape = new THREE.Shape(INDIA.map(([lo, la]) => { const p = P(lo, la); return new THREE.Vector2(p[0], -p[2]); }));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    const land = new THREE.Mesh(geo, M.matte(0x5f8a4c)); land.receiveShadow = true; land.castShadow = true; root.add(land);
    const sea = new THREE.Mesh(new THREE.BoxGeometry(34, 0.05, 26), M.matte(0x1d3f66)); sea.position.set(2.0, 0.0, 0.2); root.add(sea);
    const riv = new THREE.Group(); root.add(riv);
    for (const [nm, pts] of Object.entries(RIVERS)) {
      const big = nm === 'Ganga' || nm === 'Brahmaputra' || nm === 'Indus';
      riv.add(tube(pts.map(([lo, la]) => P(lo, la, 0.27)), big ? 0.055 : 0.035, M.plastic(0x3a9bff, { roughness: 0.3 }), false, 120));
    }
    const rl = [['Ganga', 81.0, 26.4], ['Brahmaputra', 92.6, 27.1], ['Narmada', 77.5, 22.85], ['Godavari', 78.5, 19.4], ['Krishna', 77.2, 16.6], ['Kaveri', 77.6, 11.6], ['Indus', 76.6, 34.9], ['Mahanadi', 83.2, 21.9]].map(([t, lo, la]) => stage.label(t, P(lo, la, 0.5), riv));
    const pins = {}, pinG = new THREE.Group(); root.add(pinG);
    for (const k of ORDER) {
      const pl = PLACES[k], g = new THREE.Group(), c = KIND_HEX[pl.kind] || 0xffffff;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), M.matte(0xe8eef8)); stem.position.y = 0.25;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), M.glow(c)); head.position.y = 0.55;
      g.add(stem, head); const p = P(...pl.at, 0.25); g.position.set(p[0], p[1], p[2]); pinG.add(g);
      pins[k] = { g, head, label: stage.label(pl.name, [0, 0.95, 0], g) };
      stage.pickables.push(head); head.userData.place = k;
    }
    let cur = null;
    const brd = board(root, 6.2, 4.13, 900, 600, (g, w, h) => {
      panelBg(g, w, h);
      if (!cur) return;
      const pl = PLACES[cur];
      g.fillStyle = '#' + (KIND_HEX[pl.kind] || 0xffffff).toString(16).padStart(6, '0'); g.font = 'bold 26px sans-serif'; g.fillText(pl.kind.toUpperCase() + ' · ' + pl.when, 30, 50);
      g.fillStyle = COL.text; g.font = 'bold 46px sans-serif'; g.fillText(pl.name, 30, 104);
      g.fillStyle = COL.soft; g.font = '26px sans-serif'; g.fillText(pl.river, 30, 142);
      g.fillStyle = COL.text; g.font = '31px sans-serif'; const y = wrap(g, pl.text, 30, 194, w - 60, 40);
      g.fillStyle = COL.soft; g.font = '22px sans-serif'; g.fillText('Source: ' + pl.src, 30, Math.min(h - 20, y + 16));
    }, [5.0, 0.9, 3.3]);
    brd.mesh.rotation.x = -0.95;
    let place = null;
    return {
      pick(o) { if (o.userData.place) { const s = window.riverclear?.settings; if (s) s.place = o.userData.place; } },
      update(dt, s, time) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, rl, 0.12, 0.06);
        fitWide(stage, VIEW, 15.5);
        brd.mesh.visible = !narrow || inReel();
        riv.visible = s.rivers;
        if (s.place !== place) { place = s.place; cur = place; brd.redraw(); }
        for (const k of ORDER) {
          const on = k === s.place, p = pins[k];
          p.head.scale.setScalar(on ? 1.5 + 0.2 * Math.sin(time * 4) : 1);
          p.label.visible = on || (!narrow && false);
          p.label.element.className = 'lbl' + (on ? ' hot' : '');
        }
      },
      dispose() { stage.setShift(0, 0); },
      readout: (s) => {
        const pl = PLACES[s.place];
        return compact(`<div class="big">${pl.name}</div>
          <div class="row"><span>River</span><b>${pl.river}</b></div>
          <div class="row"><span>What</span><b>${pl.kind}</b></div>
          <div class="row"><span>When</span><b>${pl.when}</b></div>
          ${fine('<small>Sketch map: outline and rivers are indicative, not survey lines, and show no borders.</small>')}`);
      },
    };
  },
};
