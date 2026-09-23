/* ============================ SOLDIERS ============================ */
const CM = {};
function makeCharMats() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  CM.blue = { camo: std({ map: Tex.camoB, roughness: 0.92 }), vest: std({ color: C(0x2b333d), roughness: 0.85 }), helmet: std({ color: C(0x3a4656), roughness: 0.7 }), band: std({ color: C(0x3d97f5), roughness: 0.5, emissive: C(0x0d3264) }) };
  CM.red = { camo: std({ map: Tex.camoR, roughness: 0.92 }), vest: std({ color: C(0x5a533e), roughness: 0.85 }), helmet: std({ color: C(0x6b5f45), roughness: 0.7 }), band: std({ color: C(0xf04a3a), roughness: 0.5, emissive: C(0x64120c) }) };
  CM.skin = std({ color: C(0xb88a6a), roughness: 0.62 });
  CM.black = std({ color: C(0x1f2023), roughness: 0.82 });
  CM.gun = std({ color: C(0x26282b), roughness: 0.45, metalness: 0.7 });
  CM.tan = std({ color: C(0x7a6c52), roughness: 0.7 });
  CM.goggle = std({ color: C(0x0e1012), roughness: 0.08, metalness: 0.9 });
  CM.box = new THREE.BoxGeometry(1, 1, 1);
}
function mkBox(parent, w, h, d, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(CM.box, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = false; parent.add(m); return m;
}
const _ik = { S: new THREE.Vector3(), T: new THREE.Vector3(), E: new THREE.Vector3(), d: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Quaternion(), dn: new THREE.Vector3(0, -1, 0) };
class Soldier {
  constructor(team, name, ally) {
    const T = CM[team];
    this.root = new THREE.Group();
    const hips = this.hips = new THREE.Group(); hips.position.y = 0.98; this.root.add(hips);
    mkBox(hips, 0.34, 0.2, 0.22, T.camo, 0, -0.02, 0);
    mkBox(hips, 0.36, 0.06, 0.24, CM.black, 0, 0.06, 0, false);
    this.legs = [];
    for (const s of [-1, 1]) {
      const th = new THREE.Group(); th.position.set(0.1 * s, -0.05, 0); hips.add(th);
      mkBox(th, 0.16, 0.46, 0.18, T.camo, 0, -0.22, 0);
      const kn = new THREE.Group(); kn.position.y = -0.44; th.add(kn);
      mkBox(kn, 0.14, 0.44, 0.15, T.camo, 0, -0.2, 0);
      mkBox(kn, 0.15, 0.11, 0.28, CM.black, 0, -0.43, -0.045);
      this.legs.push({ th, kn });
    }
    const spine = this.spine = new THREE.Group(); spine.position.y = 0.04; hips.add(spine);
    mkBox(spine, 0.4, 0.52, 0.24, T.camo, 0, 0.27, 0);
    mkBox(spine, 0.44, 0.38, 0.3, T.vest, 0, 0.3, 0);
    mkBox(spine, 0.36, 0.12, 0.07, T.vest, 0, 0.19, -0.17, false);
    mkBox(spine, 0.18, 0.22, 0.09, CM.black, -0.07, 0.36, 0.18, false);
    const neck = this.neck = new THREE.Group(); neck.position.y = 0.56; spine.add(neck);
    const head = this.head = new THREE.Group(); head.position.y = 0.02; neck.add(head);
    mkBox(head, 0.2, 0.25, 0.22, CM.black, 0, 0.1, 0);
    mkBox(head, 0.17, 0.06, 0.02, CM.skin, 0, 0.1, -0.108, false);
    mkBox(head, 0.2, 0.05, 0.03, CM.goggle, 0, 0.16, -0.112, false);
    mkBox(head, 0.26, 0.14, 0.28, T.helmet, 0, 0.22, 0.01);
    mkBox(head, 0.2, 0.05, 0.22, T.helmet, 0, 0.31, 0.01, false);
    this.arms = [];
    for (const s of [-1, 1]) {
      const up = new THREE.Group(), fo = new THREE.Group(); spine.add(up); spine.add(fo);
      mkBox(up, 0.12, 0.29, 0.12, T.camo, 0, -0.145, 0);
      mkBox(up, 0.126, 0.06, 0.126, T.band, 0, -0.08, 0, false);
      mkBox(fo, 0.1, 0.27, 0.1, T.camo, 0, -0.135, 0);
      mkBox(fo, 0.09, 0.1, 0.1, CM.black, 0, -0.3, 0, false);
      this.arms.push({ up, fo, s, sh: new THREE.Vector3(0.23 * s, 0.48, 0) });
    }
    const gun = this.gun = new THREE.Group(); spine.add(gun);
    gun.position.set(0.1, 0.33, -0.3); this.gunBase = gun.position.clone();
    mkBox(gun, 0.05, 0.08, 0.46, CM.gun, 0, 0, -0.08);
    mkBox(gun, 0.03, 0.03, 0.22, CM.gun, 0, 0.01, -0.42, false);
    mkBox(gun, 0.03, 0.11, 0.06, CM.tan, 0, -0.08, -0.08, false);
    mkBox(gun, 0.04, 0.07, 0.2, CM.gun, 0, -0.02, 0.24, false);
    this.scope = mkBox(gun, 0.05, 0.05, 0.22, CM.gun, 0, 0.07, -0.05, false); this.scope.visible = false;
    this.muzzle = new THREE.Object3D(); this.muzzle.position.set(0, 0.01, -0.56); gun.add(this.muzzle);
    this.gripR = new THREE.Vector3(0.0, -0.06, 0.06); this.gripL = new THREE.Vector3(-0.02, -0.03, -0.26);
    if (ally && name) {
      const c = makeCanvas(256, 64), g = c.getContext('2d'); g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(name, 128, 34); g.fillStyle = '#8cc8ff'; g.fillText(name, 128, 34);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: toTex(c, { srgb: true, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping }), depthTest: false, transparent: true }));
      sp.scale.set(1.2, 0.3, 1); sp.position.y = 2.2; sp.renderOrder = 10; this.root.add(sp); this.tag = sp;
    }
    this.ph = 0; this.kick = 0; this.deathT = 0; this.deathDir = 1; this.reloadK = 0;
    this.root.traverse((o) => { if (o.isMesh) o.matrixAutoUpdate = true; });
  }
  setSniper(on) { this.scope.visible = on; }
  reset() { this.root.rotation.set(0, 0, 0); this.root.position.y = 0; this.root.visible = true; this.deathT = 0; if (this.tag) this.tag.visible = true; }
  die(dir, yaw) {
    this.deathT = 0.0001;
    const f = V3(-Math.sin(yaw), 0, -Math.cos(yaw));
    this.deathDir = dir && (dir.x * f.x + dir.z * f.z) > 0 ? -1 : 1;
    this.deathSide = rand(-0.35, 0.35);
    if (this.tag) this.tag.visible = false;
  }
  muzzleWorld(out) { return this.muzzle.getWorldPosition(out); }
  update(dt, c, vis) {
    const R = this.root;
    R.position.x = c.pos.x; R.position.z = c.pos.z;
    if (!c.alive) {
      this.deathT += dt;
      const k = clamp(this.deathT / 0.6, 0, 1), e = k * k;
      R.rotation.set(this.deathDir * (Math.PI / 2 - 0.08) * e, c.yaw, this.deathSide * e, 'YXZ');
      R.position.y = c.pos.y + 0.14 * e - (this.deathT > 4 ? (this.deathT - 4) * 0.35 : 0);
      for (const l of this.legs) { l.th.rotation.x *= 0.9; l.kn.rotation.x *= 0.9; }
      this.hips.position.y = lerp(this.hips.position.y, 0.98, 0.1);
      this.spine.rotation.x *= 0.9;
      if (this.deathT > 6) R.visible = false;
      return;
    }
    R.visible = true; R.position.y = c.pos.y; R.rotation.set(0, c.yaw, 0);
    if (!vis) return;
    const sp = Math.hypot(c.vel.x, c.vel.z);
    const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
    const fw = sp > 0.1 ? (-sy * c.vel.x - cy * c.vel.z) / sp : 0, la = sp > 0.1 ? (cy * c.vel.x - sy * c.vel.z) / sp : 0;
    this.ph += dt * sp * 2.3 * (fw < -0.2 ? -1 : 1);
    const amp = clamp(sp / 5, 0, 1) * (c.onGround ? 0.62 : 0.2), k = c.crouchK;
    for (let i = 0; i < 2; i++) {
      const l = this.legs[i], ph = this.ph + (i ? Math.PI : 0), sw = Math.sin(ph);
      l.th.rotation.x = sw * amp * (Math.abs(fw) + 0.35) + k * 1.2 + (c.onGround ? 0 : 0.35);
      l.th.rotation.z = sw * amp * la * 0.45 * (i ? 1 : -1);
      l.kn.rotation.x = -Math.max(0, -Math.cos(ph)) * amp * 1.4 - k * 2.0 - (c.onGround ? 0 : 0.5);
    }
    this.hips.position.y = lerp(0.98, 0.58, k) - Math.abs(Math.sin(this.ph)) * 0.035 * amp;
    const pitch = c.pitch;
    this.spine.rotation.x = pitch * 0.5 - k * 0.3;
    this.spine.rotation.y = 0;
    this.head.rotation.x = pitch * 0.35 + k * 0.2;
    this.kick = Math.max(0, this.kick - dt * 10);
    this.reloadK = lerp(this.reloadK, c.reloadT > 0 ? 1 : 0, Math.min(1, dt * 8));
    const G = this.gun;
    G.position.set(this.gunBase.x, this.gunBase.y - this.reloadK * 0.08, this.gunBase.z + this.kick * 0.05);
    G.rotation.set(pitch * 0.5 + k * 0.3 + this.kick * 0.08 - this.reloadK * 0.5, 0, this.reloadK * 0.6);
    // IK arms
    for (const a of this.arms) {
      _ik.T.copy(a.s > 0 ? this.gripR : this.gripL).applyQuaternion(G.quaternion).add(G.position);
      if (a.s < 0 && this.reloadK > 0.3) _ik.T.set(-0.05, 0.12 + Math.sin(performance.now() / 120) * 0.03, -0.18);
      _ik.S.copy(a.sh);
      const la1 = 0.29, lb = 0.3;
      _ik.d.subVectors(_ik.T, _ik.S); let d = _ik.d.length(); const dd = clamp(d, 0.08, la1 + lb - 0.005); _ik.d.divideScalar(d || 1);
      const cosA = clamp((la1 * la1 + dd * dd - lb * lb) / (2 * la1 * dd), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
      _ik.p.set(a.s * 0.55, -1, 0.35); _ik.p.addScaledVector(_ik.d, -_ik.p.dot(_ik.d)).normalize();
      _ik.E.copy(_ik.S).addScaledVector(_ik.d, la1 * cosA).addScaledVector(_ik.p, la1 * sinA);
      a.up.position.copy(_ik.S); _ik.q.setFromUnitVectors(_ik.dn, _ik.p.subVectors(_ik.E, _ik.S).normalize()); a.up.quaternion.copy(_ik.q);
      a.fo.position.copy(_ik.E); _ik.q.setFromUnitVectors(_ik.dn, _ik.p.subVectors(_ik.T, _ik.E).normalize()); a.fo.quaternion.copy(_ik.q);
    }
  }
}

