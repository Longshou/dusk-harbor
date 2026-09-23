'use strict';
/* =====================================================================
   DUSK HARBOR / 暮港行动  — single-file 3D tactical shooter (three.js r128)
   ===================================================================== */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const wrapAngle = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const Settings = { sens: 1.0, fov: 80, volume: 0.8, quality: 'high', difficulty: 'normal', primary: 'rifle', teamSize: 5, matchMinutes: 8, adsHold: true };
const STORE_KEY = 'duskHarbor.v1';
let SAVED = {};
try { SAVED = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; Object.assign(Settings, SAVED); } catch (e) { /* storage unavailable */ }
function saveSettings() { try { localStorage.setItem(STORE_KEY, JSON.stringify(Settings)); } catch (e) { /* ignore */ } }
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
if (IS_TOUCH && !SAVED.quality) Settings.quality = 'medium';

/* ============================ TEXTURES ============================ */
const Tex = {};
let MAX_ANISO = 4;
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, o = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = o.wrapS || THREE.RepeatWrapping;
  t.wrapT = o.wrapT || THREE.RepeatWrapping;
  if (o.srgb !== false) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = o.aniso || MAX_ANISO;
  if (o.nomip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}
function PNoise(seed, P) {
  const r = mulberry32(seed), g = new Float32Array(P * P);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = g[y0 * P + x0], b = g[y0 * P + x1], c = g[y1 * P + x0], d = g[y1 * P + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(n, x, y, o) { let s = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2; } return s / t; }
function normalFromHeight(h, w, hh, k, wrap = true) {
  const c = makeCanvas(w, hh), g = c.getContext('2d'), img = g.createImageData(w, hh), d = img.data;
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const xl = wrap ? (x - 1 + w) % w : Math.max(0, x - 1), xr = wrap ? (x + 1) % w : Math.min(w - 1, x + 1);
      const yt = wrap ? (y - 1 + hh) % hh : Math.max(0, y - 1), yb = wrap ? (y + 1) % hh : Math.min(hh - 1, y + 1);
      let nx = (h[y * w + xl] - h[y * w + xr]) * k, ny = (h[yb * w + x] - h[yt * w + x]) * k, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * w + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function genConcrete() {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const h = new Float32Array(S * S);
  const n1 = PNoise(11, 8), n2 = PNoise(12, 64), n3 = PNoise(13, 4), rng = mulberry32(99);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    const a = fbm(n1, u * 8, v * 8, 4), b = n2(u * 64, v * 64), s = fbm(n3, u * 4, v * 4, 3);
    const stain = smooth(0.5, 0.72, s);
    let val = 0.56 + (a - 0.5) * 0.34 + (b - 0.5) * 0.16 - stain * 0.18;
    if (rng() < 0.035) val += (rng() - 0.5) * 0.22;
    const jx = x % 256, jy = y % 256;
    const joint = (jx < 2 || jy < 2) ? 1 : 0;
    if (joint) val *= 0.5;
    const i = y * S + x;
    h[i] = b * 0.5 + a * 0.5 - joint * 1.2;
    d[i * 4] = val * 212; d[i * 4 + 1] = val * 206; d[i * 4 + 2] = val * 196; d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // cracks
  g.lineWidth = 1.1;
  for (let k = 0; k < 16; k++) {
    let x = rng() * S, y = rng() * S, ang = rng() * TAU;
    g.strokeStyle = `rgba(35,32,28,${0.25 + rng() * 0.3})`; g.beginPath(); g.moveTo(x, y);
    const n = 10 + rng() * 30;
    for (let j = 0; j < n; j++) { ang += (rng() - 0.5) * 0.9; x += Math.cos(ang) * 4; y += Math.sin(ang) * 4; g.lineTo(x, y); }
    g.stroke();
  }
  // oil stains
  for (let k = 0; k < 6; k++) {
    const x = rng() * S, y = rng() * S, r = 10 + rng() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(20,18,16,0.28)'); gr.addColorStop(1, 'rgba(20,18,16,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return { map: toTex(c), normal: toTex(normalFromHeight(h, S, S, 2.2), { srgb: false }) };
}

function genDeck() {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const h = new Float32Array(S * S);
  const n1 = PNoise(21, 8), n2 = PNoise(22, 32), n3 = PNoise(23, 16), rng = mulberry32(7);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = y * S + x;
    const wear = fbm(n1, u * 8, v * 8, 4), fine = n2(u * 32, v * 32), rust = fbm(n3, u * 16, v * 16, 3);
    let r = 84, gg = 100, b = 84;
    const w = smooth(0.62, 0.8, wear);
    r = lerp(r, 118, w); gg = lerp(gg, 118, w); b = lerp(b, 112, w);
    const ru = smooth(0.72, 0.88, rust) * 0.55;
    r = lerp(r, 128, ru); gg = lerp(gg, 72, ru); b = lerp(b, 40, ru);
    const k = 0.86 + fine * 0.22;
    const sx = x % 256, sy = y % 128;
    const seam = (sx < 2 || sy < 2) ? 1 : 0;
    const mul = seam ? 0.7 : 1;
    d[i * 4] = r * k * mul; d[i * 4 + 1] = gg * k * mul; d[i * 4 + 2] = b * k * mul; d[i * 4 + 3] = 255;
    h[i] = fine * 0.3 + (seam ? 0.9 : 0) + (sx === 3 || sy === 3 ? 0.4 : 0);
  }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < 90; k++) {
    g.strokeStyle = `rgba(170,176,165,${0.08 + rng() * 0.12})`; g.lineWidth = 1 + rng();
    const x = rng() * S, y = rng() * S, a = rng() * TAU, l = 6 + rng() * 30;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let k = 0; k < 7; k++) {
    const x = rng() * S, y = rng() * S, r = 8 + rng() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(25,22,18,0.35)'); gr.addColorStop(1, 'rgba(25,22,18,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return { map: toTex(c), normal: toTex(normalFromHeight(h, S, S, 2.5), { srgb: false }) };
}

function genMetal() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const h = new Float32Array(S * S);
  const n1 = PNoise(31, 8), n2 = PNoise(32, 32), rng = mulberry32(3);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = y * S + x;
    const a = fbm(n1, u * 8, v * 8, 4), b = n2(u * 32, v * 32);
    let val = 0.78 + (a - 0.5) * 0.18 + (b - 0.5) * 0.06;
    const dirt = smooth(0.66, 0.84, a) * 0.12;
    val -= dirt;
    d[i * 4] = val * 235; d[i * 4 + 1] = val * 232; d[i * 4 + 2] = val * 226; d[i * 4 + 3] = 255;
    h[i] = b * 0.4 + a * 0.3;
  }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < 70; k++) {
    g.strokeStyle = `rgba(255,255,255,${0.05 + rng() * 0.1})`; g.lineWidth = 0.8;
    const x = rng() * S, y = rng() * S, a = rng() * TAU, l = 4 + rng() * 22;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let k = 0; k < 10; k++) {
    const x = rng() * S, y = rng() * S, r = 4 + rng() * 14;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(110,58,30,0.22)'); gr.addColorStop(1, 'rgba(110,58,30,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return { map: toTex(c), normal: toTex(normalFromHeight(h, S, S, 1.2), { srgb: false }) };
}

function genHull() {
  const W = 1024, H = 512, c = makeCanvas(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  const n1 = PNoise(41, 16), n2 = PNoise(42, 64), rng = mulberry32(41);
  for (let y = 0; y < H; y++) {
    const hgt = -7 + (1 - y / H) * 11.7;
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, i = (y * W + x) * 4;
      const a = fbm(n1, u * 16, v * 8, 4), b = n2(u * 64, v * 32);
      let r, gg, bb;
      if (hgt < -1.75) { r = 118; gg = 38; bb = 30; }
      else if (hgt < -0.95) { r = 28; gg = 29; bb = 31; }
      else { r = 30; gg = 43; bb = 58; }
      const k = 0.86 + a * 0.2 + (b - 0.5) * 0.08;
      r *= k; gg *= k; bb *= k;
      // waterline algae/grime
      const wl = Math.exp(-Math.pow((hgt + 1.3) / 0.35, 2));
      r = lerp(r, 52, wl * 0.55); gg = lerp(gg, 58, wl * 0.55); bb = lerp(bb, 40, wl * 0.55);
      // paint touch-ups
      if (hgt > -0.95 && a > 0.66) { r *= 1.12; gg *= 1.12; bb *= 1.14; }
      // plate seams
      const seamH = [-4.2, -1.8, 0.9, 3.1];
      for (const sh of seamH) if (Math.abs(hgt - sh) < 0.018) { r *= 0.72; gg *= 0.72; bb *= 0.72; }
      if (x % 384 < 2) { r *= 0.74; gg *= 0.74; bb *= 0.74; }
      d[i] = r; d[i + 1] = gg; d[i + 2] = bb; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // rust streaks running down from the deck edge and scuppers
  for (let k = 0; k < 70; k++) {
    const x = rng() * W, y0 = rng() < 0.6 ? rng() * 30 : 40 + rng() * 120, len = 40 + rng() * 170, w = 1 + rng() * 4;
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    const al = 0.2 + rng() * 0.35;
    gr.addColorStop(0, `rgba(128,62,30,${al})`); gr.addColorStop(1, 'rgba(128,62,30,0)');
    g.fillStyle = gr; g.fillRect(x, y0, w, len);
  }
  // white hull markings: plimsoll-ish marks and draft ticks near bow/stern
  g.fillStyle = 'rgba(230,230,225,0.85)';
  for (let k = 0; k < 6; k++) { const yy = H * (1 - (-3.5 + k * 0.5 + 7) / 11.7); g.fillRect(20, yy, 22, 3); g.fillRect(W - 60, yy, 22, 3); }
  const t = toTex(c, { wrapT: THREE.ClampToEdgeWrapping });
  return t;
}

const CONT_COLORS = [[152, 54, 38], [36, 66, 110], [48, 96, 64], [198, 104, 46], [200, 196, 186], [200, 162, 54], [42, 112, 116], [100, 38, 44]];
function genContainerSide() {
  const W = 512, TH = 256, V = 8, c = makeCanvas(W, TH * V), g = c.getContext('2d'), img = g.createImageData(W, TH * V), d = img.data;
  const hTile = new Float32Array(W * TH);
  const nS = PNoise(51, 64), nR = PNoise(52, 16), nD = PNoise(53, 8);
  const prof = (x) => { const p = (x / W * 9) % 1; return p < 0.3 ? 1 : p < 0.5 ? 1 - (p - 0.3) / 0.2 : p < 0.8 ? 0 : (p - 0.8) / 0.2; };
  for (let y = 0; y < TH; y++) for (let x = 0; x < W; x++) {
    const rail = y < 11 || y > TH - 15;
    hTile[y * W + x] = rail ? 0.5 : prof(x) * 0.9 + fbm(nD, x / W * 8, y / TH * 4, 2) * 0.25;
  }
  for (let vi = 0; vi < V; vi++) {
    const base = CONT_COLORS[vi], off = vi * 3.7;
    for (let y = 0; y < TH; y++) {
      const fy = y / TH;
      for (let x = 0; x < W; x++) {
        const i = ((vi * TH + y) * W + x) * 4;
        const rail = y < 11 || y > TH - 15;
        const p = prof(x);
        let k = rail ? 0.82 : 0.93 + p * 0.07;
        const streak = fbm(nS, x / W * 24 + off, fy * 1.3, 3);
        k -= Math.max(0, streak - 0.45) * 0.55 * (0.35 + fy);
        if (fy > 0.84) k *= 0.82;
        let r = base[0] * k, gg = base[1] * k, b = base[2] * k;
        const rust = fbm(nR, x / W * 6 + off, fy * 3 + off, 4);
        const rr = smooth(0.66, 0.8, rust + (rail ? 0.06 : 0)) * 0.6;
        r = lerp(r, 112, rr); gg = lerp(gg, 58, rr); b = lerp(b, 34, rr);
        d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  const rng = mulberry32(55);
  for (let k = 0; k < 400; k++) {
    g.strokeStyle = `rgba(230,225,215,${0.06 + rng() * 0.12})`; g.lineWidth = 0.8 + rng();
    const x = rng() * W, y = rng() * TH * V, a = rng() * TAU, l = 3 + rng() * 26;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const nc = normalFromHeight(hTile, W, TH, 3.2);
  const nAtlas = makeCanvas(W, TH * V), ng = nAtlas.getContext('2d');
  for (let vi = 0; vi < V; vi++) ng.drawImage(nc, 0, vi * TH);
  return { map: toTex(c, { wrapT: THREE.ClampToEdgeWrapping }), normal: toTex(nAtlas, { srgb: false, wrapT: THREE.ClampToEdgeWrapping }) };
}

function genContainerEnd() {
  const S = 256, V = 8, c = makeCanvas(S, S * V), g = c.getContext('2d'), img = g.createImageData(S, S * V), d = img.data;
  const h = new Float32Array(S * S);
  const nS = PNoise(61, 32), nR = PNoise(62, 8);
  const rods = [44, 98, 158, 212];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let hv = 0.4;
    const frame = x < 14 || x > S - 15 || y < 16 || y > S - 16;
    if (!frame) { const lx = x < 128 ? (x - 14) : (x - 128); hv = 0.35 + 0.25 * Math.sin(lx / 114 * Math.PI * 5); }
    if (Math.abs(x - 128) < 2) hv = 0;
    for (const r of rods) if (Math.abs(x - r) < 4 && !frame) hv = 1.0;
    h[y * S + x] = hv;
  }
  for (let vi = 0; vi < V; vi++) {
    const base = CONT_COLORS[vi];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = ((vi * S + y) * S + x) * 4;
      const frame = x < 14 || x > S - 15 || y < 16 || y > S - 16;
      let k = frame ? 0.8 : 0.92;
      const st = fbm(nS, x / S * 16 + vi, y / S * 2, 3);
      k -= Math.max(0, st - 0.48) * 0.5 * (0.3 + y / S);
      let r = base[0] * k, gg = base[1] * k, b = base[2] * k;
      let isRod = false;
      for (const rr of rods) if (Math.abs(x - rr) < 4 && !frame) isRod = true;
      if (isRod) { r = 118; gg = 116; b = 110; }
      if (Math.abs(x - 128) < 2 && !frame) { r *= 0.4; gg *= 0.4; b *= 0.4; }
      const ru = smooth(0.66, 0.82, fbm(nR, x / S * 8 + vi * 2, y / S * 8, 3)) * 0.55;
      r = lerp(r, 110, ru); gg = lerp(gg, 58, ru); b = lerp(b, 34, ru);
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  for (let vi = 0; vi < V; vi++) {
    const oy = vi * S;
    g.fillStyle = 'rgba(40,40,40,0.9)';
    for (const r of rods) {
      g.fillRect(r - 7, oy + 22, 14, 10); g.fillRect(r - 7, oy + S - 32, 14, 10); // cam keepers
      g.fillRect(r + (r < 128 ? 3 : -23), oy + 150, 20, 5); // handles
    }
    for (const hy of [36, 96, 160, 220]) { g.fillRect(8, oy + hy, 10, 12); g.fillRect(S - 18, oy + hy, 10, 12); }
    g.fillStyle = 'rgba(225,222,210,0.85)'; g.fillRect(60, oy + 52, 36, 20);
    g.fillStyle = 'rgba(240,238,230,0.85)'; g.font = 'bold 9px Arial, sans-serif'; g.fillText('MAX GR 30480 KG', 150, oy + 58); g.fillText('TARE   3750 KG', 150, oy + 70);
  }
  const nc = normalFromHeight(h, S, S, 3.0, false);
  const na = makeCanvas(S, S * V), ng = na.getContext('2d');
  for (let vi = 0; vi < V; vi++) ng.drawImage(nc, 0, vi * S);
  return { map: toTex(c, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping }), normal: toTex(na, { srgb: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping }) };
}

const BRANDS = [['NORVIK', 'NVKU'], ['TIDEWAY', 'TDWU'], ['KAIYUN', 'KYNU'], ['OCEANCREST', 'OCRU'], ['BLUEFIN', 'BFNU'], ['AZURIA', 'AZRU'], ['GRANITE LINE', 'GRTU'], ['SEAWARD', 'SWDU']];
function genLogos() {
  const W = 1024, c = makeCanvas(W, W), g = c.getContext('2d');
  g.clearRect(0, 0, W, W);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const rng = mulberry32(77);
  for (let k = 0; k < 8; k++) {
    const cx = (k % 2) * 512, cy = Math.floor(k / 2) * 128;
    g.fillStyle = 'rgba(244,242,236,0.95)';
    g.font = `900 ${k === 6 ? 70 : k === 3 ? 74 : 86}px "Arial Black", Impact, sans-serif`;
    g.fillText(BRANDS[k][0], cx + 256, cy + 66);
    if (k === 2) { g.font = '700 30px sans-serif'; }
    // weathering: erase random specks
    g.globalCompositeOperation = 'destination-out';
    for (let s = 0; s < 260; s++) { g.fillStyle = `rgba(0,0,0,${rng() * 0.8})`; g.fillRect(cx + rng() * 512, cy + rng() * 128, 1 + rng() * 3, 1 + rng() * 3); }
    g.globalCompositeOperation = 'source-over';
  }
  g.font = '700 34px Arial, sans-serif'; g.textAlign = 'left';
  for (let k = 0; k < 32; k++) {
    const b = BRANDS[k % 8][1], cx = (k % 4) * 256, cy = 512 + Math.floor(k / 4) * 64;
    const num = String(100000 + Math.floor(rng() * 899999)), chk = Math.floor(rng() * 10);
    g.fillStyle = 'rgba(244,242,236,0.95)';
    g.fillText(`${b} ${num} ${chk}`, cx + 8, cy + 26);
    g.font = '700 22px Arial, sans-serif'; g.fillText(k % 3 === 0 ? '45G1' : k % 3 === 1 ? '22G1' : '42G1', cx + 8, cy + 52); g.font = '700 34px Arial, sans-serif';
  }
  const t = toTex(c, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  return t;
}

function genWood() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const n1 = PNoise(71, 16), n2 = PNoise(72, 8);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, plank = Math.floor(y / 64);
    const grain = fbm(n1, x / S * 2 + plank * 3.1, y / S * 16, 3);
    const tone = 0.78 + fbm(n2, x / S * 4, plank * 1.7, 2) * 0.35;
    let r = (148 + grain * 40) * tone, gg = (108 + grain * 30) * tone, b = (66 + grain * 18) * tone;
    const edge = y % 64 < 2 || y % 64 > 61;
    const frame = x < 18 || x > S - 19;
    if (frame) { r *= 0.82; gg *= 0.8; b *= 0.78; }
    if (edge) { r *= 0.45; gg *= 0.45; b *= 0.45; }
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(40,36,30,0.9)';
  for (let p = 0; p < 4; p++) { g.fillRect(8, p * 64 + 30, 3, 3); g.fillRect(S - 11, p * 64 + 30, 3, 3); }
  g.strokeStyle = 'rgba(40,30,20,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(18, 0); g.lineTo(S - 18, S); g.stroke();
  g.fillStyle = 'rgba(30,24,18,0.55)'; g.font = 'bold 22px Arial'; g.fillText('FRAGILE', 70, 140);
  return toTex(c);
}

function genCamo(seed, base, cols) {
  const S = 128, c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const ns = cols.map((_, k) => PNoise(seed + k, 8));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4; let col = base;
    for (let k = 0; k < cols.length; k++) { if (fbm(ns[k], x / S * 8, y / S * 8, 3) > 0.56) col = cols[k]; }
    const f = 0.92 + Math.random() * 0.1;
    d[i] = col[0] * f; d[i + 1] = col[1] * f; d[i + 2] = col[2] * f; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return toTex(c);
}

function genWindows() {
  const W = 256, H = 64, c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#c9ccc6'; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 4; k++) {
    const x = k * 64 + 5, gr = g.createLinearGradient(x, 0, x + 54, H);
    gr.addColorStop(0, '#2c3f4e'); gr.addColorStop(0.45, '#4d6676'); gr.addColorStop(0.5, '#7f97a3'); gr.addColorStop(0.56, '#3c5362'); gr.addColorStop(1, '#1f2e39');
    g.fillStyle = gr; g.fillRect(x, 6, 54, H - 12);
  }
  return toTex(c);
}
function genPortholes() {
  const W = 128, H = 128, c = makeCanvas(W, H), g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#9ea39f'; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.fill();
  const gr = g.createRadialGradient(50, 48, 4, 64, 64, 44); gr.addColorStop(0, '#6f8794'); gr.addColorStop(1, '#1d2a33');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 42, 0, TAU); g.fill();
  return toTex(c, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}
function genFacade() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d'), e = makeCanvas(S, S), ge = e.getContext('2d');
  g.fillStyle = '#7d8082'; g.fillRect(0, 0, S, S); ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  const rng = mulberry32(88);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const px = x * 32 + 6, py = y * 32 + 8;
    g.fillStyle = '#2a3440'; g.fillRect(px, py, 20, 16);
    if (rng() < 0.32) { const warm = rng() < 0.75; ge.fillStyle = warm ? `rgb(255,${190 + rng() * 40},${110 + rng() * 50})` : 'rgb(190,220,255)'; ge.fillRect(px, py, 20, 16); g.fillStyle = '#b8a078'; g.fillRect(px, py, 20, 16); }
  }
  return { map: toTex(c), emissive: toTex(e) };
}
function genFence() {
  const S = 128, c = makeCanvas(S, S), g = c.getContext('2d');
  g.clearRect(0, 0, S, S); g.strokeStyle = 'rgba(190,196,196,1)'; g.lineWidth = 2.2;
  for (let k = -S; k < S * 2; k += 16) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke();
    g.beginPath(); g.moveTo(k, S); g.lineTo(k + S, 0); g.stroke();
  }
  return toTex(c);
}
function genPaint() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data, n = PNoise(91, 32), n2 = PNoise(92, 8);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, a = fbm(n, x / S * 32, y / S * 32, 3) * 0.6 + fbm(n2, x / S * 8, y / S * 8, 2) * 0.4;
    d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255 * smooth(0.28, 0.5, a);
  }
  g.putImageData(img, 0, 0);
  return toTex(c);
}
function genText(text, w, h, font, color, opts = {}) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.clearRect(0, 0, w, h); g.fillStyle = color; g.font = font; g.textAlign = opts.align || 'center'; g.textBaseline = 'middle';
  g.fillText(text, opts.align === 'left' ? 6 : w / 2, h / 2 + (opts.dy || 0));
  if (opts.weather) {
    const rng = mulberry32(5); g.globalCompositeOperation = 'destination-out';
    for (let s = 0; s < opts.weather; s++) { g.fillStyle = `rgba(0,0,0,${rng() * 0.7})`; g.fillRect(rng() * w, rng() * h, 1 + rng() * 3, 1 + rng() * 3); }
    g.globalCompositeOperation = 'source-over';
  }
  return toTex(c, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}
function genSprites() {
  const soft = makeCanvas(64, 64), g1 = soft.getContext('2d'), gr1 = g1.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr1.addColorStop(0, 'rgba(255,255,255,1)'); gr1.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr1.addColorStop(1, 'rgba(255,255,255,0)');
  g1.fillStyle = gr1; g1.fillRect(0, 0, 64, 64);
  Tex.soft = toTex(soft, { srgb: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });

  const sm = makeCanvas(128, 128), g2 = sm.getContext('2d'), rng = mulberry32(12);
  for (let k = 0; k < 26; k++) {
    const x = 64 + (rng() - 0.5) * 60, y = 64 + (rng() - 0.5) * 60, r = 14 + rng() * 26;
    const gr = g2.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
  }
  const mk = g2.createRadialGradient(64, 64, 20, 64, 64, 64); mk.addColorStop(0, 'rgba(0,0,0,0)'); mk.addColorStop(1, 'rgba(0,0,0,1)');
  g2.globalCompositeOperation = 'destination-out'; g2.fillStyle = mk; g2.fillRect(0, 0, 128, 128); g2.globalCompositeOperation = 'source-over';
  Tex.smoke = toTex(sm, { srgb: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });

  const fl = makeCanvas(128, 128), g3 = fl.getContext('2d');
  g3.translate(64, 64);
  for (let k = 0; k < 7; k++) {
    g3.rotate(TAU / 7 + (rng() - 0.5) * 0.4);
    const len = 36 + rng() * 26, gr = g3.createLinearGradient(0, 0, len, 0);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,160,60,0)');
    g3.fillStyle = gr; g3.beginPath(); g3.moveTo(0, -6); g3.lineTo(len, 0); g3.lineTo(0, 6); g3.fill();
  }
  const cg = g3.createRadialGradient(0, 0, 0, 0, 0, 26); cg.addColorStop(0, 'rgba(255,255,235,1)'); cg.addColorStop(1, 'rgba(255,190,90,0)');
  g3.fillStyle = cg; g3.fillRect(-32, -32, 64, 64);
  Tex.flash = toTex(fl, { srgb: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });

  const ho = makeCanvas(64, 64), g4 = ho.getContext('2d');
  const gh = g4.createRadialGradient(32, 32, 0, 32, 32, 30); gh.addColorStop(0, 'rgba(8,8,8,1)'); gh.addColorStop(0.18, 'rgba(12,12,12,1)'); gh.addColorStop(0.3, 'rgba(40,36,32,0.8)'); gh.addColorStop(0.7, 'rgba(60,55,50,0.25)'); gh.addColorStop(1, 'rgba(60,55,50,0)');
  g4.fillStyle = gh; g4.fillRect(0, 0, 64, 64);
  g4.strokeStyle = 'rgba(20,20,20,0.6)'; g4.lineWidth = 1.2;
  for (let k = 0; k < 7; k++) { const a = rng() * TAU; g4.beginPath(); g4.moveTo(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6); g4.lineTo(32 + Math.cos(a) * (12 + rng() * 14), 32 + Math.sin(a) * (12 + rng() * 14)); g4.stroke(); }
  Tex.hole = toTex(ho, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });

  const bl = makeCanvas(64, 64), g5 = bl.getContext('2d');
  for (let k = 0; k < 16; k++) {
    const x = 32 + (rng() - 0.5) * 34, y = 32 + (rng() - 0.5) * 34, r = 2 + rng() * 9;
    g5.fillStyle = `rgba(${90 + rng() * 40},6,8,${0.6 + rng() * 0.4})`; g5.beginPath(); g5.arc(x, y, r, 0, TAU); g5.fill();
  }
  Tex.blood = toTex(bl, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });

  const tr = makeCanvas(64, 16), g6 = tr.getContext('2d'), gt = g6.createLinearGradient(0, 0, 0, 16);
  gt.addColorStop(0, 'rgba(255,255,255,0)'); gt.addColorStop(0.5, 'rgba(255,255,255,1)'); gt.addColorStop(1, 'rgba(255,255,255,0)');
  g6.fillStyle = gt; g6.fillRect(0, 0, 64, 16);
  const gx = g6.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.3, 'rgba(0,0,0,0)');
  g6.globalCompositeOperation = 'destination-out'; g6.fillStyle = gx; g6.fillRect(0, 0, 64, 16); g6.globalCompositeOperation = 'source-over';
  Tex.tracer = toTex(tr, { srgb: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

async function genAllTextures(progress) {
  Tex.concrete = genConcrete(); progress(0.1);
  await nextFrame();
  Tex.deck = genDeck(); Tex.metal = genMetal(); progress(0.2);
  await nextFrame();
  Tex.hull = genHull(); progress(0.28);
  await nextFrame();
  Tex.cside = genContainerSide(); progress(0.4);
  await nextFrame();
  Tex.cend = genContainerEnd(); Tex.logos = genLogos(); progress(0.48);
  await nextFrame();
  Tex.wood = genWood();
  Tex.camoB = genCamo(301, [70, 82, 96], [[48, 58, 72], [104, 114, 124], [34, 40, 50]]);
  Tex.camoR = genCamo(401, [150, 128, 96], [[112, 92, 64], [84, 86, 60], [176, 158, 124]]);
  Tex.windows = genWindows(); Tex.porthole = genPortholes(); Tex.facade = genFacade(); Tex.fence = genFence(); Tex.paint = genPaint();
  Tex.shipName = genText('CORMORANT', 1024, 160, '900 118px "Arial Black", Impact, sans-serif', 'rgba(236,236,230,0.95)', { weather: 900 });
  Tex.shipPort = genText('CORMORANT   NORVIK', 1024, 160, '900 92px "Arial Black", Impact, sans-serif', 'rgba(236,236,230,0.95)', { weather: 700 });
  Tex.warn = genText('禁止吸烟  NO SMOKING', 512, 96, 'bold 44px sans-serif', 'rgba(250,210,70,1)');
  Tex.berth = genText('07', 256, 256, '900 200px "Arial Black", Impact, sans-serif', 'rgba(245,240,225,0.95)', { weather: 500 });
  genSprites();
  progress(0.55);
}
