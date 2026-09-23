/* ============================ WEAPONS ============================ */
const WPN = {
  rifle: { id: 'rifle', name: 'VX-7 突击步枪', slot: 1, auto: true, rpm: 620, mag: 30, reserve: 120, reload: 2.35, dmg: 34, head: 4.0, leg: 0.75, range: 230, f0: 35, f1: 80, fMin: 0.72, pen: 1, penD: 0.9,
    spread: 0.3, sMove: 3.4, sAir: 9, sCrouch: 0.75, sAds: 0.35, bloom: 0.34, bloomMax: 3.2, bloomRec: 6.5, rUp: 0.6, rSide: 0.24, rRec: 8, speed: 1.0, adsFov: 56, adsT: 0.17, draw: 0.6, snd: 'rifle' },
  sniper: { id: 'sniper', name: 'LR-338 狙击枪', slot: 1, auto: false, rpm: 50, bolt: 1.2, mag: 5, reserve: 25, reload: 3.1, dmg: 115, head: 3.0, leg: 0.85, range: 420, f0: 999, f1: 999, fMin: 1, pen: 2, penD: 1.5,
    spread: 0.015, sHip: 7, sMove: 6, sAir: 14, sCrouch: 0.8, sAds: 1, bloom: 0, bloomMax: 0, bloomRec: 1, rUp: 2.6, rSide: 0.4, rRec: 5, speed: 0.9, zoom: [30, 11], adsT: 0.22, draw: 0.85, snd: 'sniper' },
  pistol: { id: 'pistol', name: 'P9 手枪', slot: 2, auto: false, rpm: 380, mag: 13, reserve: 52, reload: 1.85, dmg: 27, head: 3.8, leg: 0.75, range: 160, f0: 18, f1: 50, fMin: 0.6, pen: 0, penD: 0.3,
    spread: 0.5, sMove: 2.0, sAir: 6, sCrouch: 0.8, sAds: 0.5, bloom: 0.9, bloomMax: 3.6, bloomRec: 7, rUp: 1.3, rSide: 0.35, rRec: 9, speed: 1.06, adsFov: 64, adsT: 0.14, draw: 0.4, snd: 'pistol' },
  knife: { id: 'knife', name: '战术刀', slot: 3, melee: true, speed: 1.12, draw: 0.35 },
  nade: { id: 'nade', name: 'FRAG-12 破片手雷', slot: 4, speed: 1.05, draw: 0.35 },
};
function falloff(W, d) { if (d <= W.f0) return 1; if (d >= W.f1) return W.fMin; return lerp(1, W.fMin, (d - W.f0) / (W.f1 - W.f0)); }
function dirFromYawPitch(yaw, pitch, out) { const cp = Math.cos(pitch); return out.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp); }
function spreadDir(base, deg, out) {
  if (deg <= 0) return out.copy(base);
  const r = Math.tan(deg * DEG) * Math.sqrt(Math.random()), a = Math.random() * TAU;
  const up = Math.abs(base.y) > 0.95 ? V3(1, 0, 0) : V3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(base, up).normalize(), v = new THREE.Vector3().crossVectors(u, base);
  return out.copy(base).addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).normalize();
}
// hitboxes
const HB = { hx: 0, hy: 0, hz: 0, hr: 0.13, t0: 0, t1: 0, l1: 0, tw: 0.25, lw: 0.2 };
function charHitboxes(c) {
  const k = c.crouchK, p = c.pos;
  HB.hx = p.x - Math.sin(c.yaw) * 0.05; HB.hz = p.z - Math.cos(c.yaw) * 0.05; HB.hy = p.y + lerp(1.66, 1.24, k);
  HB.t0 = p.y + lerp(0.95, 0.56, k); HB.t1 = p.y + lerp(1.54, 1.14, k); HB.l1 = HB.t0; HB.lw = lerp(0.19, 0.27, k);
  return HB;
}
function raySphere(o, d, cx, cy, cz, r) {
  const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz, b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - c;
  if (disc < 0) return -1; const t = -b - Math.sqrt(disc); return t >= 0 ? t : -1;
}
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tn = -1e9, tf = 1e9;
  const s = [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]];
  for (const [oo, dd, a, b] of s) {
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return -1; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tn) tn = t1; if (t2 < tf) tf = t2; if (tn > tf) return -1;
  }
  return tf < 0 ? -1 : Math.max(0, tn);
}
function rayHitChar(o, d, c, maxT) {
  // broad phase
  const cx = c.pos.x - o.x, cy = c.pos.y + 1 - o.y, cz = c.pos.z - o.z, tc = cx * d.x + cy * d.y + cz * d.z;
  if (tc < -1.5 || tc > maxT + 1.5) return null;
  const qx = cx - d.x * tc, qy = cy - d.y * tc, qz = cz - d.z * tc; if (qx * qx + qy * qy + qz * qz > 2.6) return null;
  const h = charHitboxes(c); let best = null;
  const th = raySphere(o, d, h.hx, h.hy, h.hz, h.hr); if (th >= 0 && th < maxT) best = { t: th, part: 'head' };
  const tt = rayBox(o, d, c.pos.x - h.tw, h.t0, c.pos.z - h.tw, c.pos.x + h.tw, h.t1, c.pos.z + h.tw);
  if (tt >= 0 && tt < (best ? best.t : maxT)) best = { t: tt, part: 'torso' };
  const tl = rayBox(o, d, c.pos.x - h.lw, c.pos.y, c.pos.z - h.lw, c.pos.x + h.lw, h.l1, c.pos.z + h.lw);
  if (tl >= 0 && tl < (best ? best.t : maxT)) best = { t: tl, part: 'legs' };
  return best;
}
const _bo = new THREE.Vector3(), _be = new THREE.Vector3();
// fire one bullet; returns end point (Vector3, reused) and whether a character was hit
function fireBullet(sh, o, d, W) {
  let rem = W.range, mul = 1, pen = W.pen, skip = null, trav = 0, hitChar = null;
  _bo.copy(o);
  const nearPlayer = (x, y, z) => { const c = camera.position; return (x - c.x) ** 2 + (y - c.y) ** 2 + (z - c.z) ** 2 < 1600; };
  for (let it = 0; it < 4; it++) {
    const wh = raycast(_bo, d, rem, 'bullet', skip);
    let wt = rem, box = null, nx = 0, ny = 0, nz = 0, tf = 0;
    if (wh) { wt = wh.t; box = wh.box; nx = wh.nx; ny = wh.ny; nz = wh.nz; tf = wh.tf; }
    // characters
    let best = null, bc = null;
    for (const c of Game.all) {
      if (c === sh || !c.alive || c.team === sh.team) continue;
      const h = rayHitChar(_bo, d, c, wt);
      if (h && (!best || h.t < best.t)) { best = h; bc = c; }
    }
    // water
    if (d.y < -1e-4) {
      const tw = (SEA_Y - _bo.y) / d.y;
      if (tw > 0 && tw < wt && (!best || tw < best.t)) {
        _be.copy(_bo).addScaledVector(d, tw); FX.splash(_be.x, SEA_Y, _be.z, 0.5); if (nearPlayer(_be.x, _be.y, _be.z)) Snd.impact(_be, 'water');
        return { end: _be, hit: null };
      }
    }
    if (best) {
      _be.copy(_bo).addScaledVector(d, best.t);
      const dist = trav + best.t, part = best.part;
      const dmg = W.dmg * mul * falloff(W, dist) * (part === 'head' ? W.head : part === 'legs' ? W.leg : 1);
      FX.bloodBurst(_be.x, _be.y, _be.z, d.x, d.y, d.z, part === 'head');
      if (nearPlayer(_be.x, _be.y, _be.z)) Snd.impact(_be, 'flesh');
      applyDamage(bc, dmg, sh, { weapon: W.id, head: part === 'head', dir: d.clone(), pos: _be.clone(), pen: mul < 1 });
      hitChar = bc;
      return { end: _be, hit: hitChar };
    }
    if (!wh) { _be.copy(_bo).addScaledVector(d, rem); return { end: _be, hit: null }; }
    _be.copy(_bo).addScaledVector(d, wt);
    FX.impact(_be.x, _be.y, _be.z, nx, ny, nz, box.mat);
    if (nearPlayer(_be.x, _be.y, _be.z) && Math.random() < 0.8) Snd.impact(_be, box.mat);
    const thick = tf - wt;
    if (box.pen > 0 && pen > 0 && thick < W.penD) {
      mul *= box.pen * (1 - (thick / W.penD) * 0.4); pen--;
      const ex = _bo.x + d.x * tf, ey = _bo.y + d.y * tf, ez = _bo.z + d.z * tf;
      FX.holes.add(ex, ey, ez, d.x, d.y, d.z, 0.07);
      trav += tf + 0.01; rem -= tf + 0.01; if (rem <= 0) return { end: _be, hit: null };
      _bo.set(ex + d.x * 0.01, ey + d.y * 0.01, ez + d.z * 0.01); skip = box;
      continue;
    }
    return { end: _be, hit: null };
  }
  return { end: _be, hit: hitChar };
}
// bullet passing near the player -> whiz
function checkWhiz(sh, o, end) {
  const P = Game.player; if (!P || !P.alive || sh.team === P.team) return;
  const hx = P.pos.x, hy = P.pos.y + P.eye, hz = P.pos.z;
  const dx = end.x - o.x, dy = end.y - o.y, dz = end.z - o.z, L2 = dx * dx + dy * dy + dz * dz; if (L2 < 1) return;
  let t = ((hx - o.x) * dx + (hy - o.y) * dy + (hz - o.z) * dz) / L2; t = clamp(t, 0, 1);
  const px = o.x + dx * t, py = o.y + dy * t, pz = o.z + dz * t, dd = (px - hx) ** 2 + (py - hy) ** 2 + (pz - hz) ** 2;
  if (dd < 2.2 && dd > 0.04 && t < 0.98) Snd.whiz(V3(px, py, pz));
}