/* ============================ COMBATANTS ============================ */
let COMBATANT_ID = 0;
class Combatant {
  constructor(team, name, isPlayer) {
    this.id = COMBATANT_ID++; this.team = team; this.name = name; this.isPlayer = !!isPlayer;
    this.pos = V3(); this.vel = V3(); this.r = 0.3; this.h = 1.8; this.eye = 1.64;
    this.onGround = false; this.stepOff = 0; this.stepGrace = 0; this.jumped = false; this.blocked = false;
    this.yaw = 0; this.pitch = 0; this.crouching = false; this.crouchK = 0;
    this.alive = false; this.hp = 100; this.kills = 0; this.deaths = 0; this.hs = 0; this.assists = 0; this.score = 0;
    this.shots = 0; this.hits = 0; this.dmgBy = new Map(); this.spawnProt = 0; this.respawnAt = 0; this.lastFire = -10; this.spottedT = -10;
    this.reloadT = 0; this.stepDist = 0; this.nemesis = null; this.lastHurtT = -10;
  }
  eyePos(out) { return out.set(this.pos.x, this.pos.y + this.eye, this.pos.z); }
  chest(out) { return out.set(this.pos.x, this.pos.y + lerp(1.25, 0.9, this.crouchK), this.pos.z); }
  head(out) { const h = charHitboxes(this); return out.set(h.hx, h.hy, h.hz); }
  surfaceUnder() {
    const h = raycast(V3(this.pos.x, this.pos.y + 0.3, this.pos.z), V3(0, -1, 0), 0.6, 'move');
    return h ? h.box.mat : 'concrete';
  }
}

