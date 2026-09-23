/* ============================ MAP BUILD ============================ */
const MAP = { spawns: { blue: [], red: [] }, hotspots: [], anim: {}, lights: [] };
const CL = { 10: 2.99, 20: 6.06, 40: 12.19 }, CW = 2.44, CH = 2.59;

function container(cx, cz, len, level, alongZ, variant, o = {}) {
  const r = o.rng || Math.random, L = CL[len], baseY = o.baseY || 0, y0 = baseY + level * CH, y1 = y0 + CH;
  const hx = alongZ ? CW / 2 : L / 2, hz = alongZ ? L / 2 : CW / 2;
  const x0 = cx - hx, x1 = cx + hx, z0 = cz - hz, z1 = cz + hz;
  const k = variant === undefined || variant === null ? Math.floor(r() * 8) : variant;
  const sh = 0.78 + r() * 0.22, col = new THREE.Color(sh, sh * (0.97 + r() * 0.06), sh);
  const vB = (f) => (7 - k + 0.004 + f * 0.992) / 8;
  const uo = Math.floor(r() * 9) / 9;
  const S = BK[o.bkS || 'cside'], E = BK[o.bkE || 'cend'];
  const Lu = L / 2.52, Wu = CW / 2.52, doorPlus = r() < 0.5;
  if (!alongZ) {
    S.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [uo, vB(0)], [uo + Lu, vB(0)], [uo + Lu, vB(1)], [uo, vB(1)], col);
    S.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [uo, vB(0)], [uo + Lu, vB(0)], [uo + Lu, vB(1)], [uo, vB(1)], col);
    (doorPlus ? E : S).quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [0, vB(0)], [doorPlus ? 1 : Wu, vB(0)], [doorPlus ? 1 : Wu, vB(1)], [0, vB(1)], col);
    (doorPlus ? S : E).quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [0, vB(0)], [doorPlus ? Wu : 1, vB(0)], [doorPlus ? Wu : 1, vB(1)], [0, vB(1)], col);
    if (!o.noTop) S.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [uo, vB(0.06)], [uo + Lu, vB(0.06)], [uo + Lu, vB(0.94)], [uo, vB(0.94)], col);
  } else {
    S.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [uo, vB(0)], [uo + Lu, vB(0)], [uo + Lu, vB(1)], [uo, vB(1)], col);
    S.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [uo, vB(0)], [uo + Lu, vB(0)], [uo + Lu, vB(1)], [uo, vB(1)], col);
    (doorPlus ? E : S).quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [0, vB(0)], [doorPlus ? 1 : Wu, vB(0)], [doorPlus ? 1 : Wu, vB(1)], [0, vB(1)], col);
    (doorPlus ? S : E).quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [0, vB(0)], [doorPlus ? Wu : 1, vB(0)], [doorPlus ? Wu : 1, vB(1)], [0, vB(1)], col);
    if (!o.noTop) S.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [uo, vB(0.06)], [uo + Wu, vB(0.06)], [uo + Wu, vB(0.94)], [uo, vB(0.94)], col);
  }
  if (!o.noBottom && level === 0 && baseY > 0.5) S.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [0, vB(0.1)], [1, vB(0.1)], [1, vB(0.9)], [0, vB(0.9)], col);
  if (!o.noLogo && len > 10) {
    const b = Math.floor(r() * 8), bw = Math.min(L * 0.72, 5.4), bh = bw / 4, cu = (b % 2) * 0.5, rv = 1 - Math.floor(b / 2) * 0.125;
    const buv = [cu + 0.002, rv - 0.125 + 0.002, cu + 0.498, rv - 0.002];
    const kc = b + 8 * Math.floor(r() * 4), ccu = (kc % 4) * 0.25, crv = 0.5 - Math.floor(kc / 4) / 16;
    const cuv = [ccu + 0.002, crv - 1 / 16 + 0.002, ccu + 0.248, crv - 0.002];
    const ym = y0 + CH * 0.52, yc = y1 - 0.42, e = 0.012;
    if (!alongZ) {
      addDecal('logo', cx, ym, z1 + e, 1, 0, 0, 0, 1, 0, bw, bh, buv);
      addDecal('logo', cx, ym, z0 - e, -1, 0, 0, 0, 1, 0, bw, bh, buv);
      addDecal('logo', x1 - 1.0, yc, z1 + e, 1, 0, 0, 0, 1, 0, 1.3, 0.325, cuv);
      addDecal('logo', x0 + 1.0, yc, z0 - e, -1, 0, 0, 0, 1, 0, 1.3, 0.325, cuv);
    } else {
      addDecal('logo', x1 + e, ym, cz, 0, 0, -1, 0, 1, 0, bw, bh, buv);
      addDecal('logo', x0 - e, ym, cz, 0, 0, 1, 0, 1, 0, bw, bh, buv);
      addDecal('logo', x1 + e, yc, z0 + 1.0, 0, 0, -1, 0, 1, 0, 1.3, 0.325, cuv);
      addDecal('logo', x0 - e, yc, z1 - 1.0, 0, 0, 1, 0, 1, 0, 1.3, 0.325, cuv);
    }
  }
  if (o.col !== false) addCollider(x0, y0, z0, x1, y1, z1, { mat: 'metal', walk: true });
  return { x0, x1, z0, z1, y0, y1 };
}

function railing(key, ax, az, bx, bz, y, o = {}) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1.6)), h = o.h || 1.1;
  for (let i = 0; i <= n; i++) { const t = i / n; addBoxR(key, lerp(ax, bx, t), y + h / 2, lerp(az, bz, t), 0.06, h, 0.06); }
  const ry = Math.atan2(-(bz - az), bx - ax);
  for (const hh of [h - 0.03, h * 0.5]) addBoxR(key, (ax + bx) / 2, y + hh, (az + bz) / 2, L, 0.05, 0.05, 0, ry, 0);
  if (o.kick) addBoxR(key, (ax + bx) / 2, y + 0.06, (az + bz) / 2, L, 0.12, 0.02, 0, ry, 0);
  if (o.col !== false) {
    const t = 0.08;
    addCollider(Math.min(ax, bx) - (ax === bx ? t : 0), y - 0.3, Math.min(az, bz) - (az === bz ? t : 0), Math.max(ax, bx) + (ax === bx ? t : 0), y + (o.ch || 1.4), Math.max(az, bz) + (az === bz ? t : 0), { bullet: false, sight: false, mat: 'metal' });
  }
}
function slopeRail(key, a, b, h = 1.0) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 1.5));
  for (let i = 0; i <= n; i++) { const t = i / n; const p = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; addBeam(key, p, [p[0], p[1] + h, p[2]], 0.06); }
  addBeam(key, [a[0], a[1] + h, a[2]], [b[0], b[1] + h, b[2]], 0.055);
  addBeam(key, [a[0], a[1] + h * 0.5, a[2]], [b[0], b[1] + h * 0.5, b[2]], 0.045);
}
// steel stairs rising along +x/-x/+z/-z. region: [x0,x1]x[z0,z1]; rises from y0 at the "start" edge
function stairs(x0, z0, x1, z1, y0, y1, n, dir, o = {}) {
  const alongX = dir === 'x+' || dir === 'x-', len = alongX ? x1 - x0 : z1 - z0, run = len / n, rise = (y1 - y0) / n;
  const thick = o.thick || 0.28, key = o.key || 'steel';
  for (let i = 0; i < n; i++) {
    let sx0, sx1, sz0, sz1;
    if (dir === 'x+') { sx0 = x0 + i * run; sx1 = sx0 + run; sz0 = z0; sz1 = z1; }
    else if (dir === 'x-') { sx1 = x1 - i * run; sx0 = sx1 - run; sz0 = z0; sz1 = z1; }
    else if (dir === 'z+') { sz0 = z0 + i * run; sz1 = sz0 + run; sx0 = x0; sx1 = x1; }
    else { sz1 = z1 - i * run; sz0 = sz1 - run; sx0 = x0; sx1 = x1; }
    const top = y0 + (i + 1) * rise;
    addBox(key, sx0, top - 0.05, sz0, sx1, top, sz1, { faces: F_ALL, uv: 1 });
    addCollider(sx0, o.solid ? Math.min(top - thick, y0 - 0.3) : top - thick, sz0, sx1, top, sz1, { walk: true, stair: true, mat: 'metal' });
  }
  // stringers
  const sy0 = y0 + rise - 0.25, sy1 = y1 - 0.05;
  if (alongX) {
    const xa = dir === 'x+' ? x0 : x1, xb = dir === 'x+' ? x1 : x0;
    for (const zz of [z0 - 0.04, z1 + 0.04]) addBeam('dark', [xa, sy0, zz], [xb, sy1, zz], 0.08);
    if (o.rails !== false) for (const zz of (o.railSides || [z0 - 0.06, z1 + 0.06])) slopeRail('yellow', [xa, y0 + rise, zz], [xb, y1, zz]);
  } else {
    const za = dir === 'z+' ? z0 : z1, zb = dir === 'z+' ? z1 : z0;
    for (const xx of [x0 - 0.04, x1 + 0.04]) addBeam('dark', [xx, sy0, za], [xx, sy1, zb], 0.08);
    if (o.rails !== false) for (const xx of (o.railSides || [x0 - 0.06, x1 + 0.06])) slopeRail('yellow', [xx, y0 + rise, za], [xx, y1, zb]);
  }
  // railing colliders per step (move only)
  if (o.railCol !== false) for (let i = 0; i < n; i++) {
    const top = y0 + (i + 1) * rise;
    if (alongX) {
      const sx0 = dir === 'x+' ? x0 + i * run : x1 - (i + 1) * run, sx1 = sx0 + run;
      for (const zz of (o.railColSides || [z0 - 0.06, z1 + 0.06])) addCollider(sx0, top - 0.2, zz - 0.06, sx1, top + 1.35, zz + 0.06, { bullet: false, sight: false, mat: 'metal' });
    } else {
      const sz0 = dir === 'z+' ? z0 + i * run : z1 - (i + 1) * run, sz1 = sz0 + run;
      for (const xx of (o.railColSides || [x0 - 0.06, x1 + 0.06])) addCollider(xx - 0.06, top - 0.2, sz0, xx + 0.06, top + 1.35, sz1, { bullet: false, sight: false, mat: 'metal' });
    }
  }
}
function glow(parent, x, y, z, size, color, opacity = 1) {
  const m = MAT.glowSprite.clone(); if (color) m.color = color; m.opacity = opacity;
  const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.set(size, size, size); parent.add(s); return s;
}
function bollard(x, z, y = 0, col = true) {
  addCyl('dark', x, y + 0.3, z, 0.2, 0.24, 0.6, 12);
  addCyl('dark', x, y + 0.64, z, 0.3, 0.3, 0.08, 12);
  if (col) addCollider(x - 0.26, y, z - 0.26, x + 0.26, y + 0.68, z + 0.26, { mat: 'metal' });
}
function crate(x0, y0, z0, s, h) {
  addBox('wood', x0, y0, z0, x0 + s, y0 + (h || s), z0 + s, { faceUV: true, col: { mat: 'wood', walk: true, pen: 0.55 } });
}