/* ---------------- grenades ---------------- */
const Nades = [];
let nadeGeo = null, nadeMat = null;
function throwNade(owner, p, v) {
  if (!nadeGeo) { nadeGeo = new THREE.IcosahedronGeometry(0.055, 1); nadeMat = new THREE.MeshStandardMaterial({ color: C(0x4a5038), roughness: 0.6, metalness: 0.2 }); }
  const m = new THREE.Mesh(nadeGeo, nadeMat); m.castShadow = true; scene.add(m);
  Nades.push({ owner, p: p.clone(), v: v.clone(), t: 3.0, m, spin: V3(rand(-12, 12), rand(-12, 12), rand(-12, 12)), sunk: false });
  Game.noise(p, 12, owner, 'nade');
}
function updateNades(dt) {
  const cand = [];
  for (let i = Nades.length - 1; i >= 0; i--) {
    const n = Nades[i];
    const sub = 4, sd = dt / sub;
    for (let s = 0; s < sub && !n.sunk; s++) {
      n.v.y -= 19 * sd;
      const nx = n.p.x + n.v.x * sd, ny = n.p.y + n.v.y * sd, nz = n.p.z + n.v.z * sd, r = 0.06;
      queryBoxes(Math.min(n.p.x, nx) - 0.2, Math.min(n.p.z, nz) - 0.2, Math.max(n.p.x, nx) + 0.2, Math.max(n.p.z, nz) + 0.2, cand);
      let hitB = null;
      for (const b of cand) { if (!(b.bullet || b.move)) continue; if (nx + r > b.x0 && nx - r < b.x1 && ny + r > b.y0 && ny - r < b.y1 && nz + r > b.z0 && nz - r < b.z1) { hitB = b; break; } }
      if (hitB) {
        const b = hitB, px = n.p.x, py = n.p.y, pz = n.p.z;
        const outX = px + r <= b.x0 || px - r >= b.x1, outY = py + r <= b.y0 || py - r >= b.y1, outZ = pz + r <= b.z0 || pz - r >= b.z1;
        const sp = n.v.length();
        if (outY) { n.v.y *= -0.32; n.v.x *= 0.62; n.v.z *= 0.62; } else if (outX) { n.v.x *= -0.45; n.v.z *= 0.8; } else if (outZ) { n.v.z *= -0.45; n.v.x *= 0.8; } else { n.v.multiplyScalar(-0.3); }
        if (sp > 2.5) Snd.click(rand(700, 1100), clamp(sp / 18, 0.08, 0.35), 0.05, 0, n.p);
        n.spin.multiplyScalar(0.7);
      } else { n.p.set(nx, ny, nz); }
      if (n.p.y < SEA_Y) { n.sunk = true; FX.splash(n.p.x, SEA_Y, n.p.z, 1); Snd.impact(n.p, 'water'); }
    }
    n.m.position.copy(n.p); n.m.rotation.x += n.spin.x * dt; n.m.rotation.y += n.spin.y * dt; n.m.rotation.z += n.spin.z * dt;
    n.t -= dt;
    if (n.t <= 0) {
      scene.remove(n.m); Nades.splice(i, 1);
      if (!n.sunk) explodeNade(n); else FX.splash(n.p.x, SEA_Y, n.p.z, 2.5);
    }
  }
}
function explodeNade(n) {
  const p = n.p; p.y = Math.max(p.y, SEA_Y + 0.1);
  let gy = p.y; const down = raycast(V3(p.x, p.y + 0.2, p.z), V3(0, -1, 0), 2, 'bullet'); if (down) gy = p.y + 0.2 - down.t;
  FX.explosion({ x: p.x, y: p.y, z: p.z, gy }); Snd.explosion(p);
  const dc = camera.position.distanceTo(p); FX.shake = Math.max(FX.shake, clamp(1.4 - dc / 16, 0, 1.2));
  Game.noise(p, 70, n.owner, 'boom');
  const R = 7.5, o = V3(p.x, p.y + 0.25, p.z);
  for (const c of Game.all) {
    if (!c.alive) continue;
    if (c.team === n.owner.team && c !== n.owner) continue;
    const t = V3(c.pos.x, c.pos.y + 1.0, c.pos.z), d = o.distanceTo(t);
    if (d > R) continue;
    if (!losClear(o, t) && !losClear(o, V3(c.pos.x, c.pos.y + 1.6, c.pos.z))) continue;
    const dmg = 125 * Math.pow(1 - d / R, 1.25) + (d < 1.5 ? 20 : 0);
    if (dmg > 2) applyDamage(c, dmg, n.owner, { weapon: 'nade', head: false, dir: t.clone().sub(o).normalize(), pos: t });
  }
}