/* ============================ BOT AI ============================ */
const DIFF = {
  easy: { react: [0.55, 0.95], err: 8.5, settle: 0.65, turn: 230, head: 0.06, burst: [2, 4], spot: 0.55, pause: [0.5, 0.9], strafe: 0.35, nade: 0.1 },
  normal: { react: [0.34, 0.56], err: 6.0, settle: 0.45, turn: 330, head: 0.16, burst: [3, 6], spot: 0.9, pause: [0.35, 0.65], strafe: 0.6, nade: 0.2 },
  hard: { react: [0.22, 0.36], err: 4.2, settle: 0.32, turn: 460, head: 0.3, burst: [4, 8], spot: 1.3, pause: [0.22, 0.45], strafe: 0.8, nade: 0.3 },
  elite: { react: [0.15, 0.25], err: 2.8, settle: 0.22, turn: 620, head: 0.42, burst: [5, 10], spot: 1.8, pause: [0.15, 0.3], strafe: 0.9, nade: 0.4 },
};
const BOT_NAMES = ['猎鹰', '灰狼', '铁锚', '海鸥', '雷霆', '北风', '磐石', '暗礁', '渡鸦', '山猫', '旋风', '蝰蛇', '黑曜', '赤狐', '霜刃', '游隼', '夜枭', '钢索', '潮汐', '断崖'];
const _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3(), _t3 = new THREE.Vector3(), _t4 = new THREE.Vector3(), _t5 = new THREE.Vector3(), _t6 = new THREE.Vector3();
function navWalkable(x, y, z) {
  const ix = Math.floor((x - NAV.x0) / NAV.cs), iz = Math.floor((z - NAV.z0) / NAV.cs);
  if (ix < 0 || iz < 0 || ix >= NAV.nx || iz >= NAV.nz) return false;
  const c = iz * NAV.nx + ix;
  for (let l = 0; l < NAV.L; l++) { const v = NAV.h[c * NAV.L + l]; if (v === v && Math.abs(v - y) < 0.6) return true; }
  return false;
}
class Bot extends Combatant {
  constructor(team, name, role, ally) {
    super(team, name, false);
    this.role = role;
    this.wpn = role === 'sniper' ? WPN.sniper : WPN.rifle;
    this.model = new Soldier(team, name, ally); this.model.setSniper(role === 'sniper');
    scene.add(this.model.root);
    this.mem = new Map();
    this.spawnReset();
  }
  spawnReset() {
    this.mag = this.wpn.mag; this.res = this.wpn.reserve; this.reloadT = 0; this.boltT = 0; this.nades = 1; this.nadeT = 0;
    this.path = null; this.pi = 0; this.goal = null; this.holdT = 0; this.target = null; this.mode = 'roam'; this.alertPos = null; this.alertT = -10;
    this.mem.clear(); this.thinkT = Math.random() * 0.15; this.repathAt = 0; this.stuck = 0; this.progT = 0; this.lastProg = this.pos.clone();
    this.burst = 3; this.nextShot = 0; this.strafeT = 0; this.strafeDir = 1; this.stopShoot = false; this.crouchPref = false; this.bloom = 0;
    this.errY = 0; this.errP = 0; this.aimPart = 'chest'; this.reactAt = 0; this.lookYaw = null; this.glanceT = rand(2, 5); this.pathDest = null;
    this.wantCrouch = false; this.wishX = 0; this.wishZ = 0; this.speed = 0;
    if (this.model) this.model.reset();
  }
  memOf(e) { let m = this.mem.get(e); if (!m) { m = { spot: 0, vis: false, lastT: -99, lp: V3() }; this.mem.set(e, m); } return m; }
  acquire(e, now, D) {
    this.target = e; this.reactAt = now + rand(D.react[0], D.react[1]) + (this.role === 'sniper' ? 0.2 : 0);
    const rel = _t1.set(e.vel.x, 0, e.vel.z), lat = rel.length();
    const E = D.err * DEG * (0.7 + Math.random() * 0.6) * (1 + lat * 0.07);
    this.errY = (Math.random() < 0.5 ? -1 : 1) * E; this.errP = (Math.random() - 0.35) * E * 0.7;
    this.aimPart = Math.random() < D.head ? 'head' : 'chest';
    this.burst = randInt(D.burst[0], D.burst[1]);
  }
  hearIntel(e, now) {
    const m = this.memOf(e); m.lastT = Math.max(m.lastT, now - 0.5); m.lp.copy(e.pos);
    if (!this.target && (this.mode === 'roam' || this.mode === 'hold')) { this.alertPos = e.pos.clone(); this.alertT = now; this.mode = 'alert'; }
  }
  onHurt(att) {
    if (!att || att === this || !this.alive) return;
    const now = Game.time, m = this.memOf(att);
    m.lastT = now; m.lp.copy(att.pos); m.spot = Math.max(m.spot, 0.75);
    if (!this.target || !this.memOf(this.target).vis) { this.alertPos = att.pos.clone(); this.alertT = now; if (this.mode !== 'engage') this.mode = 'alert'; this.lookYaw = Math.atan2(-(att.pos.x - this.pos.x), -(att.pos.z - this.pos.z)); }
    this.errY += (Math.random() - 0.5) * 3 * DEG; this.errP += (Math.random() - 0.5) * 2 * DEG;
  }
  think(now, D) {
    const eye = this.eyePos(_t1), fwd = dirFromYawPitch(this.yaw, this.pitch, _t2);
    let best = null, bestD = 1e9;
    for (const e of Game.all) {
      if (e.team === this.team) continue;
      const m = this.memOf(e);
      if (!e.alive) { m.spot = 0; m.vis = false; continue; }
      e.head(_t3);
      let dx = _t3.x - eye.x, dy = _t3.y - eye.y, dz = _t3.z - eye.z; const d = Math.hypot(dx, dy, dz);
      let vis = false, cosA = 0;
      if (d < 130) {
        cosA = (fwd.x * dx + fwd.y * dy + fwd.z * dz) / d;
        const fov = this.target === e ? 0.0 : 0.47;
        if (cosA > fov || d < 3 || (now - e.lastFire < 0.3 && d < 30)) {
          if (losClear(eye, _t3)) vis = true;
          else { e.chest(_t3); if (losClear(eye, _t3)) vis = true; }
        }
      }
      if (vis) {
        const rate = D.spot * (d < 10 ? 6 : d < 25 ? 2.6 : d < 50 ? 1.3 : 0.65) * (now - e.lastFire < 0.6 ? 2.2 : 1) * (e.vel.x * e.vel.x + e.vel.z * e.vel.z > 4 ? 1.3 : 0.75) * (e.crouchK > 0.5 ? 0.8 : 1) * (cosA > 0.96 ? 1.6 : 1);
        m.spot = Math.min(1.6, m.spot + rate * 0.13); m.vis = true; m.lastT = now; m.lp.copy(e.pos);
        if (m.spot >= 1) { e.spottedT = now; if (d < bestD) { bestD = d; best = e; } }
      } else { m.vis = false; m.spot = Math.max(0, m.spot - 0.05); }
    }
    if (best) {
      if (this.target !== best) {
        const cm = this.target ? this.memOf(this.target) : null;
        if (!this.target || !this.target.alive || !cm.vis || bestD < this.pos.distanceTo(this.target.pos) - 5) this.acquire(best, now, D);
      }
      this.mode = 'engage';
      if (!this._callT || now - this._callT > 1.2) {
        this._callT = now;
        for (const a of Game.all) if (a !== this && a.team === this.team && !a.isPlayer && a.alive && a.pos.distanceToSquared(this.pos) < 1225) a.hearIntel(best, now);
      }
    } else if (this.target) {
      const m = this.memOf(this.target);
      if (!this.target.alive || now - m.lastT > 6) { this.target = null; this.mode = 'roam'; this.path = null; }
      else this.mode = 'hunt';
    }
    if (this.mode !== 'engage') {
      for (const s of Game.sounds) {
        if (now - s.t > 0.35 || s.team === this.team) continue;
        const d = this.pos.distanceTo(s.pos); if (d > s.r) continue;
        if (this.mode === 'hunt' && d > 18) continue;
        this.alertPos = s.pos.clone().add(V3(rand(-2.5, 2.5), 0, rand(-2.5, 2.5))); this.alertT = now;
        if (this.mode !== 'hunt') this.mode = 'alert';
        if (d < 20) this.lookYaw = Math.atan2(-(s.pos.x - this.pos.x), -(s.pos.z - this.pos.z));
      }
    }
    // grenade
    if (this.mode === 'hunt' && this.nades > 0 && now > this.nadeT && this.target) {
      const m = this.memOf(this.target), d = this.pos.distanceTo(m.lp), age = now - m.lastT;
      if (d > 8 && d < 27 && age > 0.8 && age < 4 && Math.random() < D.nade * 0.25) this.throwGrenade(m.lp, now);
      this.nadeT = now + 1.5;
    }
    // destinations
    let dest = null;
    if (this.mode === 'hunt') dest = this.memOf(this.target).lp;
    else if (this.mode === 'alert') {
      dest = this.alertPos;
      if (now - this.alertT > 9 || (dest && this.pos.distanceTo(dest) < 1.5)) { this.mode = 'roam'; dest = null; this.holdT = rand(1, 3); this.goal = null; }
    }
    if (this.mode === 'roam') {
      if (this.holdT > 0) dest = null;
      else {
        if (!this.goal || this.pos.distanceTo(this.goal) < 1.2) {
          if (this.goal) { this.holdT = this.role === 'sniper' ? rand(8, 16) : rand(1.5, 5); this.goal = null; this.path = null; this.lookYaw = this.threatYaw(); }
          else this.goal = this.pickGoal();
        }
        dest = this.goal;
      }
    }
    if (this.mode !== 'engage' && dest) {
      if (!this.path || !this.pathDest || this.pathDest.distanceTo(dest) > 2.5 || now > this.repathAt) {
        this.path = findPath(this.pos.x, this.pos.y, this.pos.z, dest.x, dest.y, dest.z); this.pi = 1;
        this.pathDest = V3(dest.x, dest.y, dest.z); this.repathAt = now + 5;
        if (!this.path) { if (this.mode === 'roam') this.goal = null; else { this.mode = 'roam'; this.goal = null; } }
      }
    }
  }
  threatYaw() {
    const ex = this.team === 'blue' ? 40 : -40;
    return Math.atan2(-(ex - this.pos.x), -(rand(-20, 20) - this.pos.z)) + rand(-0.6, 0.6);
  }
  pickGoal() {
    const my = navNode(this.pos.x, this.pos.y, this.pos.z); if (my < 0) return null;
    const comp = NAV.comp[my], side = this.team === 'blue' ? 1 : -1;
    let tot = 0; const W = [];
    for (const h of MAP.hotspots) {
      if (h.node < 0 || NAV.comp[h.node] !== comp) { W.push(0); continue; }
      const d = Math.hypot(h.x - this.pos.x, h.z - this.pos.z);
      let w = 1;
      const t = (h.x * side + 50) / 100; w *= 0.35 + t * 1.3;
      if (d < 8) w *= 0.1; else if (d > 70) w *= 0.6;
      if (this.role === 'sniper') w *= h.tags.includes('long') ? 4 : 0.25;
      let taken = 0; for (const a of Game.all) if (a !== this && a.team === this.team && a.goal && Math.hypot(a.goal.x - h.x, a.goal.z - h.z) < 3) taken++;
      w *= taken ? 0.25 : 1;
      W.push(w); tot += w;
    }
    let r = Math.random() * tot;
    for (let i = 0; i < W.length; i++) { r -= W[i]; if (r <= 0 && W[i] > 0) { const h = MAP.hotspots[i]; return V3(h.x + rand(-0.8, 0.8), h.y, h.z + rand(-0.8, 0.8)); } }
    return null;
  }
  throwGrenade(tp, now) {
    const eye = this.eyePos(V3()), dx = tp.x - eye.x, dz = tp.z - eye.z, dh = Math.hypot(dx, dz), dy = tp.y - eye.y + 0.2, th = 40 * DEG, g = 19;
    const den = 2 * Math.cos(th) ** 2 * (dh * Math.tan(th) - dy); if (den <= 0) return;
    const v = Math.sqrt(g * dh * dh / den) * rand(0.95, 1.06); if (!(v < 24)) return;
    const vel = V3(dx / dh * v * Math.cos(th), v * Math.sin(th), dz / dh * v * Math.cos(th));
    this.yaw = Math.atan2(-dx, -dz);
    throwNade(this, eye.addScaledVector(vel.clone().normalize(), 0.5), vel);
    this.nades--; Snd.pin && Game.player && this.pos.distanceTo(Game.player.pos) < 15 && Snd.click(3500, 0.25, 0.03, 0, this.pos);
  }
  startReload() { if (this.res <= 0 && this.mag <= 0) this.res = this.wpn.mag * 2; if (this.reloadT > 0 || this.res <= 0 || this.mag >= this.wpn.mag) return; this.reloadT = this.wpn.reload; if (Game.player && this.pos.distanceTo(Game.player.pos) < 12) Snd.click(1600, 0.25, 0.05, 0.3, this.pos); }
  update(dt, now) {
    const D = DIFF[Settings.difficulty] || DIFF.normal;
    const camD = this.pos.distanceTo(camera.position);
    if (!this.alive) { this.model.update(dt, this, true); return; }
    this.spawnProt = Math.max(0, this.spawnProt - dt);
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = 0.1 + Math.random() * 0.06; this.think(now, D); }
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) { const t = Math.min(this.wpn.mag - this.mag, this.res); this.mag += t; this.res -= t; } }
    if (this.boltT > 0) this.boltT -= dt;
    this.bloom = Math.max(0, this.bloom - this.wpn.bloomRec * dt);
    if (this.mode !== 'engage' && this.mag < this.wpn.mag * 0.5 && this.reloadT <= 0) this.startReload();
    if (this.holdT > 0) this.holdT -= dt;
    this.updateAim(dt, now, D);
    this.updateFire(now, D);
    this.updateMove(dt, now, D);
    if (Game.freeze > 0) { this.vel.x = 0; this.vel.z = 0; }
    const land = moveCharacter(this, dt);
    if (this.pos.y < SEA_Y - 0.6) { FX.splash(this.pos.x, SEA_Y, this.pos.z, 2); applyDamage(this, 999, null, { weapon: 'water' }); return; }
    if (land > 13) applyDamage(this, (land - 13) * 8, null, { weapon: 'fall' });
    // crouch
    if (this.wantCrouch) this.crouching = true; else if (this.crouching && canStand(this)) this.crouching = false;
    this.h = this.crouching ? 1.3 : 1.8;
    this.crouchK += ((this.crouching ? 1 : 0) - this.crouchK) * Math.min(1, dt * 9); this.eye = lerp(1.64, 1.2, this.crouchK);
    // footsteps
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 3.3) {
      this.stepDist += hs * dt;
      if (this.stepDist > 2.3) {
        this.stepDist = 0; Game.noise(this.pos, 15, this, 'step');
        if (camD < 32) Snd.step(V3(this.pos.x, this.pos.y + 0.1, this.pos.z), this.surfaceUnder(), 0.9);
      }
    }
    this.model.update(dt, this, camD < 90);
  }
  updateAim(dt, now, D) {
    let ty = this.yaw, tp = 0, fast = false;
    if (this.target && this.mode === 'engage') {
      const e = this.target, eye = this.eyePos(_t1), ap = this.aimPart === 'head' ? e.head(_t2) : e.chest(_t2);
      ap.addScaledVector(e.vel, 0.05);
      const dx = ap.x - eye.x, dy = ap.y - eye.y, dz = ap.z - eye.z, hd = Math.hypot(dx, dz);
      const dec = Math.exp(-dt / D.settle); this.errY *= dec; this.errP *= dec;
      ty = Math.atan2(-dx, -dz) + this.errY; tp = Math.atan2(dy, hd) + this.errP; fast = true;
    } else if (this.mode === 'hunt' && this.target) {
      const lp = this.memOf(this.target).lp, eye = this.eyePos(_t1);
      ty = Math.atan2(-(lp.x - eye.x), -(lp.z - eye.z)); tp = Math.atan2(lp.y + 1.4 - eye.y, Math.hypot(lp.x - eye.x, lp.z - eye.z));
    } else if (this.lookYaw !== null && (this.holdT > 0 || Math.hypot(this.vel.x, this.vel.z) < 0.5 || this.mode === 'alert')) {
      ty = this.lookYaw; tp = 0;
      this.glanceT -= dt; if (this.glanceT <= 0) { this.glanceT = rand(1.5, 4); this.lookYaw += rand(-0.9, 0.9); }
      if (this.mode === 'alert' && this.path && Math.hypot(this.vel.x, this.vel.z) > 1) this.lookYaw = null;
    } else {
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 0.8) ty = Math.atan2(-this.vel.x, -this.vel.z);
      this.glanceT -= dt; if (this.glanceT <= 0) { this.glanceT = rand(2, 5); this.glanceOff = rand(-0.8, 0.8); this.glanceDur = 0.9; }
      if (this.glanceDur > 0) { this.glanceDur -= dt; ty += this.glanceOff; }
    }
    const turn = D.turn * DEG * dt * (fast ? 1 : 0.7);
    const dyaw = wrapAngle(ty - this.yaw);
    this.yaw = wrapAngle(this.yaw + clamp(dyaw * Math.min(1, dt * 11), -turn, turn));
    this.pitch += clamp((tp - this.pitch) * Math.min(1, dt * 11), -turn, turn);
  }
  updateFire(now, D) {
    const e = this.target;
    if (this.mode !== 'engage' || !e || !e.alive || now < this.reactAt || this.reloadT > 0 || this.boltT > 0 || now < this.nextShot || Game.freeze > 0) return;
    if (this.mag <= 0) { this.startReload(); return; }
    if (!this.memOf(e).vis) return;
    const eye = this.eyePos(_t4), ap = this.aimPart === 'head' ? e.head(_t5) : e.chest(_t5);
    const want = ap.sub(eye), dist = want.length(); want.divideScalar(dist);
    const fwd = dirFromYawPitch(this.yaw, this.pitch, _t6);
    const ang = Math.acos(clamp(fwd.dot(want), -1, 1));
    const tol = Math.atan2(this.aimPart === 'head' ? 0.2 : 0.38, dist) + (dist < 8 ? 3 : 1.0) * DEG;
    if (ang > tol) return;
    this.shoot(fwd, dist, now, D);
  }
  shoot(fwd, dist, now, D) {
    const W = this.wpn; this.mag--; this.lastFire = now;
    const mv = Math.hypot(this.vel.x, this.vel.z);
    let sp = this.role === 'sniper' ? W.spread + mv / 5 * W.sMove : W.spread + this.bloom + mv / 5 * W.sMove * 0.8;
    if (!this.onGround) sp += W.sAir; if (this.crouchK > 0.5) sp *= W.sCrouch;
    this.bloom = Math.min(W.bloomMax, this.bloom + W.bloom);
    const d = spreadDir(fwd, sp, V3()), eye = this.eyePos(V3());
    const res = fireBullet(this, eye, d, W);
    const camD = this.pos.distanceTo(camera.position);
    const mz = camD < 90 ? this.model.muzzleWorld(V3()) : eye;
    if (Math.random() < (W.id === 'sniper' ? 1 : 0.55)) FX.tracer(mz.x, mz.y, mz.z, res.end.x, res.end.y, res.end.z, 400, 5, 0.03);
    if (camD < 120) { FX.flash(mz, W.id === 'sniper' ? 0.8 : 0.5); if (camD < 30) { FX.bLight.position.copy(mz); FX.bLightT = 0.05; } }
    Snd.shot(W.snd, eye, false);
    Game.noise(eye, W.snd === 'sniper' ? 95 : 65, this, 'shot');
    checkWhiz(this, eye, res.end);
    this.model.kick = 1;
    this.errP += W.rUp * DEG * (0.5 + Math.random() * 0.5) * (this.role === 'sniper' ? 1 : 0.55);
    this.errY += (Math.random() - 0.5) * W.rSide * DEG * 1.6;
    if (W.id === 'sniper') { this.boltT = W.bolt; this.nextShot = now + W.bolt + rand(0.2, 0.6); }
    else {
      this.burst--;
      if (this.burst <= 0) { this.burst = dist > 35 ? randInt(1, 3) : randInt(D.burst[0], D.burst[1]); this.nextShot = now + rand(D.pause[0], D.pause[1]) * (dist > 35 ? 1.5 : 1); }
      else this.nextShot = now + 60 / W.rpm;
    }
  }
  updateMove(dt, now, D) {
    let wx = 0, wz = 0, speed = 0; this.wantCrouch = false;
    if (this.mode === 'engage' && this.target) {
      const e = this.target, dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, dist = Math.hypot(dx, dz) || 1;
      if (this.role === 'sniper') { speed = 0; this.wantCrouch = dist > 18 && this.crouchPref; if (this.strafeT <= 0) { this.strafeT = 3; this.crouchPref = Math.random() < 0.5; } this.strafeT -= dt; }
      else {
        this.strafeT -= dt;
        if (this.strafeT <= 0) { this.strafeT = rand(0.35, 1.0); this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.stopShoot = Math.random() < D.strafe * 0.75; this.crouchPref = dist > 24 && Math.random() < 0.35; }
        const px = -dz / dist, pz = dx / dist;
        const firingSoon = now >= this.reactAt - 0.05 && now + 0.1 >= this.nextShot;
        if (this.crouchPref) { this.wantCrouch = true; speed = 0; }
        else if (firingSoon && this.stopShoot && this.memOf(e).vis) speed = 0;
        else {
          wx = px * this.strafeDir; wz = pz * this.strafeDir; speed = dist < 10 ? 4.4 : 3.4;
          if (dist > 45) { wx += dx / dist * 0.9; wz += dz / dist * 0.9; }
          if (dist < 4) { wx -= dx / dist * 0.7; wz -= dz / dist * 0.7; }
          const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l;
          if (!navWalkable(this.pos.x + wx * 0.7, this.pos.y, this.pos.z + wz * 0.7)) { wx = -wx; wz = -wz; this.strafeDir *= -1; if (!navWalkable(this.pos.x + wx * 0.7, this.pos.y, this.pos.z + wz * 0.7)) speed = 0; }
        }
      }
      this.path = null;
    } else if (this.path) {
      let p = this.path[this.pi];
      while (p) {
        const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d2 = dx * dx + dz * dz;
        if (d2 < 0.16 || (this.pi < this.path.length - 1 && d2 < 0.8 && Math.abs(p.y - this.pos.y) < 0.6)) { this.pi++; p = this.path[this.pi]; } else break;
      }
      if (!p) { this.path = null; }
      else {
        const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
        wx = dx / d; wz = dz / d;
        speed = this.mode === 'hunt' ? 3.2 : this.role === 'sniper' ? 4.5 : 5.0;
        if (this.mode === 'hunt' && this.pos.distanceTo(this.memOf(this.target).lp) < 2) { this.path = null; speed = 0; }
      }
    }
    // separation from teammates
    for (const a of Game.all) {
      if (a === this || !a.alive || a.team !== this.team) continue;
      const dx = this.pos.x - a.pos.x, dz = this.pos.z - a.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < 1.2 && d2 > 1e-4 && Math.abs(a.pos.y - this.pos.y) < 1.5) { const d = Math.sqrt(d2); wx += dx / d * 0.6; wz += dz / d * 0.6; if (speed < 1.5) speed = 1.5; }
    }
    const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
    const acc = this.onGround ? 11 : 2;
    this.vel.x += (wx * speed - this.vel.x) * Math.min(1, acc * dt);
    this.vel.z += (wz * speed - this.vel.z) * Math.min(1, acc * dt);
    // stuck detection
    this.progT += dt;
    if (this.progT > 0.8) {
      const moved = Math.hypot(this.pos.x - this.lastProg.x, this.pos.z - this.lastProg.z);
      if (speed > 1.5 && moved < 0.25) {
        this.stuck++;
        if (this.onGround && this.stuck % 2 === 1) { this.vel.y = 6.6; this.onGround = false; this.jumped = true; }
        if (this.stuck >= 2) { this.path = null; this.repathAt = 0; }
        if (this.stuck >= 4) { this.goal = null; this.mode = this.mode === 'engage' ? 'engage' : 'roam'; this.stuck = 0; }
      } else this.stuck = 0;
      this.lastProg.copy(this.pos); this.progT = 0;
    }
  }
}