/* ---------------- hull ---------------- */
function hullHB(x, y) {
  const B = 7; let hb = B;
  const depth = clamp((3.6 - y) / 10.6, 0, 1);
  if (x > 24) { const L = 10.5 - 3.8 * depth; const t = clamp((x - 24) / L, 0, 1); hb = B * Math.sqrt(Math.max(0, 1 - t * t)); }
  if (x < -22) { const t = clamp((-22 - x) / 10, 0, 1); hb *= 1 - t * t * clamp((0.4 - y) / 6, 0, 1) * 0.5; }
  const r = 2.0, yb = -7 + r;
  if (y < yb) { const dy = yb - y, inner = hb - r; hb = Math.min(hb, inner + Math.sqrt(Math.max(0, r * r - dy * dy))); }
  return Math.max(0, hb);
}
const hullTop = (x) => 4.7 + 1.8 * smooth(23.0, 24.9, x);
function buildHull(parent) {
  const set = new Set();
  for (let x = -32; x < 20; x += 2) set.add(x);
  [-20, -17.6, 17.6, 20].forEach((x) => set.add(x));
  for (let x = 20; x < 34.5; x += 0.5) set.add(+x.toFixed(2));
  set.add(34.5);
  const xs = [...set].sort((a, b) => a - b), NX = xs.length;
  const M1 = 16, M2 = 3, M = M1 + M2;
  const band = (x) => hullTop(x) - 1.1;
  const yAt = (x, j) => (j <= M1 ? lerp(-7, band(x), j / M1) : lerp(band(x), hullTop(x), (j - M1) / M2));
  const open = (s, xa, xb) => (s < 0 && ((xa >= -20 && xb <= -17.6) || (xa >= 17.6 && xb <= 20))) || xa >= 33.0;
  const pos = [], uv = [], idx = [];
  for (const s of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i < NX; i++) {
      const x = xs[i];
      for (let j = 0; j <= M; j++) { const y = yAt(x, j); pos.push(x, y, SHIP_Z + s * hullHB(x, y)); uv.push(x / 16, (y + 7) / 11.7); }
    }
    for (let i = 0; i < NX - 1; i++) {
      const op = open(s, xs[i], xs[i + 1]);
      for (let j = 0; j < M; j++) {
        if (op && j >= M1) continue;
        const a = base + i * (M + 1) + j, b = base + (i + 1) * (M + 1) + j, c = b + 1, d = a + 1;
        if (s > 0) idx.push(a, b, c, a, c, d); else idx.push(b, a, d, b, d, c);
      }
    }
  }
  // transom (with the ramp opening in the bulwark band)
  const tb = pos.length / 3;
  for (let j = 0; j <= M; j++) {
    const y = yAt(-32, j), hb = hullHB(-32, y), mid = Math.min(3.5, hb * 0.999);
    for (const z of [SHIP_Z - hb, SHIP_Z - mid, SHIP_Z + mid, SHIP_Z + hb]) { pos.push(-32, y, z); uv.push(z / 16, (y + 7) / 11.7); }
  }
  for (let j = 0; j < M; j++) {
    const r0 = tb + j * 4, r1 = r0 + 4;
    for (let k = 0; k < 3; k++) {
      if (j >= M1 && k === 1) continue;
      const a = r0 + k, b = r0 + k + 1, c = r1 + k + 1, d = r1 + k;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, MAT.hull); m.castShadow = true; m.receiveShadow = true; parent.add(m);
  // bulwark cap rail along the hull top
  for (const s of [1, -1]) {
    for (let i = 0; i < NX - 1; i++) {
      const xa = xs[i], xb = xs[i + 1];
      if (open(s, xa, xb)) continue;
      const ya = hullTop(xa), yb = hullTop(xb);
      addBeam('white', [xa, ya + 0.04, SHIP_Z + s * (hullHB(xa, ya) - 0.1)], [xb, yb + 0.04, SHIP_Z + s * (hullHB(xb, yb) - 0.1)], 0.2);
    }
  }
  const tt = hullTop(-32) + 0.04;
  addBeam('white', [-32, tt, SHIP_Z - 6.9], [-32, tt, SHIP_Z - 3.5], 0.2);
  addBeam('white', [-32, tt, SHIP_Z + 3.5], [-32, tt, SHIP_Z + 6.9], 0.2);
  // forecastle deck
  const fx = xs.filter((x) => x >= 24);
  const D = BK.deck;
  for (let i = 0; i < fx.length - 1; i++) {
    const xa = fx[i], xb = fx[i + 1], ha = Math.max(0.01, hullHB(xa, FC_Y) - 0.05), hb = Math.max(0.01, hullHB(xb, FC_Y) - 0.05);
    D.quad([xa, FC_Y, SHIP_Z + ha], [xb, FC_Y, SHIP_Z + hb], [xb, FC_Y, SHIP_Z - hb], [xa, FC_Y, SHIP_Z - ha], [0, 1, 0], [xa / 4, -(SHIP_Z + ha) / 4], [xb / 4, -(SHIP_Z + hb) / 4], [xb / 4, -(SHIP_Z - hb) / 4], [xa / 4, -(SHIP_Z - ha) / 4]);
  }
  // railing around the open bow tip
  railing('white', 33.2, 17.2, 34.3, 17.2, FC_Y, { col: false }); railing('white', 33.2, 18.8, 34.3, 18.8, FC_Y, { col: false });
}

/* ---------------- STS crane ---------------- */
function stsCrane(parent, cx, cols, hang, zq = 0) {
  const legX = [cx - 4.5, cx + 4.5], legZ = [6.0 + zq, -4.0 + zq];
  for (const lx of legX) for (const lz of legZ) {
    addBox('crane', lx - 0.6, 0.9, lz - 0.6, lx + 0.6, 17.4, lz + 0.6, { uv: 3, col: cols ? { mat: 'metal' } : null, faces: F_NOBOT });
    addBox('dark', lx - 1.7, 0, lz - 0.55, lx + 1.7, 0.95, lz + 0.55, { uv: 2, col: cols ? { mat: 'metal', walk: true } : null });
    for (const wx of [-1.2, -0.4, 0.4, 1.2]) addCyl('rubber', lx + wx, 0.34, lz, 0.34, 0.34, 0.9, 12, Math.PI / 2, 0, 0);
    addBox('yellow', lx - 1.72, 0.4, lz - 0.57, lx - 1.6, 0.85, lz + 0.57, { faces: F_ALL });
    addBox('yellow', lx + 1.6, 0.4, lz - 0.57, lx + 1.72, 0.85, lz + 0.57, { faces: F_ALL });
  }
  for (const lx of legX) addBox('crane', lx - 0.7, 15.6, legZ[1] - 0.7, lx + 0.7, 17.6, legZ[0] + 0.7, { uv: 3 });
  for (const lz of legZ) addBox('crane', cx - 5.2, 15.9, lz - 0.5, cx + 5.2, 17.3, lz + 0.5, { uv: 3 });
  for (const lz of legZ) { addBeam('crane', [cx - 4.5, 15.8, lz], [cx, 10.5, lz], 0.35); addBeam('crane', [cx + 4.5, 15.8, lz], [cx, 10.5, lz], 0.35); }
  for (const lx of legX) { addBeam('crane', [lx, 12, legZ[0]], [lx, 16, legZ[1]], 0.3); }
  // A-frame
  const apex = 38;
  for (const lx of legX) {
    addBeam('crane', [lx, 17.6, legZ[1]], [lx, apex, zq + 1], 0.8);
    addBeam('crane', [lx, 17.6, legZ[0]], [lx, apex, zq + 1], 0.8);
    addBeam('crane', [lx, 26, legZ[1] + 1.2], [lx, 26, legZ[0] - 1.2], 0.4);
  }
  addBox('crane', cx - 4.9, apex - 0.6, zq + 0.4, cx + 4.9, apex + 0.4, zq + 1.6, { uv: 3 });
  // boom girders
  const bz0 = -20 + zq, bz1 = 44 + zq, by0 = 24.2, by1 = 26.6;
  for (const gx of [cx - 1.6, cx + 1.6]) addBox('craneW', gx - 0.35, by0, bz0, gx + 0.35, by1, bz1, { uv: 3 });
  for (let z = bz0; z <= bz1; z += 4) addBox('craneW', cx - 1.25, by0 + 0.1, z - 0.15, cx + 1.25, by0 + 0.4, z + 0.15, { uv: 3 });
  for (let z = bz0; z < bz1 - 4; z += 8) for (const gx of [cx - 1.6, cx + 1.6]) addBeam('craneW', [gx, by0, z], [gx, by1, z + 4], 0.12);
  // stays
  for (const lx of legX) {
    addBeam('dark', [lx, apex, zq + 1], [cx + (lx < cx ? -1.6 : 1.6), by1, bz1 - 1], 0.14);
    addBeam('dark', [lx, apex, zq + 1], [cx + (lx < cx ? -1.6 : 1.6), by1, 22 + zq], 0.14);
    addBeam('dark', [lx, apex, zq + 1], [cx + (lx < cx ? -1.6 : 1.6), by1, bz0 + 1], 0.16);
  }
  // machinery house
  addBox('craneW', cx - 3.2, by1, bz0, cx + 3.2, by1 + 4, bz0 + 9, { uv: 3 });
  addBox('crane', cx - 3.25, by1 + 3.6, bz0 - 0.05, cx + 3.25, by1 + 4.05, bz0 + 9.05, { uv: 3 });
  // trolley + cab
  const tz = SHIP_Z + zq;
  addBox('crane', cx - 2.1, by0 - 1.0, tz - 2, cx + 2.1, by0, tz + 2, { uv: 2 });
  addBox('craneW', cx - 1.2, by0 - 3.2, tz - 1.1, cx + 1.2, by0 - 1.0, tz + 1.3, { uv: 2 });
  addBox('glass', cx - 1.1, by0 - 3.0, tz + 1.3, cx + 1.1, by0 - 1.6, tz + 1.32, { faces: F_PZ, uv: 4 });
  addBox('glass', cx - 1.1, by0 - 3.22, tz - 1.0, cx + 1.1, by0 - 3.2, tz + 1.2, { faces: F_NY, uv: 4 });
  // spreader & cables
  const sy = hang ? 13.3 : 19;
  addBox('yellow', cx - 3.1, sy - 0.4, tz - 1.25, cx + 3.1, sy, tz + 1.25, { uv: 2, col: cols ? { mat: 'metal' } : null });
  addBox('yellow', cx - 0.8, sy, tz - 0.8, cx + 0.8, sy + 0.5, tz + 0.8, { uv: 2 });
  for (const dx of [-1.6, 1.6]) for (const dz of [-0.7, 0.7]) addBeam('dark', [cx + dx * 0.4, sy + 0.5, tz + dz * 0.5], [cx + dx * 0.9, by0 - 1.0, tz + dz * 1.2], 0.04);
  if (hang) {
    const r = mulberry32(99);
    container(cx, tz, 20, 0, false, 5, { baseY: sy - 0.4 - CH, rng: r, col: false, noBottom: false });
    if (cols) addCollider(cx - 3.03, sy - 0.4 - CH, tz - 1.22, cx + 3.03, sy - 0.4, tz + 1.22, { mat: 'metal' });
  }
  // lights under boom
  for (const z of [4 + zq, 18 + zq, 34 + zq]) { addBox('lamp', cx - 0.4, by0 - 0.25, z - 0.25, cx + 0.4, by0, z + 0.25, { faces: F_NY }); glow(parent, cx, by0 - 0.35, z, 2.2); }
  glow(parent, cx, apex + 0.8, zq + 1, 1.2, new THREE.Color(1, 0.12, 0.08));
  // leg ladder cage (visual)
  const lx = legX[0], lz = legZ[1];
  for (let y = 1; y < 16; y += 0.8) addBoxR('dark', lx - 0.75, y, lz, 0.04, 0.04, 0.6);
  addBeam('dark', [lx - 0.75, 1, lz - 0.3], [lx - 0.75, 16, lz - 0.3], 0.05); addBeam('dark', [lx - 0.75, 1, lz + 0.3], [lx - 0.75, 16, lz + 0.3], 0.05);
}