/* ---------------- knife ---------------- */
function knifeAttack(sh, heavy) {
  const eye = sh.eyePos(V3()), dir = dirFromYawPitch(sh.yaw, sh.pitch, V3());
  const range = heavy ? 1.75 : 1.95; let best = null, bd = 1e9;
  for (const c of Game.all) {
    if (c === sh || !c.alive || c.team === sh.team) continue;
    const t = V3(c.pos.x, c.pos.y + (c.crouchK > 0.5 ? 0.8 : 1.15), c.pos.z), v = t.clone().sub(eye), d = v.length();
    if (d > range + 0.35) continue;
    v.divideScalar(d); if (v.dot(dir) < Math.cos(40 * DEG) && d > 0.8) continue;
    if (!losClear(eye, t)) continue;
    if (d < bd) { bd = d; best = c; }
  }
  if (best) {
    const f = V3(-Math.sin(best.yaw), 0, -Math.cos(best.yaw)), toA = V3(sh.pos.x - best.pos.x, 0, sh.pos.z - best.pos.z).normalize();
    const back = f.dot(toA) < -0.35;
    let dmg = heavy ? (back ? 180 : 65) : (back ? 90 : 34);
    const hp = V3(best.pos.x, best.pos.y + 1.2, best.pos.z);
    FX.bloodBurst(hp.x, hp.y, hp.z, dir.x, dir.y, dir.z, false); Snd.impact(hp, 'flesh');
    applyDamage(best, dmg, sh, { weapon: 'knife', head: false, dir, pos: hp, back });
    return true;
  }
  const h = raycast(eye, dir, range, 'bullet');
  if (h) { const hp = eye.clone().addScaledVector(dir, h.t); FX.impact(hp.x, hp.y, hp.z, h.nx, h.ny, h.nz, h.box.mat, false); Snd.impact(hp, h.box.mat === 'wood' ? 'wood' : 'metal'); }
  return false;
}

