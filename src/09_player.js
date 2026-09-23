/* ============================ INPUT ============================ */
const Input = {
  keys: Object.create(null), pressed: new Set(), mdx: 0, mdy: 0, swx: 0, swy: 0, lmb: false, rmb: false, locked: false, fallback: false,
  tMove: { x: 0, y: 0 }, tFire: false, tCrouch: false,
};
const consume = (c) => { if (Input.pressed.has(c)) { Input.pressed.delete(c); return true; } return false; };
const kd = (c) => !!Input.keys[c];
function hfovToV(h) { return 2 * Math.atan(Math.tan(h * DEG / 2) * 0.75) / DEG; }

/* ============================ ARSENAL ============================ */
const Arsenal = { w: {}, nades: 1, cur: null, prev: 'pistol', primary: 'rifle', state: 'idle', t: 0, nextFire: 0, bloom: 0, shotIdx: 0, trig: true, ads: 0, adsToggle: false, zoom: 0, rezoom: 0, recP: 0, recY: 0, lastShot: -10, hitAt: -1, heavy: false, throwAt: -1, cook: false, quick: null, slideT: 0 };
function arsenalReset() {
  const A = Arsenal; A.primary = Settings.primary === 'sniper' ? 'sniper' : 'rifle';
  for (const id of ['rifle', 'sniper', 'pistol']) A.w[id] = { mag: WPN[id].mag, res: WPN[id].reserve };
  A.nades = 1; A.cur = null; A.prev = 'pistol'; A.recP = A.recY = 0; A.bloom = 0; A.shotIdx = 0; A.quick = null;
  equip(A.primary, true);
}
function equip(id, force) {
  const A = Arsenal;
  if (id === 'rifle' || id === 'sniper') id = A.primary;
  if (!force && id === A.cur) return;
  if (id === 'nade' && A.nades <= 0) return;
  if (A.cur && A.cur !== id && A.cur !== 'nade') A.prev = A.cur;
  A.cur = id; A.state = 'draw'; A.t = WPN[id].draw; A.ads = 0; A.zoom = 0; A.rezoom = 0; A.adsToggle = false; A.cook = false; A.throwAt = -1; A.hitAt = -1;
  vmShow(id); Snd.click(1300, 0.18, 0.04); HUD.dirtyWeapon = true;
}
function startReload() {
  const A = Arsenal, W = WPN[A.cur], w = A.w[A.cur];
  if (!w || A.state !== 'idle' || w.mag >= W.mag || w.res <= 0) return;
  A.state = 'reload'; A.t = W.reload; A.zoom = 0; A.rezoom = 0; A.adsToggle = false; Snd.reload(W.snd);
}
const _pd = new THREE.Vector3(), _pd2 = new THREE.Vector3(), _pm = new THREE.Vector3();
function playerShoot(now) {
  const A = Arsenal, W = WPN[A.cur], P = Game.player, w = A.w[A.cur];
  w.mag--; A.lastShot = now; A.nextFire = now + 60 / W.rpm; A.trig = false;
  P.lastFire = now; P.shots++; P.spawnProt = 0;
  const hs = Math.hypot(P.vel.x, P.vel.z);
  let sp;
  if (W.id === 'sniper') sp = (A.zoom ? W.spread : W.sHip) + hs / 5 * W.sMove;
  else sp = (W.spread + A.bloom) * lerp(1, W.sAds, A.ads) + hs / 5.2 * W.sMove * (A.ads > 0.5 ? 0.7 : 1);
  if (!P.onGround) sp += W.sAir;
  if (P.crouchK > 0.5) sp *= W.sCrouch;
  A.bloom = Math.min(W.bloomMax, A.bloom + W.bloom);
  dirFromYawPitch(P.yaw + A.recY * DEG, P.pitch + A.recP * DEG, _pd);
  const d = spreadDir(_pd, sp, _pd2), o = V3(P.pos.x, P.pos.y + P.eye - P.stepOff, P.pos.z);
  const res = fireBullet(P, o, d, W);
  if (res.hit) P.hits++;
  const mz = VM.cur.muzzle ? VM.cur.muzzle.getWorldPosition(_pm) : o;
  if (W.id !== 'sniper' || !A.zoom) FX.tracer(mz.x, mz.y, mz.z, res.end.x, res.end.y, res.end.z, 520, 4, 0.016);
  VM.flash.visible = true; VM.flashT = 0.045; VM.flash.material.rotation = Math.random() * TAU; const fs = W.id === 'pistol' ? 0.1 : 0.16; VM.flash.scale.set(fs, fs, fs);
  FX.pLight.position.copy(mz); FX.pLightT = 0.05;
  const i = A.shotIdx++;
  const kUp = (i < 3 ? 0.9 : i < 10 ? 1.05 : 0.6) * (A.ads > 0.5 ? 0.85 : 1) * (P.crouchK > 0.5 ? 0.8 : 1);
  A.recP = Math.min(14, A.recP + W.rUp * kUp);
  A.recY += W.id === 'rifle' ? (i < 5 ? rand(-0.08, 0.08) : Math.sin(i * 0.55) * W.rSide * 1.6 + rand(-0.1, 0.1)) : rand(-W.rSide, W.rSide);
  A.recY = clamp(A.recY, -4, 4);
  VM.kick = 1;
  Snd.shot(W.snd, o, true);
  Game.noise(o, W.snd === 'sniper' ? 95 : 65, P, 'shot');
  vmEject();
  if (W.id === 'sniper') { A.state = 'bolt'; A.t = W.bolt; A.rezoom = A.zoom; A.zoom = 0; Snd.bolt(); }
  if (W.id === 'pistol') A.slideT = 0.07;
  HUD.dirtyAmmo = true;
}
function throwPlayerNade() {
  const P = Game.player, A = Arsenal;
  dirFromYawPitch(P.yaw, P.pitch, _pd);
  const o = V3(P.pos.x, P.pos.y + P.eye, P.pos.z).addScaledVector(_pd, 0.45); o.y -= 0.1;
  const v = _pd.clone().multiplyScalar(16).add(V3(0, 2.6, 0)).addScaledVector(P.vel, 0.6);
  throwNade(P, o, v); A.nades--; Snd.swish(); HUD.dirtyAmmo = true;
}
function updateArsenal(dt, now) {
  const A = Arsenal, P = Game.player;
  if (A.t > 0) A.t -= dt;
  if (A.slideT > 0) A.slideT -= dt;
  const busy = A.state === 'throw' || A.cook;
  if (!busy) {
    if (consume('Digit1')) equip(A.primary);
    if (consume('Digit2')) equip('pistol');
    if (consume('Digit3')) equip('knife');
    if (consume('Digit4')) equip('nade');
    if (consume('KeyQ')) equip(A.prev);
    const order = [A.primary, 'pistol', 'knife', 'nade'].filter((k) => k !== 'nade' || A.nades > 0);
    if (consume('WheelDown')) equip(order[(order.indexOf(A.cur) + 1) % order.length]);
    if (consume('WheelUp')) equip(order[(order.indexOf(A.cur) - 1 + order.length) % order.length]);
    if (consume('KeyG') && A.nades > 0 && A.cur !== 'nade') { A.quick = A.cur; equip('nade'); A.quickThrow = true; }
  }
  let W = WPN[A.cur], w = A.w[A.cur];
  if (consume('KeyR')) startReload();
  switch (A.state) {
    case 'draw': if (A.t <= 0) A.state = 'idle'; break;
    case 'reload': if (A.t <= 0) { const take = Math.min(W.mag - w.mag, w.res); w.mag += take; w.res -= take; A.state = 'idle'; HUD.dirtyAmmo = true; } break;
    case 'bolt': if (A.t <= 0) { A.state = 'idle'; if (A.rezoom && (Input.rmb || !Settings.adsHold || true)) A.zoom = A.rezoom; A.rezoom = 0; } break;
    case 'melee':
      if (A.hitAt >= 0 && W.draw && (A.meleeDur - A.t) >= A.hitAt) { A.hitAt = -1; knifeAttack(P, A.heavy); }
      if (A.t <= 0) A.state = 'idle';
      break;
    case 'throw':
      if (A.throwAt >= 0 && (0.5 - A.t) >= A.throwAt) { A.throwAt = -1; throwPlayerNade(); }
      if (A.t <= 0) { A.state = 'idle'; const back = A.quick || A.prev; A.quick = null; if (A.nades <= 0 || back) equip(A.nades <= 0 ? (back === 'nade' ? A.primary : back) : back); }
      break;
  }
  W = WPN[A.cur]; w = A.w[A.cur];
  const fire = Input.lmb || Input.tFire;
  const rmbPress = consume('RMB');
  // aim / zoom
  if (A.cur === 'sniper') {
    if (rmbPress) { if (A.state === 'bolt') A.rezoom = (A.rezoom + 1) % 3; else if (A.state !== 'reload') { A.zoom = (A.zoom + 1) % 3; Snd.click(2400, 0.12, 0.03); } }
    A.ads = Math.max(0, Math.min(1, A.ads + (A.zoom ? 1 : -1) * dt / W.adsT));
  } else if (A.cur === 'rifle' || A.cur === 'pistol') {
    if (rmbPress && !Settings.adsHold) A.adsToggle = !A.adsToggle;
    const want = (Settings.adsHold ? (Input.rmb || Input.tAim) : A.adsToggle || Input.tAim) && A.state !== 'reload' && A.state !== 'draw';
    A.ads = Math.max(0, Math.min(1, A.ads + (want ? 1 : -1) * dt / W.adsT));
  } else A.ads = Math.max(0, A.ads - dt * 6);
  // triggers
  if (W.melee) {
    if (A.state === 'idle' && (consume('LMB') || (fire && A.trig) || rmbPress)) {
      const heavy = rmbPress; A.state = 'melee'; A.heavy = heavy; A.meleeDur = A.t = heavy ? 1.0 : 0.5; A.hitAt = heavy ? 0.3 : 0.12; A.trig = false; Snd.swish(); P.spawnProt = 0;
    }
    if (!fire) A.trig = true;
  } else if (A.cur === 'nade') {
    if (A.quickThrow && A.state === 'idle') { A.quickThrow = false; A.cook = true; Snd.pin(); A.cookEnd = now + 0.25; }
    if (A.state === 'idle' && fire && !A.cook && A.trig) { A.cook = true; Snd.pin(); A.cookEnd = now; }
    if (A.cook && !fire && now >= A.cookEnd) { A.cook = false; A.state = 'throw'; A.t = 0.5; A.throwAt = 0.12; }
    if (!fire) A.trig = true;
  } else {
    if (fire && A.state === 'idle' && now >= A.nextFire && (W.auto || A.trig)) {
      if (w.mag > 0) playerShoot(now);
      else { if (A.trig) { Snd.dry(); A.trig = false; } if (w.res > 0) startReload(); }
    }
    if (!fire) A.trig = true;
    if (w.mag === 0 && w.res > 0 && A.state === 'idle' && !fire && now - A.lastShot > 0.25) startReload();
  }
  consume('LMB');
  // recoil & bloom recovery
  if (W.bloomRec) A.bloom = Math.max(0, A.bloom - W.bloomRec * dt);
  if (now - A.lastShot > 0.1) { const k = Math.exp(-(W.rRec || 8) * dt); A.recP *= k; A.recY *= k; }
  if (now - A.lastShot > 0.35) A.shotIdx = 0;
}