/* ---------------- vehicles & props ---------------- */
function truck(x0, z0, cols) {
  // trailer along x from x0 to x0+13, cab at x0+13.3..x0+17.3, center z = z0 + 1.3
  const zc = z0 + 1.3;
  addBox('dark', x0, 1.05, zc - 1.0, x0 + 13, 1.4, zc + 1.0, { col: cols ? { mat: 'metal' } : null });
  addBox('dark', x0 + 0.4, 0.55, zc - 1.25, x0 + 3.4, 1.05, zc + 1.25, { col: cols ? { mat: 'metal' } : null });
  for (const wx of [x0 + 0.9, x0 + 1.9, x0 + 2.9]) for (const s of [-1, 1]) addCyl('rubber', wx, 0.5, zc + s * 1.0, 0.5, 0.5, 0.5, 14, Math.PI / 2, 0, 0);
  addBox('steel', x0 + 9.6, 0, zc - 0.9, x0 + 9.8, 1.05, zc - 0.7, { col: cols ? { mat: 'metal' } : null });
  addBox('steel', x0 + 9.6, 0, zc + 0.7, x0 + 9.8, 1.05, zc + 0.9, { col: cols ? { mat: 'metal' } : null });
  container(x0 + 6.5, zc, 40, 0, false, 1, { baseY: 1.4, rng: mulberry32(7), col: false });
  if (cols) addCollider(x0 + 0.4, 1.4, zc - 1.22, x0 + 12.6, 3.99, zc + 1.22, { mat: 'metal', walk: true });
  // tractor
  const tx = x0 + 13.3;
  addBox('dark', tx, 0.9, zc - 0.9, tx + 4.2, 1.3, zc + 0.9, { col: cols ? { mat: 'metal' } : null });
  addBox('redpaint', tx + 1.8, 1.3, zc - 1.2, tx + 4.2, 3.6, zc + 1.2, { uv: 2, col: cols ? { mat: 'metal' } : null });
  addBox('glass', tx + 4.2, 2.35, zc - 1.05, tx + 4.21, 3.35, zc + 1.05, { faces: F_PX, uv: 4 });
  for (const s of [-1, 1]) addBox('glass', tx + 2.6, 2.4, zc + s * 1.2 - (s > 0 ? 0 : 0.01), tx + 3.9, 3.3, zc + s * 1.2 + (s > 0 ? 0.01 : 0), { faces: s > 0 ? F_PZ : F_NZ, uv: 4 });
  addBox('dark', tx + 4.2, 0.6, zc - 1.2, tx + 4.5, 1.3, zc + 1.2);
  addBox('steel', tx + 1.2, 1.3, zc + 0.9, tx + 1.5, 3.9, zc + 1.2);
  addCyl('steel', tx + 1.2, 1.1, zc - 1.1, 0.3, 0.3, 1.2, 12, 0, 0, Math.PI / 2);
  for (const wx of [tx + 0.6, tx + 1.6, tx + 3.6]) for (const s of [-1, 1]) addCyl('rubber', wx, 0.5, zc + s * 1.0, 0.5, 0.5, 0.45, 14, Math.PI / 2, 0, 0);
  if (cols) { addCollider(tx, 0, zc - 1.25, tx + 4.5, 0.9, zc + 1.25, { mat: 'metal' }); addCollider(x0 + 0.4, 0, zc - 1.3, x0 + 3.4, 0.55, zc + 1.3, { mat: 'metal' }); }
}
function forklift(x, z, cols) {
  addBox('yellow', x - 1.0, 0.3, z - 0.6, x + 0.9, 1.25, z + 0.6, { uv: 1 });
  addBox('dark', x - 1.2, 0.3, z - 0.55, x - 0.9, 1.35, z + 0.55);
  for (const s of [-1, 1]) { addBeam('dark', [x - 0.8, 1.25, z + s * 0.5], [x - 0.6, 2.15, z + s * 0.5], 0.06); addBeam('dark', [x + 0.4, 1.25, z + s * 0.5], [x + 0.2, 2.15, z + s * 0.5], 0.06); }
  addBox('dark', x - 0.85, 2.12, z - 0.58, x + 0.3, 2.18, z + 0.58);
  for (const s of [-0.35, 0.35]) addBox('dark', x + 0.95, 0.1, z + s - 0.06, x + 1.05, 2.4, z + s + 0.06);
  for (const s of [-0.3, 0.3]) addBox('steel', x + 1.05, 0.05, z + s - 0.06, x + 2.1, 0.12, z + s + 0.06);
  for (const wx of [x - 0.6, x + 0.55]) for (const s of [-1, 1]) addCyl('rubber', wx, 0.3, z + s * 0.58, 0.3, 0.3, 0.25, 12, Math.PI / 2, 0, 0);
  if (cols) addCollider(x - 1.2, 0, z - 0.65, x + 1.05, 2.18, z + 0.65, { mat: 'metal' });
}
function lightPole(parent, x, z, h = 14, cols = true, heads = 2) {
  addCyl('steel', x, h / 2, z, 0.11, 0.17, h, 10);
  addBox('dark', x - 0.3, 0, z - 0.3, x + 0.3, 0.25, z + 0.3);
  for (let i = 0; i < heads; i++) {
    const a = i * Math.PI + 0.3, hx = x + Math.cos(a) * 0.9, hz = z + Math.sin(a) * 0.9;
    addBeam('steel', [x, h - 0.2, z], [hx, h, hz], 0.07);
    addBox('dark', hx - 0.35, h - 0.15, hz - 0.2, hx + 0.35, h + 0.08, hz + 0.2);
    addBox('lamp', hx - 0.3, h - 0.17, hz - 0.16, hx + 0.3, h - 0.15, hz + 0.16, { faces: F_NY });
    glow(parent, hx, h - 0.35, hz, 3.0, null, 0.85);
  }
  if (cols) addCollider(x - 0.2, 0, z - 0.2, x + 0.2, h, z + 0.2, { mat: 'metal' });
}
function jersey(x0, z0, x1, z1) {
  const alongX = x1 - x0 > z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = alongX ? x1 - x0 : z1 - z0;
  const w = [0.6, 0.42, 0.24], hs = [0.28, 0.32, 0.25]; let y = 0;
  for (let i = 0; i < 3; i++) {
    const hw = w[i] / 2;
    if (alongX) addBox('quaywall', cx - L / 2, y, cz - hw, cx + L / 2, y + hs[i], cz + hw, { uv: 2 }); else addBox('quaywall', cx - hw, y, cz - L / 2, cx + hw, y + hs[i], cz + L / 2, { uv: 2 });
    y += hs[i];
  }
  // hazard stripe
  if (alongX) addBox('yellow', cx - L / 2 + 0.02, 0.62, cz - 0.13, cx + L / 2 - 0.02, 0.72, cz + 0.13);
  addCollider(x0, 0, z0, x1, 0.85, z1, { mat: 'concrete', walk: true });
}
function palletStack(x0, z0, h) {
  addBox('wood', x0, 0, z0, x0 + 1.2, 0.15, z0 + 1.2, { faceUV: true });
  const r = mulberry32(Math.floor(x0 * 31 + z0 * 7));
  const cols = [C(0xa98b62), C(0x9c7f58), C(0xb59b72)];
  let y = 0.15;
  while (y < h - 0.05) {
    const hh = 0.38; addBox('wood', x0 + 0.02, y, z0 + 0.02, x0 + 1.18, y + hh, z0 + 1.18, { faceUV: true, color: pick(cols) });
    y += hh; if (r() < 0.2) break;
  }
  addCollider(x0, 0, z0, x0 + 1.2, y, z0 + 1.2, { mat: 'wood', pen: 0.5, walk: true });
}
function cableDrum(x, z) {
  for (const s of [-0.42, 0.42]) addCyl('wood', x, 0.72, z + s, 0.72, 0.72, 0.08, 18, Math.PI / 2, 0, 0);
  addCyl('rubber', x, 0.72, z, 0.52, 0.52, 0.76, 16, Math.PI / 2, 0, 0);
  addCollider(x - 0.72, 0, z - 0.46, x + 0.72, 1.44, z + 0.46, { mat: 'wood', pen: 0.3 });
}
function mooringLine(parent, a, b, sag = 1.0) {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * sag, lerp(a[2], b[2], t))); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.045, 5, false);
  BK.rope.geom(g, new THREE.Matrix4()); g.dispose();
}