/* ============================ VIEWMODEL ============================ */
const VM = { models: {}, cur: null, swayX: 0, swayY: 0, bobPh: 0, kick: 0, dip: 0, shells: [], t: 0, sunK: 1, sunT: 0, shadowCheck: 0 };
function initVM() {
  VM.scene = new THREE.Scene();
  VM.cam = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.01, 30); VM.scene.add(VM.cam);
  VM.hemi = new THREE.HemisphereLight(C(0xb3c2dc), C(0x5c4c3e), 0.8); VM.scene.add(VM.hemi);
  VM.sun = new THREE.DirectionalLight(C(0xffc79a), 2.3); VM.scene.add(VM.sun); VM.scene.add(VM.sun.target);
  VM.root = new THREE.Group(); VM.cam.add(VM.root);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = VM.mat = {
    metal: std({ color: C(0x2a2d31), roughness: 0.36, metalness: 0.85 }),
    metal2: std({ color: C(0x464a50), roughness: 0.42, metalness: 0.8 }),
    poly: std({ color: C(0x1e2023), roughness: 0.72, metalness: 0.08 }),
    tan: std({ color: C(0x7f7157), roughness: 0.7 }),
    glove: std({ color: C(0x2b2c28), roughness: 0.85 }),
    sleeve: std({ map: Tex.camoB, roughness: 0.92 }),
    brass: std({ color: C(0xc9a24a), roughness: 0.3, metalness: 0.95 }),
    blade: std({ color: C(0xc1c6cc), roughness: 0.18, metalness: 1.0 }),
    olive: std({ color: C(0x4a5038), roughness: 0.6, metalness: 0.2 }),
    lens: std({ color: C(0x1e3140), roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.3 }),
    dot: new THREE.MeshBasicMaterial({ color: new THREE.Color(10, 0.25, 0.15) }),
    glowSight: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.2, 0.6) }),
  };
  const B = (g, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const Cy = (g, rt, rb, h, mat, x, y, z, rx = Math.PI / 2, seg = 14, open = false) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  const limb = (g, a, b, w, mat) => {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, L, w * 0.92), mat);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); g.add(m); return m;
  };
  const arm = (g, hand, elbow, glove = true) => { const a = new THREE.Group(); g.add(a); if (glove) B(a, 0.052, 0.085, 0.1, M.glove, hand[0], hand[1], hand[2]); limb(a, hand, elbow, 0.075, M.sleeve); limb(a, elbow, [elbow[0] + 0.05, elbow[1] - 0.2, elbow[2] + 0.25], 0.09, M.sleeve); return a; };
  const anchor = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
  // --- rifle ---
  {
    const g = new THREE.Group();
    B(g, 0.056, 0.07, 0.32, M.metal, 0, 0, -0.1);
    B(g, 0.05, 0.035, 0.34, M.metal2, 0, 0.05, -0.1);
    for (let i = 0; i < 9; i++) B(g, 0.054, 0.008, 0.012, M.metal, 0, 0.071, -0.25 + i * 0.03);
    B(g, 0.062, 0.064, 0.25, M.poly, 0, 0.012, -0.38);
    for (let i = 0; i < 4; i++) B(g, 0.064, 0.012, 0.03, M.metal, 0, 0.012, -0.3 - i * 0.05);
    Cy(g, 0.012, 0.012, 0.3, M.metal, 0, 0.022, -0.63);
    Cy(g, 0.02, 0.018, 0.075, M.metal, 0, 0.022, -0.8, Math.PI / 2, 8);
    B(g, 0.012, 0.05, 0.014, M.metal, 0, 0.058, -0.49);
    const mag = new THREE.Group(); mag.position.set(0, -0.035, -0.16); g.add(mag);
    for (let i = 0; i < 4; i++) B(mag, 0.028, 0.056, 0.074 - i * 0.003, M.tan, 0, -0.025 - i * 0.05, -i * 0.014 - i * i * 0.004, 0.1 + i * 0.09);
    B(g, 0.034, 0.1, 0.05, M.poly, 0, -0.07, 0.0, -0.35);
    B(g, 0.008, 0.008, 0.07, M.metal, 0, -0.04, -0.06);
    B(g, 0.04, 0.05, 0.2, M.poly, 0, 0.005, 0.16); B(g, 0.046, 0.12, 0.03, M.poly, 0, -0.02, 0.27); Cy(g, 0.016, 0.016, 0.16, M.metal2, 0, 0.03, 0.12);
    B(g, 0.03, 0.022, 0.06, M.metal, 0, 0.086, -0.12);
    Cy(g, 0.021, 0.021, 0.06, M.metal, 0, 0.118, -0.12, Math.PI / 2, 18, true).material = M.metal.clone(); g.children[g.children.length - 1].material.side = THREE.DoubleSide;
    Cy(g, 0.019, 0.019, 0.002, M.lens, 0, 0.118, -0.148, Math.PI / 2, 18);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.00085, 6, 6), M.dot); dot.position.set(0, 0.118, -0.15); g.add(dot);
    arm(g, [0.0, -0.07, 0.02], [0.08, -0.16, 0.22]);
    const lh = arm(g, [-0.01, -0.03, -0.38], [-0.14, -0.14, -0.12]);
    VM.models.rifle = { g, mag, lh, muzzle: anchor(g, 0, 0.022, -0.85), eject: anchor(g, 0.03, 0.045, -0.1), hip: [0.15, -0.172, -0.39], ads: [0, -0.118, -0.14], hipR: [0, 0.035, 0] };
  }
  // --- sniper ---
  {
    const g = new THREE.Group();
    B(g, 0.05, 0.07, 0.3, M.metal, 0, 0, -0.08);
    B(g, 0.064, 0.07, 0.34, M.olive, 0, -0.01, -0.36);
    Cy(g, 0.013, 0.015, 0.46, M.metal, 0, 0.02, -0.72);
    Cy(g, 0.02, 0.02, 0.08, M.metal, 0, 0.02, -0.97, Math.PI / 2, 8);
    const mag = new THREE.Group(); mag.position.set(0, -0.035, -0.12); g.add(mag); B(mag, 0.03, 0.06, 0.08, M.poly, 0, -0.03, 0);
    B(g, 0.036, 0.1, 0.05, M.olive, 0, -0.07, 0.03, -0.35);
    B(g, 0.05, 0.06, 0.22, M.olive, 0, -0.005, 0.17); B(g, 0.054, 0.14, 0.035, M.poly, 0, -0.03, 0.29); B(g, 0.02, 0.03, 0.12, M.olive, 0, 0.05, 0.19);
    const bolt = new THREE.Group(); bolt.position.set(0.03, 0.03, -0.02); g.add(bolt);
    B(bolt, 0.06, 0.012, 0.012, M.metal2, 0.03, 0, 0); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), M.metal); knob.position.set(0.06, 0, 0); bolt.add(knob);
    Cy(g, 0.021, 0.021, 0.3, M.metal, 0, 0.1, -0.12); Cy(g, 0.03, 0.021, 0.07, M.metal, 0, 0.1, -0.3); Cy(g, 0.025, 0.021, 0.05, M.metal, 0, 0.1, 0.04);
    Cy(g, 0.026, 0.026, 0.004, M.lens, 0, 0.1, -0.336);
    B(g, 0.02, 0.03, 0.02, M.metal, 0, 0.065, -0.2); B(g, 0.02, 0.03, 0.02, M.metal, 0, 0.065, -0.03);
    B(g, 0.03, 0.03, 0.03, M.metal2, 0, 0.13, -0.13);
    arm(g, [0.0, -0.075, 0.05], [0.08, -0.17, 0.24]);
    const lh = arm(g, [-0.01, -0.04, -0.36], [-0.14, -0.15, -0.1]);
    VM.models.sniper = { g, mag, lh, bolt, muzzle: anchor(g, 0, 0.02, -1.02), eject: anchor(g, 0.03, 0.04, -0.06), hip: [0.15, -0.178, -0.42], ads: [0, -0.1, -0.2], hipR: [0, 0.03, 0] };
  }
  // --- pistol ---
  {
    const g = new THREE.Group();
    const slide = new THREE.Group(); g.add(slide);
    B(slide, 0.03, 0.034, 0.19, M.metal, 0, 0.018, -0.075);
    for (let i = 0; i < 6; i++) B(slide, 0.031, 0.026, 0.004, M.metal2, 0, 0.018, 0.0 - i * 0.008);
    B(slide, 0.008, 0.01, 0.008, M.metal, 0, 0.04, -0.162); B(slide, 0.004, 0.004, 0.004, M.glowSight, 0, 0.043, -0.158);
    B(slide, 0.008, 0.01, 0.008, M.metal, -0.009, 0.04, 0.005); B(slide, 0.008, 0.01, 0.008, M.metal, 0.009, 0.04, 0.005);
    B(slide, 0.003, 0.003, 0.003, M.glowSight, -0.009, 0.043, 0.0); B(slide, 0.003, 0.003, 0.003, M.glowSight, 0.009, 0.043, 0.0);
    B(g, 0.028, 0.022, 0.16, M.poly, 0, -0.008, -0.07);
    B(g, 0.03, 0.1, 0.048, M.poly, 0, -0.062, 0.012, -0.22);
    B(g, 0.006, 0.008, 0.045, M.poly, 0, -0.03, -0.045);
    const mag = new THREE.Group(); mag.position.set(0, -0.11, 0.02); g.add(mag); B(mag, 0.024, 0.02, 0.04, M.metal, 0, 0, 0);
    arm(g, [0.0, -0.07, 0.03], [0.07, -0.17, 0.24]);
    const lh = arm(g, [-0.024, -0.075, 0.02], [-0.12, -0.18, 0.22]);
    VM.models.pistol = { g, mag, lh, slide, muzzle: anchor(g, 0, 0.018, -0.18), eject: anchor(g, 0.018, 0.03, -0.05), hip: [0.12, -0.14, -0.36], ads: [0, -0.043, -0.24], hipR: [0, 0.04, 0] };
  }
  // --- knife ---
  {
    const g = new THREE.Group();
    const k = new THREE.Group(); g.add(k); k.rotation.set(-0.4, 0, 0.25);
    B(k, 0.022, 0.03, 0.12, M.poly, 0, 0, 0.02); B(k, 0.05, 0.01, 0.012, M.metal, 0, 0, -0.045);
    const bl = new THREE.Shape(); bl.moveTo(0, -0.012); bl.lineTo(0.17, -0.004); bl.lineTo(0.2, 0.012); bl.lineTo(0, 0.016); bl.lineTo(0, -0.012);
    const bg = new THREE.ExtrudeGeometry(bl, { depth: 0.004, bevelEnabled: false }); bg.rotateY(Math.PI / 2); bg.translate(-0.002, 0, -0.05);
    const blade = new THREE.Mesh(bg, M.blade); k.add(blade);
    arm(g, [0.0, -0.01, 0.06], [0.07, -0.13, 0.28]);
    VM.models.knife = { g, k, hip: [0.15, -0.17, -0.3], ads: [0.15, -0.17, -0.3], hipR: [0, 0.2, 0] };
  }
  // --- grenade ---
  {
    const g = new THREE.Group();
    const n = new THREE.Group(); g.add(n);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.036, 1), M.olive); n.add(body);
    B(n, 0.012, 0.05, 0.014, M.metal2, 0.018, 0.02, 0, 0, 0, -0.3);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 6, 12), M.metal2); ring.position.set(-0.02, 0.035, 0); ring.rotation.y = 1.2; n.add(ring);
    arm(g, [0.02, -0.035, 0.03], [0.09, -0.15, 0.26]);
    VM.models.nade = { g, n, ring, hip: [0.13, -0.16, -0.3], ads: [0.13, -0.16, -0.3], hipR: [0, 0.1, 0] };
  }
  for (const k in VM.models) {
    const m = VM.models[k]; m.g.visible = false; VM.root.add(m.g);
    m.g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    if (m.mag) m.magBase = m.mag.position.clone();
    if (m.lh) m.lhBase = m.lh.position.clone();
  }
  VM.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.flash, color: new THREE.Color(3, 2.1, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  VM.flash.visible = false;
  const sg = new THREE.CylinderGeometry(0.0055, 0.0055, 0.024, 6);
  for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(sg, M.brass); s.visible = false; VM.cam.add(s); VM.shells.push({ m: s, t: 0, v: V3() }); }
}
function vmShow(id) {
  for (const k in VM.models) VM.models[k].g.visible = k === id;
  VM.cur = VM.models[id];
  if (VM.cur.muzzle) VM.cur.muzzle.add(VM.flash);
}
function vmEject() {
  const m = VM.cur; if (!m || !m.eject) return;
  const s = VM.shells.find((q) => !q.m.visible) || VM.shells[0];
  const p = m.eject.getWorldPosition(V3()); VM.cam.worldToLocal(p);
  s.m.position.copy(p); s.m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); s.v.set(rand(0.8, 1.3), rand(0.9, 1.4), rand(0.1, 0.4)); s.t = 0.55; s.m.visible = true;
}