/* ============================ PLAYER ============================ */
const Cam = { bobPh: 0, bobAmt: 0, roll: 0, fov: 70, deathT: 0, killer: null, shakeX: 0, shakeY: 0 };
function updatePlayer(dt, now) {
  const P = Game.player, A = Arsenal;
  const baseV = hfovToV(Settings.fov);
  const zoomV = A.cur === 'sniper' && A.zoom ? hfovToV(WPN.sniper.zoom[A.zoom - 1]) : null;
  const sensK = zoomV ? zoomV / baseV : lerp(1, 0.78, A.ads);
  const s = 0.0021 * Settings.sens * sensK;
  P.yaw = wrapAngle(P.yaw - Input.mdx * s); P.pitch = clamp(P.pitch - Input.mdy * s, -1.5, 1.5);
  Input.swx += Input.mdx; Input.swy += Input.mdy; Input.mdx = 0; Input.mdy = 0;
  const frozen = Game.freeze > 0;
  let f = (kd('KeyW') || kd('ArrowUp') ? 1 : 0) - (kd('KeyS') || kd('ArrowDown') ? 1 : 0) - Input.tMove.y;
  let r = (kd('KeyD') || kd('ArrowRight') ? 1 : 0) - (kd('KeyA') || kd('ArrowLeft') ? 1 : 0) + Input.tMove.x;
  const L = Math.hypot(f, r); if (L > 1) { f /= L; r /= L; }
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let wx = -sy * f + cy * r, wz = -cy * f - sy * r;
  if (frozen) { wx = 0; wz = 0; }
  const walking = kd('ShiftLeft') || kd('ShiftRight');
  let speed = 5.2 * (WPN[A.cur] ? WPN[A.cur].speed : 1);
  if (walking) speed *= 0.52; if (P.crouching) speed *= 0.42; if (A.ads > 0.5) speed *= 0.72;
  const acc = P.onGround ? 11 : 1.6;
  P.vel.x += (wx * speed - P.vel.x) * Math.min(1, acc * dt);
  P.vel.z += (wz * speed - P.vel.z) * Math.min(1, acc * dt);
  if ((consume('Space') || Input.tJump) && P.onGround && !frozen) { P.vel.y = 7.0; P.onGround = false; P.jumped = true; Input.tJump = false; }
  const wantC = kd('ControlLeft') || kd('KeyC') || kd('ControlRight') || Input.tCrouch;
  const wasC = P.crouching;
  if (wantC) P.crouching = true; else if (P.crouching && canStand(P)) P.crouching = false;
  if (P.crouching !== wasC && !P.onGround) {
    queryBoxes(P.pos.x - 1, P.pos.z - 1, P.pos.x + 1, P.pos.z + 1, _pc);
    if (P.crouching) { if (!overlapAt(P.pos.x, P.pos.y + 0.45, P.pos.z, P.r, 1.3)) P.pos.y += 0.45; }
    else if (!overlapAt(P.pos.x, P.pos.y - 0.45, P.pos.z, P.r, 1.8)) P.pos.y -= 0.45; else P.crouching = true;
  }
  P.h = P.crouching ? 1.3 : 1.8;
  P.crouchK += ((P.crouching ? 1 : 0) - P.crouchK) * Math.min(1, dt * 11);
  P.eye = lerp(1.64, 1.2, P.crouchK);
  const land = moveCharacter(P, dt);
  if (land > 3) { VM.dip = Math.min(0.07, land * 0.005); Snd.step(null, P.surfaceUnder(), clamp(land / 9, 0.3, 1)); }
  if (land > 12.5) applyDamage(P, Math.round((land - 12.5) * 8), null, { weapon: 'fall' });
  if (P.pos.y < SEA_Y - 0.6 && P.alive) { FX.splash(P.pos.x, SEA_Y, P.pos.z, 2); Snd.impact(P.pos, 'water'); applyDamage(P, 999, null, { weapon: 'water' }); return; }
  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && hs > 0.5) {
    P.stepDist += hs * dt;
    if (P.stepDist > (walking || P.crouching ? 1.6 : 2.4)) {
      P.stepDist = 0;
      if (!walking && !P.crouching && hs > 3) { Snd.step(null, P.surfaceUnder(), 0.5); Game.noise(P.pos, 16, P, 'step'); }
      else Snd.step(null, P.surfaceUnder(), 0.08);
    }
  }
  if (P.spawnProt > 0) P.spawnProt -= dt;
  updateArsenal(dt, now);
}
function updateCamera(dt) {
  const P = Game.player, A = Arsenal;
  P.stepOff *= Math.exp(-dt * 13);
  const hs = Math.hypot(P.vel.x, P.vel.z);
  const moving = P.onGround && hs > 0.6;
  Cam.bobAmt += ((moving ? clamp(hs / 5.2, 0, 1) : 0) - Cam.bobAmt) * Math.min(1, dt * 8);
  if (moving) Cam.bobPh += dt * hs * 1.75;
  const bobK = Cam.bobAmt * (1 - A.ads * 0.8) * (A.zoom ? 0.2 : 1);
  const by = Math.abs(Math.sin(Cam.bobPh)) * 0.045 * bobK, bx = Math.sin(Cam.bobPh) * 0.025 * bobK;
  const sh = FX.shake;
  Cam.shakeX = (Math.random() - 0.5) * sh * 0.06; Cam.shakeY = (Math.random() - 0.5) * sh * 0.06;
  camera.position.set(P.pos.x + Math.cos(P.yaw) * bx, P.pos.y + P.eye - P.stepOff + by - VM.dip * 0.6, P.pos.z - Math.sin(P.yaw) * bx);
  const lean = clamp(-(Math.cos(P.yaw) * P.vel.x - Math.sin(P.yaw) * P.vel.z) * 0.004, -0.02, 0.02);
  Cam.roll += (lean - Cam.roll) * Math.min(1, dt * 6);
  camera.rotation.set(P.pitch + A.recP * DEG + Cam.shakeY, P.yaw + A.recY * DEG + Cam.shakeX, Cam.roll, 'YXZ');
  const baseV = hfovToV(Settings.fov);
  let target = baseV;
  if (A.cur === 'sniper' && A.zoom) target = hfovToV(WPN.sniper.zoom[A.zoom - 1]);
  else if (WPN[A.cur] && WPN[A.cur].adsFov) target = lerp(baseV, hfovToV(WPN[A.cur].adsFov), A.ads);
  Cam.fov += (target - Cam.fov) * Math.min(1, dt * (A.zoom ? 30 : 16));
  if (Math.abs(camera.fov - Cam.fov) > 0.01) { camera.fov = Cam.fov; camera.updateProjectionMatrix(); }
  VM.dip = Math.max(0, VM.dip - dt * 0.25);
}
function updateVM(dt, now) {
  const A = Arsenal, P = Game.player, m = VM.cur; if (!m) return;
  VM.cam.position.copy(camera.position); VM.cam.quaternion.copy(camera.quaternion); VM.cam.updateMatrixWorld();
  VM.sun.position.copy(camera.position).addScaledVector(SUN_DIR, 10); VM.sun.target.position.copy(camera.position); VM.sun.target.updateMatrixWorld();
  VM.shadowCheck -= dt;
  if (VM.shadowCheck <= 0) {
    VM.shadowCheck = 0.15;
    const lit = !raycast(camera.position, SUN_DIR, 150, 'sight'), roof = raycast(camera.position, V3(0, 1, 0), 6, 'sight');
    VM.sunT = lit ? 1 : 0.1; VM.hemiT = roof ? 0.45 : 0.85;
  }
  VM.sunK += (VM.sunT - VM.sunK) * Math.min(1, dt * 6); VM.sun.intensity = 2.3 * VM.sunK;
  VM.hemi.intensity += ((VM.hemiT || 0.85) - VM.hemi.intensity) * Math.min(1, dt * 4);
  const W = WPN[A.cur];
  const ease = (x) => x * x * (3 - 2 * x);
  const k = ease(A.ads);
  const hip = m.hip, ads = m.ads;
  let px = lerp(hip[0], ads[0], k), py = lerp(hip[1], ads[1], k), pz = lerp(hip[2], ads[2], k);
  let rx = 0, ry = lerp(m.hipR[1], 0, k), rz = 0;
  // sway
  VM.swayX += (clamp(-Input.swx * 0.00045, -0.05, 0.05) - VM.swayX) * Math.min(1, dt * 9);
  VM.swayY += (clamp(-Input.swy * 0.00045, -0.05, 0.05) - VM.swayY) * Math.min(1, dt * 9);
  Input.swx = 0; Input.swy = 0;
  const swK = 1 - k * 0.75;
  ry += VM.swayX * 1.4 * swK; rx += VM.swayY * 1.2 * swK; px += VM.swayX * 0.12 * swK; py += VM.swayY * 0.1 * swK;
  // bob
  const hs = Math.hypot(P.vel.x, P.vel.z), bobK = Cam.bobAmt * (1 - k * 0.85);
  px += Math.sin(Cam.bobPh) * 0.012 * bobK; py -= Math.abs(Math.cos(Cam.bobPh)) * 0.012 * bobK; rz += Math.sin(Cam.bobPh) * 0.02 * bobK;
  VM.t += dt; py += Math.sin(VM.t * 1.7) * 0.0016 * (1 - k); px += Math.sin(VM.t * 0.9) * 0.001 * (1 - k);
  if (!P.onGround) py += clamp(P.vel.y * 0.004, -0.03, 0.03);
  py -= VM.dip * 0.5 + P.crouchK * 0.006;
  // kick
  VM.kick = Math.max(0, VM.kick - dt * (W.id === 'sniper' ? 5 : 11));
  const kk = VM.kick * (W.id === 'sniper' ? 1.6 : W.id === 'pistol' ? 1.1 : 0.8);
  pz += kk * 0.045 * (1 - k * 0.5); rx += kk * 0.07; py += kk * 0.006;
  // states
  if (A.state === 'draw' && W.draw) { const p = 1 - clamp(A.t / W.draw, 0, 1), e = 1 - ease(p); py -= e * 0.22; rx -= e * 0.7; }
  if (A.state === 'reload' && W.reload) {
    const p = 1 - clamp(A.t / W.reload, 0, 1), e = Math.sin(Math.PI * clamp(p * 1.08, 0, 1));
    rz += e * 0.5; rx += e * 0.22; py -= e * 0.045; px -= e * 0.02;
    if (m.mag) { const out = p > 0.15 && p < 0.7 ? Math.sin(Math.PI * (p - 0.15) / 0.55) : 0; m.mag.position.y = m.magBase.y - out * 0.28; m.mag.visible = !(p > 0.35 && p < 0.5); }
    if (m.lh) { const out = p > 0.1 && p < 0.75 ? Math.sin(Math.PI * (p - 0.1) / 0.65) : 0; m.lh.position.set(m.lhBase.x, m.lhBase.y - out * 0.22, m.lhBase.z + out * 0.25); }
  } else { if (m.mag) { m.mag.position.copy(m.magBase); m.mag.visible = true; } if (m.lh) m.lh.position.copy(m.lhBase); }
  if (m.bolt) {
    if (A.state === 'bolt') { const p = 1 - clamp(A.t / W.bolt, 0, 1); const up = p < 0.25 ? p / 0.25 : p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25, back = p > 0.25 && p < 0.75 ? Math.sin(Math.PI * (p - 0.25) / 0.5) : 0; m.bolt.rotation.z = up * 1.2; m.bolt.position.z = -0.02 + back * 0.08; rz += up * 0.12; ry -= up * 0.05; }
    else { m.bolt.rotation.z = 0; m.bolt.position.z = -0.02; }
  }
  if (m.slide) m.slide.position.z = A.slideT > 0 ? 0.03 : 0;
  if (A.cur === 'knife' && m.k) {
    if (A.state === 'melee') {
      const p = 1 - clamp(A.t / A.meleeDur, 0, 1);
      if (A.heavy) { const a = p < 0.3 ? p / 0.3 : p < 0.5 ? 1 - (p - 0.3) / 0.2 * 1.6 : -0.6 + (p - 0.5) / 0.5 * 0.6; pz += (a < 0 ? a : -a * 0.1) * 0.25; py += a * 0.05; rx += a * 0.3; }
      else { const a = Math.sin(Math.PI * clamp(p / 0.6, 0, 1)); px -= a * 0.22; ry += a * 1.1; rz -= a * 0.4; pz -= a * 0.08; }
    }
  }
  if (A.cur === 'nade' && m.n) {
    if (A.cook) { py += 0.03; pz += 0.05; rx -= 0.2; m.ring.visible = false; }
    else if (A.state === 'throw') { const p = 1 - clamp(A.t / 0.5, 0, 1); const a = p < 0.3 ? p / 0.3 : 1; py += -0.02 + (p < 0.3 ? 0.06 * a : 0.06 - (p - 0.3) * 0.6); pz -= a * 0.25; rx -= a * 0.8; m.n.visible = p < 0.3; }
    else { m.n.visible = A.nades > 0; m.ring.visible = true; }
  }
  VM.root.position.set(px, py, pz); VM.root.rotation.set(rx, ry, rz);
  VM.root.visible = !(A.cur === 'sniper' && A.zoom && A.ads > 0.85);
  if (VM.flash.visible) { VM.flashT -= dt; if (VM.flashT <= 0) VM.flash.visible = false; }
  for (const s of VM.shells) if (s.m.visible) { s.t -= dt; s.v.y -= 9 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 20; s.m.rotation.z += dt * 13; if (s.t <= 0) s.m.visible = false; }
}