/* ---------------- build ---------------- */
function buildMap(scene) {
  const root = new THREE.Group(); scene.add(root);
  const R = mulberry32(20240923);

  /* ===== ground & quay ===== */
  addBox('ground', -1200, -1, -5.5, 1200, 0, 8, { faces: F_PY, uv: 4 });
  addBox('ground', -50, -1, 8, -40, 0, 28, { faces: F_PY, uv: 4 });
  addBox('ground', 38, -1, 8, 50, 0, 28, { faces: F_PY, uv: 4 });
  addBox('yard', -1200, -1, -1200, 1200, 0, -5.5, { faces: F_PY, uv: 4 });
  addBox('quaywall', -40, -8, 7.6, 38, 0, 8, { faces: F_PZ, uv: 4 });
  addBox('quaywall', -1200, -8, 7.6, -50, 0, 8, { faces: F_PZ, uv: 4 });
  addBox('quaywall', 50, -8, 7.6, 1200, 0, 8, { faces: F_PZ, uv: 4 });
  addBox('quaywall', -40.4, -8, 8, -40, 0, 28, { faces: F_PX, uv: 4 });
  addBox('quaywall', -50, -8, 8, -49.6, 0, 28, { faces: F_NX, uv: 4 });
  addBox('quaywall', 38, -8, 8, 38.4, 0, 28, { faces: F_NX, uv: 4 });
  addBox('quaywall', 49.6, -8, 8, 50, 0, 28, { faces: F_PX, uv: 4 });
  addBox('quaywall', -50, -8, 27.6, -40, 0, 28, { faces: F_PZ, uv: 4 });
  addBox('quaywall', 38, -8, 27.6, 50, 0, 28, { faces: F_PZ, uv: 4 });
  addCollider(-50, -8, -28, 50, 0, 8, { walk: true, mat: 'concrete' });
  addCollider(-50, -8, 8, -40, 0, 28, { walk: true, mat: 'concrete' });
  addCollider(38, -8, 8, 50, 0, 28, { walk: true, mat: 'concrete' });
  // quay edge curb (yellow) + railings
  addBox('yellow', -40, 0, 7.72, 38, 0.16, 8.0, { faces: F_PY | F_PZ | F_NZ });
  railing('yellow', -40, 7.9, 38, 7.9, 0);
  railing('yellow', -39.95, 8, -39.95, 14.5, 0); railing('yellow', -39.95, 21.5, -39.95, 28, 0);
  railing('yellow', -50, 27.9, -40, 27.9, 0); railing('yellow', 38, 27.9, 50, 27.9, 0);
  railing('yellow', 38.05, 8, 38.05, 28, 0);
  railing('yellow', -49.9, 8, -49.9, 28, 0); railing('yellow', 49.9, 8, 49.9, 28, 0);
  addCollider(-50, 1.2, 27.8, -40, 40, 28.2, { bullet: false, sight: false });
  addCollider(38, 1.2, 27.8, 50, 40, 28.2, { bullet: false, sight: false });
  addCollider(-40, 1.2, 7.8, 38, 40, 8.1, { bullet: false, sight: false });
  addCollider(-40.1, 1.2, 8, -39.8, 40, 14.5, { bullet: false, sight: false });
  addCollider(-40.1, 1.2, 21.5, -39.8, 40, 28, { bullet: false, sight: false });
  addCollider(37.9, 1.2, 8, 38.2, 40, 28, { bullet: false, sight: false });
  addCollider(-50.3, 0, 8, -49.8, 40, 28.2, { bullet: false, sight: false });
  addCollider(49.8, 0, 8, 50.3, 40, 28.2, { bullet: false, sight: false });
  // fenders on the quay wall
  for (let x = -36; x <= 34; x += 8) { addCyl('rubber', x, -1.2, 8.35, 0.35, 0.35, 2.4, 10); }
  for (let z = 11; z <= 26; z += 5) { addCyl('rubber', -39.65, -1.2, z, 0.35, 0.35, 2.4, 10); addCyl('rubber', 37.65, -1.2, z, 0.35, 0.35, 2.4, 10); addCyl('rubber', -50.35, -1.2, z, 0.35, 0.35, 2.4, 10); addCyl('rubber', 50.35, -1.2, z, 0.35, 0.35, 2.4, 10); }
  // crane rails
  for (const z of [6.0, -4.0]) { addBox('steel', -300, 0, z - 0.05, 300, 0.035, z + 0.05, { faces: F_PY | F_PZ | F_NZ, uv: 1 }); addBox('dark', -300, 0, z - 0.35, 300, 0.012, z + 0.35, { faces: F_PY, uv: 2 }); }
  // painted markings
  const line = (key, x0, z0, x1, z1) => addBox(key, x0, 0, z0, x1, 0.004, z1, { faces: F_PY, uv: 3 });
  line('paintY', -38, 4.1, 36.5, 4.25); line('paintY', -38, -5.25, 36.5, -5.1);
  for (let x = -36; x < 36; x += 3) line('paintW', x, 1.0, x + 1.6, 1.12);
  for (const gx of [-22.4, 17.6]) for (let k = 0; k < 7; k++) line('paintW', gx + k * 0.7, 4.4, gx + k * 0.7 + 0.35, 7.5);
  addDecal('berth', 0, 0.006, 6.1, 1, 0, 0, 0, 0, -1, 2.6, 2.6, [0, 0, 1, 1]);
  // yard slot lines
  for (const zz of [-9.3, -6.26, -15.8, -12.76, -22.8, -19.76]) line('paintW', -35, zz - 0.06, 35, zz + 0.06);
  for (const xx of [-34.3, 34.3]) line('paintW', xx - 0.06, -23, xx + 0.06, -6);

  /* ===== boundaries ===== */
  const wallStack = (xc) => {
    let z = -28.42;
    for (const len of [40, 40, 20, 10, 10]) {
      const L = CL[len], cz = z + L / 2;
      for (let lv = 0; lv < 3; lv++) container(xc, cz, len, lv, true, null, { rng: R, noLogo: lv !== 0 && R() < 0.5 });
      z += L;
    }
  };
  wallStack(-51.22); wallStack(51.22);
  addCollider(-54, 0, -30, -50, 40, 8, { bullet: false, sight: false });
  addCollider(50, 0, -30, 54, 40, 8, { bullet: false, sight: false });
  // south fence
  for (let x = -50; x <= 50; x += 3.125) { addCyl('steel', x, 1.6, -28, 0.045, 0.045, 3.2, 8); }
  const FB = BK.fence;
  FB.quad([-50, 0.05, -28], [50, 0.05, -28], [50, 3.1, -28], [-50, 3.1, -28], [0, 0, 1], [0, 0], [100 / 1.2, 0], [100 / 1.2, 3.05 / 1.2], [0, 3.05 / 1.2]);
  addBox('steel', -50, 3.1, -28.03, 50, 3.16, -27.97);
  addBox('steel', -50, 0.02, -28.03, 50, 0.08, -27.97);
  for (let x = -50; x <= 50; x += 3.125) addBeam('steel', [x, 3.2, -28], [x, 3.55, -28.3], 0.04);
  addBox('dark', -50, 3.4, -28.25, 50, 3.43, -28.22); addBox('dark', -50, 3.52, -28.33, 50, 3.55, -28.3);
  addCollider(-50, 0, -28.1, 50, 3.3, -27.9, { bullet: false, sight: false, mat: 'metal' });
  addCollider(-50, 3.3, -28.2, 50, 40, -27.8, { bullet: false, sight: false });

  /* ===== ship ===== */
  buildHull(root);
  addBox('deck', -32, 3.3, 11, 24, DECK_Y, 25, { faces: F_PY, uv: 4 });
  addBox('white', 23.95, DECK_Y, 11.2, 24.0, FC_Y, 24.8, { faces: F_NX, uv: 2 });
  addCollider(-32, -7, 11, 24, DECK_Y, 25, { walk: true, mat: 'metal' });
  const fcBoxes = [[24, 28, 6.3], [28, 30.5, 5.3], [30.5, 32.5, 3.9], [32.5, 34, 1.8]];
  for (const [a, b, h] of fcBoxes) addCollider(a, -7, SHIP_Z - h, b, FC_Y, SHIP_Z + h, { walk: true, mat: 'metal' });
  const planHalf = (x) => { for (const [a, b, h] of fcBoxes) if (x >= a && x < b) return h; return 0; };
  for (let x = 24; x < 33.2; x += 0.5) {
    const inner = Math.min(planHalf(x), planHalf(x + 0.499)), outer = hullHB(x, FC_Y) + 0.05;
    if (inner < outer) for (const s of [1, -1]) {
      const za = SHIP_Z + s * inner, zb = SHIP_Z + s * outer;
      addCollider(x, -7, Math.min(za, zb), x + 0.5, 6.5, Math.max(za, zb), { mat: 'metal' });
      addCollider(x, 6.5, Math.min(za, zb), x + 0.5, 14, Math.max(za, zb), { bullet: false, sight: false });
    }
  }
  addCollider(33.2, -7, 15.6, 34.7, 6.5, 17.2, { mat: 'metal' }); addCollider(33.2, -7, 18.8, 34.7, 6.5, 20.4, { mat: 'metal' });
  addCollider(33.2, 6.5, 15.6, 34.7, 14, 17.2, { bullet: false, sight: false }); addCollider(33.2, 6.5, 18.8, 34.7, 14, 20.4, { bullet: false, sight: false });
  // bulwark colliders (visual comes from double-sided hull)
  const bul = (x0, z0, x1, z1) => { addCollider(x0, DECK_Y, z0, x1, 4.7, z1, { mat: 'metal' }); addCollider(x0, 4.7, z0, x1, 14, z1, { bullet: false, sight: false }); };
  bul(-32, 11, -20, 11.3); bul(-17.6, 11, 17.6, 11.3); bul(20, 11, 24, 11.3);
  bul(-32, 24.7, 24, 25);
  bul(-32, 11, -31.7, 14.5); bul(-32, 21.5, -31.7, 25);
  // bulwark stanchions for detail (inner side)
  for (let x = -30; x < 24; x += 2) { addBox('white', x, DECK_Y, 11.2, x + 0.08, 4.6, 11.55); addBox('white', x, DECK_Y, 24.45, x + 0.08, 4.6, 24.8); }
  // fire main pipes
  addCyl('redpaint', -4, 3.78, 11.75, 0.09, 0.09, 50, 8, 0, 0, Math.PI / 2);
  addCyl('redpaint', -4, 3.78, 24.25, 0.09, 0.09, 50, 8, 0, 0, Math.PI / 2);
  // ship name on bow & stern
  for (const s of [1, -1]) {
    const x = 18.5, y = 3.2, z = SHIP_Z + s * (7 + 0.03);
    addDecal('shipName', x, y, z, s > 0 ? 1 : -1, 0, 0, 0, 1, 0, 8.0, 1.25, [0, 0, 1, 1]);
  }
  addDecal('shipPort', -32.04, 2.6, SHIP_Z, 0, 0, 1, 0, 1, 0, 9.0, 1.4, [0, 0, 1, 1]);

  // --- midship house ---
  const blocks = [[-6, 13.5, -0.8, 16.5], [0.8, 13.5, 6, 16.5], [-6, 19.5, -0.8, 22.5], [0.8, 19.5, 6, 22.5]];
  for (const [x0, z0, x1, z1] of blocks) {
    addBox('white', x0, DECK_Y, z0, x1, ROOF_Y, z1, { faces: F_SIDES, uv: 3, col: { mat: 'metal', walk: true } });
    addBox('deck', x0, ROOF_Y - 0.01, z0, x1, ROOF_Y, z1, { faces: F_PY, uv: 4 });
  }
  const wall = (x0, y0, z0, x1, y1, z1, walk) => addBox('white', x0, y0, z0, x1, y1, z1, { faces: F_NOBOT, uv: 3, col: { mat: 'metal', walk: !!walk } });
  wall(-6, DECK_Y, 16.5, -5.8, ROOF_Y, 17.2, true); wall(-6, DECK_Y, 18.8, -5.8, ROOF_Y, 19.5, true); wall(-6, 5.9, 17.2, -5.8, ROOF_Y, 18.8, true);
  wall(5.8, DECK_Y, 16.5, 6, ROOF_Y, 17.2, true); wall(5.8, DECK_Y, 18.8, 6, ROOF_Y, 19.5, true); wall(5.8, 5.9, 17.2, 6, ROOF_Y, 18.8, true);
  wall(-0.8, 5.9, 13.5, 0.8, ROOF_Y, 13.7, true); wall(-0.8, 5.9, 22.3, 0.8, ROOF_Y, 22.5, true);
  const ceil = (x0, z0, x1, z1) => {
    addBox('interior', x0, 6.7, z0, x1, ROOF_Y, z1, { faces: F_NY, uv: 2 });
    addBox('deck', x0, ROOF_Y - 0.01, z0, x1, ROOF_Y, z1, { faces: F_PY, uv: 4 });
    addCollider(x0, 6.7, z0, x1, ROOF_Y, z1, { mat: 'metal', walk: true });
  };
  ceil(-5.8, 16.5, 5.8, 19.5); ceil(-0.8, 13.7, 0.8, 16.5); ceil(-0.8, 19.5, 0.8, 22.3);
  addBox('deck', -6, ROOF_Y - 0.01, 16.5, -5.8, ROOF_Y, 19.5, { faces: F_PY }); addBox('deck', 5.8, ROOF_Y - 0.01, 16.5, 6, ROOF_Y, 19.5, { faces: F_PY });
  // interior trim: corridor wainscot, lights, pipes, fire extinguisher
  addBox('green', -5.8, DECK_Y, 16.5, 5.8, DECK_Y + 0.9, 16.52, { faces: F_PZ }); addBox('green', -5.8, DECK_Y, 19.48, 5.8, DECK_Y + 0.9, 19.5, { faces: F_NZ });
  for (const lx of [-3.4, 3.4]) { addBox('lamp', lx - 0.5, 6.66, 17.8, lx + 0.5, 6.7, 18.2, { faces: F_NY }); }
  addCyl('redpaint', 0, 6.45, 16.62, 0.05, 0.05, 11.4, 6, 0, 0, Math.PI / 2);
  addBox('redpaint', 2.2, 4.4, 19.35, 2.45, 4.95, 19.48); addBox('redpaint', -2.4, 4.4, 16.52, -2.15, 4.95, 16.65);
  const lampL = new THREE.PointLight(C(0xffd7a0), 1.1, 10, 2); lampL.position.set(0, 6.2, 18); root.add(lampL); MAP.lights.push(lampL);
  // door frames + open doors
  const doorFrame = (x, z, alongZ) => {
    if (alongZ) { addBox('dark', x - 0.24, DECK_Y, z - 0.9, x + 0.24, DECK_Y + 2.36, z - 0.78); addBox('dark', x - 0.24, DECK_Y, z + 0.78, x + 0.24, DECK_Y + 2.36, z + 0.9); addBox('dark', x - 0.24, DECK_Y + 2.3, z - 0.9, x + 0.24, DECK_Y + 2.42, z + 0.9); }
    else { addBox('dark', x - 0.9, DECK_Y, z - 0.24, x - 0.78, DECK_Y + 2.36, z + 0.24); addBox('dark', x + 0.78, DECK_Y, z - 0.24, x + 0.9, DECK_Y + 2.36, z + 0.24); addBox('dark', x - 0.9, DECK_Y + 2.3, z - 0.24, x + 0.9, DECK_Y + 2.42, z + 0.24); }
  };
  doorFrame(-5.9, 18, true); doorFrame(5.9, 18, true); doorFrame(0, 13.6, false); doorFrame(0, 22.4, false);
  addBox('steel', -6.1, DECK_Y + 0.05, 15.6, -6.04, DECK_Y + 2.25, 16.5); addBox('steel', 6.04, DECK_Y + 0.05, 19.5, 6.1, DECK_Y + 2.25, 20.4);
  addBox('steel', -1.7, DECK_Y + 0.05, 13.4, -0.8, DECK_Y + 2.25, 13.46); addBox('steel', 0.8, DECK_Y + 0.05, 22.54, 1.7, DECK_Y + 2.25, 22.6);
  // portholes
  for (const x of [-4.6, -2.4, 2.4, 4.6]) {
    addDecal('porthole', x, 5.4, 13.49, -1, 0, 0, 0, 1, 0, 0.55, 0.55, [0, 0, 1, 1]);
    addDecal('porthole', x, 5.4, 22.51, 1, 0, 0, 0, 1, 0, 0.55, 0.55, [0, 0, 1, 1]);
  }
  for (const z of [14.5, 15.7, 20.3, 21.5]) {
    addDecal('porthole', -6.01, 5.4, z, 0, 0, 1, 0, 1, 0, 0.55, 0.55, [0, 0, 1, 1]);
    addDecal('porthole', 6.01, 5.4, z, 0, 0, -1, 0, 1, 0, 0.55, 0.55, [0, 0, 1, 1]);
  }
  addDecal('warn', 3.4, 6.05, 13.49, -1, 0, 0, 0, 1, 0, 2.2, 0.41, [0, 0, 1, 1]);
  // house stairs (west rises toward +z, east toward -z)
  stairs(-7.4, 13.6, -6.0, 16.4, DECK_Y, ROOF_Y, 11, 'z+', { railSides: [-7.46], railColSides: [-7.46] });
  stairs(6.0, 19.6, 7.4, 22.4, DECK_Y, ROOF_Y, 11, 'z-', { railSides: [7.46], railColSides: [7.46] });
  // roof railings
  const RY = ROOF_Y;
  railing('white', -6, 13.5, 1.0, 13.5, RY); railing('white', 4.2, 13.5, 6, 13.5, RY);
  railing('white', -6, 22.5, 1.0, 22.5, RY); railing('white', 4.2, 22.5, 6, 22.5, RY);
  railing('white', -6, 13.5, -6, 15.2, RY); railing('white', -6, 17.0, -6, 22.5, RY);
  railing('white', 6, 13.5, 6, 19.0, RY); railing('white', 6, 20.8, 6, 22.5, RY);
  railing('white', -7.46, 16.4, -6, 16.4, RY - 0.02, { col: false });
  railing('white', 6, 19.6, 7.46, 19.6, RY - 0.02, { col: false });
  // bridge wings
  for (const side of [-1, 1]) {
    const z0 = side < 0 ? 11.4 : 22.5, z1 = side < 0 ? 13.5 : 24.6;
    const zb0 = side < 0 ? 11.4 : 24.45, zb1 = side < 0 ? 11.55 : 24.6;
    addBox('white', 1.0, 6.7, z0, 4.2, ROOF_Y, z1, { faces: F_SIDES | F_NY, uv: 3, col: { mat: 'metal', walk: true } });
    addBox('deck', 1.0, ROOF_Y - 0.01, z0, 4.2, ROOF_Y, z1, { faces: F_PY });
    addBox('white', 1.0, ROOF_Y, zb0, 4.2, ROOF_Y + 1.1, zb1, { uv: 3, col: { mat: 'metal' } });
    addBox('white', 1.0, ROOF_Y, z0, 1.15, ROOF_Y + 1.1, z1, { uv: 3, col: { mat: 'metal' } });
    addBox('white', 4.05, ROOF_Y, z0, 4.2, ROOF_Y + 1.1, z1, { uv: 3, col: { mat: 'metal' } });
    addCollider(1.0, ROOF_Y + 1.1, zb0, 4.2, 12, zb1, { bullet: false, sight: false });
    for (const bx of [1.6, 3.6]) addBeam('white', [bx, 5.7, side < 0 ? 13.5 : 22.5], [bx, 6.7, side < 0 ? 12.0 : 24.0], 0.12);
  }
  addBox('lampR', 3.95, 7.5, 11.38, 4.15, 7.7, 11.4, { faces: F_NZ }); glow(root, 4.05, 7.6, 11.3, 0.9, new THREE.Color(1, 0.1, 0.05));
  addBox('lampG', 3.95, 7.5, 24.6, 4.15, 7.7, 24.62, { faces: F_PZ }); glow(root, 4.05, 7.6, 24.7, 0.9, new THREE.Color(0.1, 1, 0.3));
  // wheelhouse
  addBox('white', 0.6, ROOF_Y, 15.5, 4.6, 8.1, 20.5, { faces: F_SIDES, uv: 3, col: { mat: 'metal' } });
  addCollider(0.6, 8.1, 15.5, 4.6, 9.8, 20.5, { mat: 'metal' });
  addBox('glass', 0.6, 8.1, 15.5, 4.6, 9.3, 20.5, { faces: F_SIDES, uv: 4 });
  addBox('white', 0.6, 9.3, 15.5, 4.6, 9.8, 20.5, { faces: F_SIDES, uv: 3 });
  addBox('white', 0.3, 9.8, 15.2, 4.9, 10.0, 20.8, { uv: 3 });
  addBox('dark', 4.6, 7.0, 16, 4.62, 8.0, 20, { faces: F_PX });
  // radar mast
  addCyl('white', 2.6, 11.9, 18, 0.12, 0.16, 3.8, 10);
  addBox('white', 2.4, 12.6, 16.4, 2.8, 12.75, 19.6);
  addCyl('white', 2.6, 13.9, 18, 0.05, 0.05, 2.0, 6);
  addBox('lampW', 2.52, 14.85, 17.92, 2.68, 15.0, 18.08); glow(root, 2.6, 14.95, 18, 1.0, new THREE.Color(1, 1, 0.9));
  const radar = new THREE.Group(); radar.position.set(2.6, 13.05, 18);
  const rb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 2.6), MAT.dark); rb.castShadow = true; radar.add(rb);
  const rb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.3, 8), MAT.white); rb2.position.y = -0.2; radar.add(rb2);
  root.add(radar); MAP.anim.radar = radar;
  for (const [x, z, h] of [[1.2, 16.2, 2.4], [4.0, 19.8, 3.0], [3.8, 16.0, 1.6]]) addCyl('white', x, 10 + h / 2, z, 0.03, 0.03, h, 5);
  addCyl('steel', 1.2, 10.3, 19.5, 0.18, 0.12, 0.6, 8, 0, 0, Math.PI / 2);
  // funnel
  const fS = (y0, y1, key, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, 20); BK[key].geom(g, mtx(-3, (y0 + y1) / 2, 18, 0, 0, 0, 1.45, 1, 1.6)); g.dispose(); };
  fS(ROOF_Y, 10.4, 'funnel', 1.05, 1.0); fS(10.4, 11.4, 'white', 1.0, 0.98); fS(11.4, 13.0, 'funnel', 0.98, 0.95); fS(13.0, 13.5, 'dark', 0.95, 0.94);
  addCyl('dark', -3.5, 13.9, 17.6, 0.22, 0.22, 1.0, 10); addCyl('dark', -2.5, 13.9, 18.4, 0.18, 0.18, 0.9, 10);
  addCollider(-4.5, ROOF_Y, 16.4, -1.5, 13.5, 19.6, { mat: 'metal' });
  MAP.anim.funnel = V3(-3.5, 14.4, 17.6);
  // lifeboat + davits
  {
    const g = new THREE.SphereGeometry(1, 20, 12);
    BK.orange.geom(g, mtx(-3, 6.35, 24.2, 0, 0, 0, 2.5, 0.72, 1.0));
    BK.orange.geom(g, mtx(-3, 6.75, 24.2, 0, 0, 0, 2.15, 0.5, 0.85));
    BK.white.geom(g, mtx(-3, 6.22, 24.2, 0, 0, 0, 2.52, 0.1, 1.02));
    g.dispose();
    for (const dx of [-4.8, -1.2]) { addBeam('white', [dx, DECK_Y + 2.2, 22.55], [dx, 7.6, 23.6], 0.16); addBeam('white', [dx, 7.6, 23.6], [dx, 7.6, 24.3], 0.14); addBeam('dark', [dx, 7.55, 24.2], [dx, 6.9, 24.2], 0.03); }
    addCollider(-5.5, 5.62, 23.2, -0.5, 7.1, 25.2, { mat: 'metal' });
  }
  // --- deck containers ---
  const DB = { baseY: DECK_Y, rng: R };
  container(16.595, 20.78, 40, 0, false, 2, DB); container(19.66, 20.78, 20, 1, false, 7, DB);
  container(13.53, 15.22, 20, 0, false, 0, DB); container(13.53, 15.22, 20, 1, false, 4, DB);
  container(19.995, 15.22, 10, 0, false, 6, DB);
  container(-16.595, 15.22, 40, 0, false, 1, DB); container(-19.66, 15.22, 20, 1, false, 3, DB);
  container(-13.53, 20.78, 20, 0, false, 5, DB); container(-13.53, 20.78, 20, 1, false, 0, DB);
  container(-19.995, 20.78, 10, 0, false, 2, DB);
  // lashing rods on container ends (visual)
  for (const [x, z0, z1] of [[-22.7, 14.0, 16.44], [22.7, 19.56, 22.0], [-10.5, 14.0, 16.44], [10.5, 19.56, 22.0]]) for (const t of [0.2, 0.8]) addBeam('steel', [x + (x > 0 ? 0.25 : -0.25), DECK_Y, lerp(z0, z1, t)], [x, DECK_Y + 2.3, lerp(z0, z1, t) + (t < 0.5 ? 0.3 : -0.3)], 0.03);
  crate(-23.5, DECK_Y, 19.8, 1.2); crate(-23.3, DECK_Y + 1.2, 20.0, 0.8);
  crate(14.0, DECK_Y, 12.1, 1.1); crate(-9.4, DECK_Y, 12.1, 1.0);
  // stern gear
  for (const z of [12.5, 22.0]) {
    addBox('green', -29.5, DECK_Y, z, -27.5, DECK_Y + 0.9, z + 1.5, { uv: 1, col: { mat: 'metal', walk: true } });
    addCyl('dark', -28.5, DECK_Y + 1.2, z + 0.75, 0.45, 0.45, 1.3, 14, Math.PI / 2, 0, 0);
    addCyl('rope', -28.5, DECK_Y + 1.2, z + 0.75, 0.5, 0.5, 1.0, 14, Math.PI / 2, 0, 0);
    addCollider(-29.1, DECK_Y + 0.9, z + 0.05, -27.9, DECK_Y + 1.7, z + 1.45, { mat: 'metal' });
  }
  for (const [x, z] of [[-30.9, 12.0], [-30.9, 24.0], [-24, 11.8], [-24, 24.2], [22.5, 11.9], [22.5, 24.1]]) { bollard(x - 0.3, z, DECK_Y); bollard(x + 0.3, z, DECK_Y); }
  addCyl('steel', -31.2, DECK_Y + 3.5, SHIP_Z, 0.05, 0.07, 7.0, 8);
  addCollider(-31.35, DECK_Y, SHIP_Z - 0.15, -31.05, DECK_Y + 7, SHIP_Z + 0.15, { mat: 'metal' });
  {
    const fg = new THREE.PlaneGeometry(1.6, 1.0, 10, 4); fg.translate(0.8, 0, 0);
    const fcan = makeCanvas(128, 80), fc = fcan.getContext('2d');
    fc.fillStyle = '#233a5c'; fc.fillRect(0, 0, 128, 80); fc.fillStyle = '#f2efe6'; fc.beginPath(); fc.arc(64, 40, 24, 0, TAU); fc.fill(); fc.fillStyle = '#e39a2d'; fc.beginPath(); fc.arc(64, 40, 17, 0, TAU); fc.fill(); fc.fillStyle = '#233a5c'; fc.beginPath(); fc.moveTo(50, 44); fc.lineTo(64, 30); fc.lineTo(78, 44); fc.lineTo(64, 38); fc.closePath(); fc.fill();
    const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: toTex(fcan), side: THREE.DoubleSide, roughness: 0.8 }));
    flag.position.set(-31.2, DECK_Y + 6.4, SHIP_Z); flag.castShadow = true; root.add(flag);
    MAP.anim.flag = flag; MAP.anim.flagBase = fg.attributes.position.array.slice();
  }
  addBox('lampW', -31.95, 4.9, 17.9, -31.9, 5.1, 18.1, { faces: F_NX }); glow(root, -32.05, 5.0, SHIP_Z, 0.8, new THREE.Color(1, 1, 0.9));
  // forecastle gear
  addBox('green', 27, FC_Y, 15.2, 29.5, FC_Y + 0.6, 20.8, { uv: 1, col: { mat: 'metal', walk: true } });
  for (const z of [16.2, 19.8]) { addCyl('dark', 28.2, FC_Y + 1.0, z, 0.55, 0.55, 1.0, 16, Math.PI / 2, 0, 0); }
  addCollider(27.6, FC_Y + 0.6, 15.6, 28.8, FC_Y + 1.55, 20.4, { mat: 'metal' });
  for (const z of [16.2, 19.8]) { addBox('dark', 29.5, FC_Y + 0.02, z - 0.12, 32.5, FC_Y + 0.12, z + 0.12, { uv: 1 }); }
  addCyl('white', 30, FC_Y + 4.5, SHIP_Z, 0.12, 0.18, 9, 10); addBox('white', 29.9, FC_Y + 6.5, 16.8, 30.1, FC_Y + 6.65, 19.2);
  addBox('lampW', 29.9, FC_Y + 8.9, 17.9, 30.1, FC_Y + 9.1, 18.1); glow(root, 30, FC_Y + 9.0, SHIP_Z, 1.1, new THREE.Color(1, 1, 0.9));
  addCollider(29.8, FC_Y, SHIP_Z - 0.2, 30.2, FC_Y + 9, SHIP_Z + 0.2, { mat: 'metal' });
  bollard(26.5, 12.8, FC_Y); bollard(26.5, 23.2, FC_Y); bollard(31.5, 15.2, FC_Y); bollard(31.5, 20.8, FC_Y);
  // forecastle stairs + break railing
  stairs(21.42, 12.2, 24, 13.8, DECK_Y, FC_Y, 6, 'x+', { rails: true });
  stairs(21.42, 22.2, 24, 23.8, DECK_Y, FC_Y, 6, 'x+', { rails: true });
  railing('white', 24.05, 11.8, 24.05, 12.2, FC_Y); railing('white', 24.05, 13.8, 24.05, 22.2, FC_Y); railing('white', 24.05, 23.8, 24.05, 24.3, FC_Y);

  // --- gangways (quay -> south deck) ---
  for (const s of [-1, 1]) {
    const px0 = s < 0 ? -20 : 17.6, px1 = px0 + 2.4;
    if (s < 0) stairs(-24.8, 5.2, -20, 6.8, 0, DECK_Y, 12, 'x+', {}); else stairs(20, 5.2, 24.8, 6.8, 0, DECK_Y, 12, 'x-', {});
    addBox('steel', px0, 3.35, 5.2, px1, DECK_Y, 11.3, { uv: 1, col: { mat: 'metal', walk: true } });
    for (const [px, pz] of [[px0 + 0.1, 5.3], [px1 - 0.1, 5.3], [px0 + 0.1, 7.6], [px1 - 0.1, 7.6]]) { addBox('dark', px - 0.1, 0, pz - 0.1, px + 0.1, 3.35, pz + 0.1, { col: { mat: 'metal' } }); }
    addBeam('dark', [px0 + 0.1, 0.2, 5.3], [px1 - 0.1, 3.2, 5.3], 0.08); addBeam('dark', [px0 + 0.1, 0.2, 7.6], [px1 - 0.1, 3.2, 7.6], 0.08);
    const outerX = s < 0 ? px0 : px1, innerX = s < 0 ? px1 : px0;
    railing('yellow', outerX, 6.8, outerX, 11.2, DECK_Y); railing('yellow', innerX, 5.2, innerX, 11.2, DECK_Y); railing('yellow', px0, 5.15, px1, 5.15, DECK_Y);
    addCollider(Math.min(outerX, innerX) - 0.1, DECK_Y + 1.3, 5.1, Math.max(outerX, innerX) + 0.1, 12, 5.25, { bullet: false, sight: false });
  }

  // --- stern ramp ---
  {
    const n = 24, x0 = -42, x1 = -32, run = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { const top = (i + 1) * (DECK_Y / n), sx0 = x0 + i * run; addCollider(sx0, Math.max(-1.5, top - 0.6), 14.5, sx0 + run, top, 21.5, { walk: true, stair: true, mat: 'metal' }); }
    const ang = Math.atan2(DECK_Y, x1 - x0), L = Math.hypot(DECK_Y, x1 - x0);
    addBoxR('steel', (x0 + x1) / 2, DECK_Y / 2 - 0.12, SHIP_Z, L + 0.2, 0.25, 7.0, 0, 0, ang);
    for (let k = 0; k < 20; k++) { const t = (k + 0.5) / 20; addBoxR('dark', lerp(x0, x1, t), lerp(0, DECK_Y, t) + 0.02, SHIP_Z, 0.06, 0.05, 6.8, 0, 0, ang); }
    for (const z of [14.45, 21.55]) {
      addBeam('dark', [x0, 0.1, z], [x1, DECK_Y + 0.1, z], 0.18);
      slopeRail('yellow', [x0 + 0.3, 0.1, z], [x1, DECK_Y, z], 1.05);
      for (let i = 0; i < n; i += 2) { const top = (i + 2) * (DECK_Y / n), sx0 = x0 + i * run; addCollider(sx0, top - 0.8, z - 0.07, sx0 + run * 2, top + 1.4, z + 0.07, { bullet: false, sight: false, mat: 'metal' }); }
    }
    for (const z of [14.8, 21.2]) addBeam('dark', [-32.2, 9.5, z], [-38, 2.2, z], 0.05);
    addBox('white', -32.3, DECK_Y, 13.8, -31.9, 9.8, 14.3, { col: { mat: 'metal' } }); addBox('white', -32.3, DECK_Y, 21.7, -31.9, 9.8, 22.2, { col: { mat: 'metal' } });
    addBox('white', -32.3, 9.4, 13.8, -31.9, 9.8, 22.2);
  }

  // --- east pier tower + gangplank to the bow ---
  stairs(38.4, 9.4, 40.0, 16.4, 0, FC_Y, 18, 'z+', {});
  addBox('steel', 38.0, 5.15, 16.4, 40.4, FC_Y, 19.6, { uv: 1, col: { mat: 'metal', walk: true } });
  for (const [px, pz] of [[38.15, 16.5], [40.25, 16.5], [38.15, 19.45], [40.25, 19.45]]) addBox('dark', px - 0.1, 0, pz - 0.1, px + 0.1, 5.15, pz + 0.1, { col: { mat: 'metal' } });
  addBox('steel', 33.2, 5.15, 17.2, 38.0, FC_Y, 18.8, { uv: 1, col: { mat: 'metal', walk: true } });
  railing('yellow', 33.3, 17.12, 38.0, 17.12, FC_Y); railing('yellow', 33.3, 18.88, 38.0, 18.88, FC_Y);
  railing('yellow', 40.45, 16.4, 40.45, 19.6, FC_Y); railing('yellow', 38.0, 19.66, 40.4, 19.66, FC_Y);
  railing('yellow', 38.0, 16.34, 38.4, 16.34, FC_Y); railing('yellow', 40.0, 16.34, 40.4, 16.34, FC_Y);
  railing('yellow', 38.0, 16.4, 38.0, 17.2, FC_Y); railing('yellow', 38.0, 18.8, 38.0, 19.6, FC_Y);
  addCollider(33.2, 6.8, 17.0, 38.0, 14, 17.2, { bullet: false, sight: false }); addCollider(33.2, 6.8, 18.8, 38.0, 14, 19.0, { bullet: false, sight: false });

  // --- mooring lines ---
  mooringLine(root, [-30.9, 4.3, 24.0], [-44, 0.6, 26.0], 0.8); mooringLine(root, [-30.9, 4.3, 12.0], [-44, 0.6, 10.0], 0.8);
  mooringLine(root, [-24, 4.3, 11.8], [-30, 0.6, 7.3], 0.6); mooringLine(root, [22.5, 4.3, 11.9], [30, 0.6, 7.3], 0.6);
  mooringLine(root, [26.5, 6.1, 23.2], [44, 0.6, 26.0], 1.0); mooringLine(root, [26.5, 6.1, 12.8], [34, 0.6, 7.25], 0.9);

  /* ===== apron ===== */
  stsCrane(root, -9, true, true);
  stsCrane(root, 9, true, false);
  truck(-7, 0.2, true);
  for (const x of [-36, -30, -12, -6, 6, 12, 30, 34]) bollard(x, 7.25);
  for (const [x, z] of [[-45, 26.5], [-42, 9.5], [44, 26.5], [42.5, 22]]) bollard(x, z);
  jersey(-31.5, 2.7, -28.5, 3.3); jersey(28.5, 2.7, 31.5, 3.3); jersey(-22, -1.3, -19, -0.7); jersey(19, -1.3, 22, -0.7);
  jersey(-16, 2.2, -15.4, 5.2); jersey(15.4, 2.2, 16, 5.2);
  palletStack(-27, 5.6, 1.3); palletStack(25.8, 5.6, 1.3); palletStack(-26.5, 1.4, 0.9); palletStack(25.3, 1.6, 1.0);
  forklift(-33, 5.0, true);
  cableDrum(32, 5.2); cableDrum(34.2, 4.6);
  for (const x of [-36, -24, 0, 24, 36]) lightPole(root, x, -5.0, 15, true);
  // blue & red spawn shields
  for (const lv of [0, 1]) { container(-38.78, 0, 20, lv, true, null, { rng: R }); container(38.78, 0, 20, lv, true, null, { rng: R }); }
  crate(-44.5, 0, -7.5, 1.2); crate(-44.3, 1.2, -7.3, 0.8); crate(43.3, 0, -7.5, 1.2); crate(43.5, 1.2, -7.3, 0.8);
  palletStack(-46, 16.5, 1.2); palletStack(44.8, 16.5, 1.2); palletStack(-47, -18, 1.4); palletStack(45.8, -18, 1.4);

  /* ===== container yard ===== */
  const Y = (cx, cz, len, levels, v) => { for (let lv = 0; lv < levels; lv++) container(cx, cz, len, lv, false, v === undefined ? null : v[lv], { rng: R }); };
  Y(-27.905, -7.78, 40, 2); Y(-14.47, -7.78, 20, 1); Y(-7.47, -7.78, 20, 3);
  Y(7.47, -7.78, 20, 3); Y(14.47, -7.78, 20, 1); Y(27.905, -7.78, 40, 2);
  Y(-23.905, -14.28, 40, 1); container(-26.97, -14.28, 20, 1, false, null, { rng: R });
  Y(-10.97, -14.28, 20, 2); Y(10.97, -14.28, 20, 2);
  Y(23.905, -14.28, 40, 1); container(26.97, -14.28, 20, 1, false, null, { rng: R });
  Y(-27.905, -21.28, 40, 1); Y(-11.905, -21.28, 40, 2); Y(11.905, -21.28, 40, 2); Y(27.905, -21.28, 40, 1);
  container(0, -21.28, 10, 0, false, null, { rng: R });
  crate(-17.2, 0, -11.9, 1.2); crate(16.0, 0, -11.9, 1.2); crate(-31.8, 0, -18.4, 1.1); crate(30.7, 0, -18.4, 1.1);
  crate(-4.6, 0, -24.8, 1.2); crate(3.4, 0, -24.8, 1.2); crate(-19.5, 0, -24.5, 1.0); crate(18.5, 0, -24.5, 1.0);
  jersey(-36.5, -12.9, -35.9, -9.9); jersey(35.9, -12.9, 36.5, -9.9);
  for (const x of [-36, 36]) lightPole(root, x, -17.5, 15, true);
  // office cabin
  {
    const cw = (x0, y0, z0, x1, y1, z1) => addBox('white', x0, y0, z0, x1, y1, z1, { uv: 2, col: { mat: 'wood', pen: 0.45 } });
    for (const [za, zb] of [[-11.65, -11.5], [-15, -14.85]]) {
      cw(-3, 0, za, 3, 1.0, zb); cw(-3, 2.0, za, 3, 2.8, zb);
      cw(-3, 1.0, za, -2.3, 2.0, zb); cw(-0.7, 1.0, za, 0.7, 2.0, zb); cw(2.3, 1.0, za, 3, 2.0, zb);
      for (const [wa, wb] of [[-2.3, -0.7], [0.7, 2.3]]) { addBox('dark', wa, 0.96, za, wb, 1.02, zb); addBox('dark', wa, 1.98, za, wb, 2.04, zb); }
    }
    for (const [xa, xb] of [[-3, -2.85], [2.85, 3]]) { cw(xa, 0, -14.85, xb, 2.8, -13.9); cw(xa, 0, -12.6, xb, 2.8, -11.65); cw(xa, 2.1, -13.9, xb, 2.8, -12.6); }
    addBox('dark', -3.1, 2.8, -15.1, 3.1, 3.0, -11.4, { uv: 2, col: { mat: 'metal', walk: true } });
    addBox('interior', -2.85, 2.78, -14.85, 2.85, 2.8, -11.65, { faces: F_NY });
    addBox('wood', -1.2, 0, -14.6, 1.2, 0.78, -14.0, { faceUV: true, col: { mat: 'wood', pen: 0.6 } });
    addBox('screen', -0.35, 0.8, -14.45, 0.35, 1.2, -14.43, { faces: F_PZ }); addBox('dark', -0.4, 0.78, -14.5, 0.4, 1.25, -14.45);
    addBox('steel', 1.9, 0, -14.8, 2.7, 1.4, -14.3, { col: { mat: 'metal' } });
    addBox('dark', 2.2, 2.9, -13.0, 2.9, 3.4, -12.2);
    addBox('lamp', -0.5, 2.74, -13.35, 0.5, 2.78, -13.15, { faces: F_NY });
    const cl = new THREE.PointLight(C(0xfff0d8), 0.7, 7, 2); cl.position.set(0, 2.5, -13.25); root.add(cl); MAP.lights.push(cl);
  }

  /* ===== backdrop ===== */
  buildBackdrop(root, R);

  /* ===== spawns & hotspots ===== */
  const sp = [[-46, -22], [-46, -12], [-47, -4], [-44, 3.5], [-47, 13], [-45, 22], [-48, -26], [-42.5, -16], [-48.5, 6], [-42.5, 26]];
  for (const [x, z] of sp) { MAP.spawns.blue.push({ x, y: 0, z, yaw: -Math.PI / 2 }); MAP.spawns.red.push({ x: -x, y: 0, z, yaw: Math.PI / 2 }); }
  const H = (name, x, y, z, tags = '') => MAP.hotspots.push({ name, x, y, z, tags });
  H('船尾', -28, DECK_Y, 18, 'ship long'); H('船尾北', -27, DECK_Y, 23.5, 'ship'); H('船尾南', -27, DECK_Y, 12.5, 'ship');
  H('西甲板南', -15, DECK_Y, 12.4, 'ship'); H('西甲板北', -21, DECK_Y, 23.6, 'ship'); H('西货间', -18, DECK_Y, 18, 'ship');
  H('东甲板南', 15, DECK_Y, 12.4, 'ship'); H('东甲板北', 15, DECK_Y, 23.6, 'ship'); H('东货间', 15, DECK_Y, 18, 'ship');
  H('舱室西门', -8.6, DECK_Y, 18, 'ship'); H('舱室东门', 8.6, DECK_Y, 18, 'ship'); H('舱室走廊', 0, DECK_Y, 18, 'ship in');
  H('舱顶', -3, ROOF_Y, 14.6, 'ship long high'); H('舱顶北', 4.8, ROOF_Y, 21.6, 'ship long high'); H('南侧翼桥', 2.6, ROOF_Y, 12.4, 'ship long high'); H('北侧翼桥', 2.6, ROOF_Y, 23.6, 'ship high');
  H('艏楼', 31.3, FC_Y, 16.6, 'ship long high'); H('艏楼南', 26, FC_Y, 13.4, 'ship high'); H('艏楼北', 26, FC_Y, 22.6, 'ship high');
  H('西舷梯', -18.8, DECK_Y, 9.5, 'long high'); H('东舷梯', 18.8, DECK_Y, 9.5, 'long high');
  H('岸边西', -30, 0, 0, ''); H('岸边中', 0, 0, 5.0, ''); H('岸边东', 30, 0, 0, ''); H('拖车南', -2, 0, -1.7, ''); H('西岸桥', -9, 0, 3.5, ''); H('东岸桥', 9, 0, 4.5, '');
  H('西码头', -44, 0, 18, 'long'); H('东塔楼', 41.5, 0, 8.6, ''); H('东登船台', 39.2, FC_Y, 18, 'long high');
  H('堆场西北', -20, 0, -11, ''); H('堆场东北', 20, 0, -11, ''); H('堆场中央', 0, 0, -17.6, ''); H('调度室', 0, 0, -13.2, 'in');
  H('堆场西南', -20, 0, -17.8, ''); H('堆场东南', 20, 0, -17.8, ''); H('南巷', 0, 0, -25, 'long'); H('南巷西', -30, 0, -25, ''); H('南巷东', 30, 0, -25, '');
  H('堆场西', -37, 0, -13, ''); H('堆场东', 36.5, 0, -13, '');

  // build all buckets
  for (const k of Object.keys(BK)) BK[k].build(root);
  return root;
}

function buildBackdrop(root, R) {
  const bd = BK.bd, col = (hex) => C(hex);
  const bbox = (x0, y0, z0, x1, y1, z1, c, faces) => addBox('bd', x0, y0, z0, x1, y1, z1, { color: c, faces: faces === undefined ? F_NOBOT : faces });
  // container stacks behind the fence and beyond the side walls (visual only)
  const stack = (cx, cz, len, levels, alongZ) => { for (let lv = 0; lv < levels; lv++) container(cx, cz, len, lv, alongZ, null, { rng: R, bkS: 'cside2', bkE: 'cend2', col: false, noLogo: R() < 0.6 }); };
  for (const rz of [-33.5, -37.2, -44, -47.7, -54.5, -58.2]) {
    let x = -110 + R() * 6;
    while (x < 110) { const len = R() < 0.6 ? 40 : 20, L = CL[len]; if (R() < 0.9) stack(x + L / 2, rz, len, 1 + Math.floor(R() * 4.2)); x += L + 0.4 + (R() < 0.15 ? 5 : 0); }
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 7; k++) {
      const x = s * (58 + k * 3.8);
      let z = -100; while (z < 4) { const len = R() < 0.6 ? 40 : 20, L = CL[len]; if (R() < 0.85) stack(x, z + L / 2, len, 1 + Math.floor(R() * 4.5), true); z += L + 0.5 + (R() < 0.2 ? 6 : 0); }
    }
  }
  // distant cranes (both sides) and a neighbour ship
  for (const cx of [-86, -128, 92, 136]) stsCrane(root, cx, false, false, 0);
  { // neighbour vessel at the east berth
    const x0 = 104, x1 = 190, z0 = 11, z1 = 25;
    bbox(x0, -3, z0, x1, 4.5, z1, col(0x1c2733));
    bbox(x0 + 2, 4.5, z0 + 1, x0 + 14, 17, z1 - 1, col(0xd9d6cc));
    for (let x = x0 + 18; x < x1 - 8; x += 6.3) { const h = 2 + Math.floor(R() * 4); for (let lv = 0; lv < h; lv++) container(x + 3, 18, 20, lv, false, null, { rng: R, baseY: 4.5, bkS: 'cside2', bkE: 'cend2', col: false, noLogo: true }); }
  }
  // warehouses & sheds
  for (const [x0, x1, z0, z1, h, c] of [[-120, -40, -112, -82, 13, 0x8d9296], [-20, 70, -118, -86, 15, 0x9a8f80], [80, 140, -110, -80, 12, 0x7f8a8f]]) {
    bbox(x0, 0, z0, x1, h, z1, col(c));
    bbox(x0 - 0.5, h, z0 - 0.5, x1 + 0.5, h + 0.6, z1 + 0.5, col(0x5b5f63));
    for (let x = x0 + 6; x < x1 - 4; x += 12) bbox(x, 0, z1, x + 5, 5.5, z1 + 0.1, col(0x3e464d), F_PZ);
  }
  // high-mast lights
  for (const [x, z] of [[-62, -66], [0, -70], [62, -66], [-75, -20], [78, -24]]) {
    addCyl('steel', x, 16, z, 0.25, 0.45, 32, 8);
    addBox('dark', x - 1.4, 31.5, z - 1.4, x + 1.4, 32.2, z + 1.4);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; glow(root, x + Math.cos(a) * 1.2, 31.4, z + Math.sin(a) * 1.2, 4.5, null, 0.9); }
  }
  // city skyline with lit windows (south, far)
  for (let k = 0; k < 46; k++) {
    const x = -520 + k * 23 + R() * 8, z = -330 - R() * 160, w = 12 + R() * 16, d = 12 + R() * 16, h = 18 + Math.pow(R(), 1.6) * 90;
    addBox('facade', x, 0, z, x + w, h, z + d, { faces: F_SIDES, uv: 32 });
    bbox(x, h, z, x + w, h + 0.5, z + d, col(0x4d5157), F_PY);
    if (h > 70) glow(root, x + w / 2, h + 2, z + d / 2, 3, new THREE.Color(1, 0.1, 0.05), 0.9);
  }
  // hills ring
  {
    const n = 90, pos = [], cols = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = lerp(-Math.PI * 1.08, 0.08, i / n), rr = 900 + Math.sin(i * 1.7) * 60;
      const h = 60 + (Math.sin(i * 0.37) * 0.5 + 0.5) * 120 + Math.sin(i * 1.3) * 25 + R() * 20;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      pos.push(x, -2, z, x, h, z);
      const c0 = col(0x8c8a8e), c1 = col(0x5f6873); cols.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
      if (i < n) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false })); root.add(m);
  }
  // breakwater + lighthouse
  bbox(-420, -3, 158, 60, 2.2, 170, col(0x77736b));
  for (let x = -410; x < 60; x += 7) bbox(x, 2.2, 157 + R() * 2, x + 3 + R() * 2, 3 + R() * 1.2, 160 + R() * 3, col(0x8a857b));
  {
    const x = 66, z = 164;
    bbox(x - 5, -3, z - 5, x + 5, 2.2, z + 5, col(0x77736b));
    const segs = [[2.2, 6, 0xf1eee6], [6, 9, 0xc0392b], [9, 13, 0xf1eee6], [13, 16, 0xc0392b]];
    for (const [y0, y1, c] of segs) { const g = new THREE.CylinderGeometry(1.6 - y1 * 0.03, 1.6 - y0 * 0.03, y1 - y0, 14); BK.bd.geom(g, mtx(x, (y0 + y1) / 2, z), col(c)); g.dispose(); }
    bbox(x - 1.2, 16, z - 1.2, x + 1.2, 17.8, z + 1.2, col(0x39424a));
    MAP.anim.lighthouse = glow(root, x, 17, z, 6, new THREE.Color(1, 0.85, 0.5), 1);
  }
  // anchored ships far out
  for (const [x, z, L, s] of [[-260, 520, 120, 1], [120, 680, 160, -1], [420, 460, 90, 1], [-520, 760, 140, 1]]) {
    bbox(x - L / 2, -3, z - L * 0.08, x + L / 2, 7, z + L * 0.08, col(0x222b33));
    bbox(x + s * L * 0.35 - 6, 7, z - L * 0.06, x + s * L * 0.35 + 6, 20, z + L * 0.06, col(0xcfccc2));
    for (let k = 0; k < 6; k++) { const xx = x - L * 0.3 + k * L * 0.1; bbox(xx - 3, 7, z - L * 0.06, xx + 3, 7 + 3 + R() * 7, z + L * 0.06, new THREE.Color().setHSL(R(), 0.4, 0.3)); }
    glow(root, x + s * L * 0.35, 21, z, 5, new THREE.Color(1, 1, 0.8), 0.8);
    glow(root, x - s * L * 0.45, 9, z, 4, new THREE.Color(1, 1, 0.8), 0.7);
  }
  // buoys
  MAP.anim.buoys = [];
  for (const [x, z, red] of [[-30, 70, 1], [30, 70, 0], [-60, 130, 1], [55, 125, 0]]) {
    const g = new THREE.Group(); g.position.set(x, SEA_Y, z);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 2.2, 10), new THREE.MeshStandardMaterial({ color: red ? C(0xb8322a) : C(0x2f7a3c), roughness: 0.6 }));
    b.position.y = 0.9; g.add(b);
    const sprite = glow(g, 0, 2.4, 0, 2.2, red ? new THREE.Color(1, 0.1, 0.05) : new THREE.Color(0.1, 1, 0.2));
    root.add(g); MAP.anim.buoys.push({ g, sprite, ph: R() * 6 });
  }
}
