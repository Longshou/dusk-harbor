/* ============================ AUDIO ============================ */
const Snd = {
  ctx: null, out: null, rev: null, echo: null, noise: null, ready: false,
  lp: new THREE.Vector3(), recent: [], ambT: { gull: 6, horn: 50, beep: 20 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    let ctx;
    try { ctx = this.ctx = new AC(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.22;
    comp.connect(ctx.destination);
    this.out = ctx.createGain(); this.out.gain.value = Settings.volume; this.out.connect(comp);
    const len = ctx.sampleRate * 2, nb = ctx.createBuffer(1, len, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    // brown noise for wind / surf
    const bb = ctx.createBuffer(1, len, ctx.sampleRate), bd = bb.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
    this.brown = bb;
    const irLen = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < irLen; i++) { const t = i / ctx.sampleRate; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / 2.6, 2.4) * Math.min(1, t / 0.012); } }
    this.rev = ctx.createConvolver(); this.rev.buffer = ir;
    const rg = ctx.createGain(); rg.gain.value = 0.3; this.rev.connect(rg); rg.connect(this.out);
    this.echo = ctx.createDelay(1.2); this.echo.delayTime.value = 0.31;
    const fb = ctx.createGain(); fb.gain.value = 0.28; const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 1300;
    this.echo.connect(ef); ef.connect(fb); fb.connect(this.echo);
    const eg = ctx.createGain(); eg.gain.value = 0.32; ef.connect(eg); eg.connect(this.out);
    this.ready = true;
    this.startAmbience();
  },
  setVolume(v) { if (this.out) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },
  now() { return this.ctx.currentTime; },
  env(p, t0, a, peak, dec) { p.setValueAtTime(0.0001, t0); p.linearRampToValueAtTime(peak, t0 + a); p.exponentialRampToValueAtTime(0.0001, t0 + a + dec); },
  noiseSrc(t0, dur, buf) { const s = this.ctx.createBufferSource(); s.buffer = buf || this.noise; s.start(t0, Math.random() * 1.4, dur + 0.05); return s; },
  filt(type, f, q) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q !== undefined) b.Q.value = q; return b; },
  gain(v) { const g = this.ctx.createGain(); g.gain.value = v; return g; },
  updateListener(cam) {
    if (!this.ready) return;
    const l = this.ctx.listener, p = cam.position; this.lp.copy(p);
    const f = V3(0, 0, -1).applyQuaternion(cam.quaternion), u = V3(0, 1, 0).applyQuaternion(cam.quaternion);
    if (l.positionX) {
      const t = this.ctx.currentTime;
      l.positionX.setValueAtTime(p.x, t); l.positionY.setValueAtTime(p.y, t); l.positionZ.setValueAtTime(p.z, t);
      l.forwardX.setValueAtTime(f.x, t); l.forwardY.setValueAtTime(f.y, t); l.forwardZ.setValueAtTime(f.z, t);
      l.upX.setValueAtTime(u.x, t); l.upY.setValueAtTime(u.y, t); l.upZ.setValueAtTime(u.z, t);
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
  },
  // returns {node, dist, delay}
  dest(pos, ref = 4, roll = 1.1) {
    if (!pos) return { node: this.out, dist: 0, delay: 0 };
    const p = this.ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 500;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    p.connect(this.out);
    const dist = pos.distanceTo(this.lp);
    return { node: p, dist, delay: dist / 343 };
  },
  shot(kind, pos, own) {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    if (!own) { // throttle dense bot gunfire
      this.recent = this.recent.filter((t) => now - t < 0.09);
      if (this.recent.length > 7) return; this.recent.push(now);
    }
    const P = kind === 'sniper' ? { lp: 3600, lpEnd: 220, len: 0.42, crack: 1.3, thump: 62, tv: 1.1, vol: 1.05 }
      : kind === 'pistol' ? { lp: 6000, lpEnd: 480, len: 0.16, crack: 0.9, thump: 130, tv: 0.55, vol: 0.72 }
        : { lp: 5200, lpEnd: 380, len: 0.22, crack: 1.0, thump: 88, tv: 0.85, vol: 0.9 };
    const D = this.dest(own ? null : pos, 6, 1.0);
    const t0 = now + D.delay + 0.003;
    const far = D.dist > 70;
    const master = this.gain(P.vol * (own ? 0.95 : 1.25));
    const air = this.filt('lowpass', own ? 17000 : clamp(15000 / (1 + D.dist / 30), 700, 15000));
    master.connect(air); air.connect(D.node);
    const send = this.gain(own ? 0.32 : 0.45 + Math.min(0.6, D.dist / 70)); air.connect(send); send.connect(this.rev); send.connect(this.echo);
    const n = this.noiseSrc(t0, P.len + 0.1), lp = this.filt('lowpass', P.lp, 0.7);
    lp.frequency.setValueAtTime(P.lp, t0); lp.frequency.exponentialRampToValueAtTime(P.lpEnd, t0 + P.len);
    const ng = this.gain(0); this.env(ng.gain, t0, 0.0012, 1.0, P.len);
    n.connect(lp); lp.connect(ng); ng.connect(master);
    if (!far) {
      const c = this.noiseSrc(t0, 0.06), hp = this.filt('highpass', 2400), cg = this.gain(0);
      this.env(cg.gain, t0, 0.0006, P.crack, 0.03); c.connect(hp); hp.connect(cg); cg.connect(master);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(P.thump * 2.3, t0); o.frequency.exponentialRampToValueAtTime(P.thump * 0.5, t0 + 0.13);
      const og = this.gain(0); this.env(og.gain, t0, 0.002, P.tv, 0.17); o.connect(og); og.connect(master); o.start(t0); o.stop(t0 + 0.3);
    }
    if (own) { // mechanical action click
      const m = this.noiseSrc(t0 + 0.035, 0.03), bp = this.filt('bandpass', 3200, 3), mg = this.gain(0);
      this.env(mg.gain, t0 + 0.035, 0.001, 0.25, 0.025); m.connect(bp); bp.connect(mg); mg.connect(this.out);
    }
  },
  click(freq = 2600, vol = 0.3, dur = 0.03, delay = 0, pos = null) {
    if (!this.ready) return;
    const D = this.dest(pos, 2, 1.4), t0 = this.ctx.currentTime + delay + D.delay;
    const n = this.noiseSrc(t0, dur + 0.02), bp = this.filt('bandpass', freq, 4), g = this.gain(0);
    this.env(g.gain, t0, 0.001, vol, dur); n.connect(bp); bp.connect(g); g.connect(D.node);
  },
  reload(kind) {
    if (kind === 'sniper') { this.click(1800, 0.35, 0.05, 0.25); this.click(1200, 0.4, 0.06, 1.1); this.click(2600, 0.3, 0.04, 1.7); this.click(2200, 0.35, 0.05, 2.5); this.click(1500, 0.4, 0.06, 2.9); }
    else if (kind === 'pistol') { this.click(2000, 0.35, 0.04, 0.3); this.click(1300, 0.45, 0.05, 1.1); this.click(3000, 0.35, 0.04, 1.55); }
    else { this.click(1700, 0.35, 0.05, 0.35); this.click(900, 0.45, 0.07, 1.25); this.click(2800, 0.35, 0.04, 1.85); this.click(2300, 0.4, 0.05, 2.05); }
  },
  bolt() { this.click(2400, 0.35, 0.04, 0.25); this.click(1600, 0.35, 0.05, 0.45); this.click(2800, 0.3, 0.04, 0.75); },
  dry() { this.click(3600, 0.3, 0.02); },
  step(pos, surface, vol = 1) {
    if (!this.ready) return;
    const D = this.dest(pos, 2.5, 1.5); if (D.dist > 45) return;
    const t0 = this.ctx.currentTime + 0.005;
    const n = this.noiseSrc(t0, 0.12), g = this.gain(0);
    if (surface === 'metal') {
      const bp = this.filt('bandpass', rand(900, 1300), 2.5); this.env(g.gain, t0, 0.002, 0.42 * vol, 0.09); n.connect(bp); bp.connect(g);
      const o = this.ctx.createOscillator(); o.frequency.value = rand(380, 460); o.type = 'triangle';
      const og = this.gain(0); this.env(og.gain, t0, 0.002, 0.06 * vol, 0.16); o.connect(og); og.connect(D.node); o.start(t0); o.stop(t0 + 0.2);
    } else {
      const lp = this.filt('lowpass', rand(650, 900)), hp = this.filt('highpass', 90);
      this.env(g.gain, t0, 0.003, 0.5 * vol, 0.07); n.connect(lp); lp.connect(hp); hp.connect(g);
    }
    g.connect(D.node);
  },
  impact(pos, mat) {
    if (!this.ready) return;
    const D = this.dest(pos, 2, 1.3); if (D.dist > 60) return;
    const t0 = this.ctx.currentTime + D.delay;
    const n = this.noiseSrc(t0, 0.1), g = this.gain(0);
    if (mat === 'metal') {
      const bp = this.filt('bandpass', rand(2500, 4200), 6); this.env(g.gain, t0, 0.001, 0.4, 0.07); n.connect(bp); bp.connect(g);
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(rand(1700, 3200), t0); o.frequency.exponentialRampToValueAtTime(rand(900, 1500), t0 + 0.2);
      const og = this.gain(0); this.env(og.gain, t0, 0.001, 0.1, 0.22); o.connect(og); og.connect(D.node); o.start(t0); o.stop(t0 + 0.3);
    } else if (mat === 'wood') { const bp = this.filt('bandpass', 520, 2); this.env(g.gain, t0, 0.001, 0.55, 0.06); n.connect(bp); bp.connect(g); }
    else if (mat === 'flesh') { const lp = this.filt('lowpass', 420); this.env(g.gain, t0, 0.001, 0.8, 0.07); n.connect(lp); lp.connect(g); }
    else if (mat === 'water') { const bp = this.filt('bandpass', 900, 1); bp.frequency.setValueAtTime(1600, t0); bp.frequency.exponentialRampToValueAtTime(400, t0 + 0.15); this.env(g.gain, t0, 0.004, 0.4, 0.14); n.connect(bp); bp.connect(g); }
    else { const bp = this.filt('bandpass', rand(1100, 1800), 1.4); this.env(g.gain, t0, 0.001, 0.4, 0.05); n.connect(bp); bp.connect(g); }
    g.connect(D.node);
  },
  whiz(pos) {
    if (!this.ready) return;
    const D = this.dest(pos, 1, 1), t0 = this.ctx.currentTime;
    const n = this.noiseSrc(t0, 0.2), bp = this.filt('bandpass', 3000, 3), g = this.gain(0);
    bp.frequency.setValueAtTime(4200, t0); bp.frequency.exponentialRampToValueAtTime(700, t0 + 0.16);
    this.env(g.gain, t0, 0.01, 0.55, 0.14); n.connect(bp); bp.connect(g); g.connect(D.node);
    const c = this.noiseSrc(t0, 0.03), hp = this.filt('highpass', 3500), cg = this.gain(0); this.env(cg.gain, t0, 0.0005, 0.35, 0.015); c.connect(hp); hp.connect(cg); cg.connect(D.node);
  },
  hit(head, kill) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = head ? 'triangle' : 'sine'; o.frequency.value = head ? 2400 : 1500;
    const g = this.gain(0); this.env(g.gain, t0, 0.001, head ? 0.25 : 0.18, head ? 0.14 : 0.05); o.connect(g); g.connect(this.out); o.start(t0); o.stop(t0 + 0.2);
    if (head) { const o2 = this.ctx.createOscillator(); o2.frequency.value = 3700; o2.type = 'sine'; const g2 = this.gain(0); this.env(g2.gain, t0, 0.001, 0.1, 0.2); o2.connect(g2); g2.connect(this.out); o2.start(t0); o2.stop(t0 + 0.25); }
    if (kill) {
      const k = this.ctx.createOscillator(); k.type = 'sine'; k.frequency.setValueAtTime(180, t0 + 0.02); k.frequency.exponentialRampToValueAtTime(60, t0 + 0.25);
      const kg = this.gain(0); this.env(kg.gain, t0 + 0.02, 0.004, 0.45, 0.22); k.connect(kg); kg.connect(this.out); k.start(t0); k.stop(t0 + 0.35);
    }
  },
  hurt() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime, n = this.noiseSrc(t0, 0.15), lp = this.filt('lowpass', 300), g = this.gain(0);
    this.env(g.gain, t0, 0.002, 0.9, 0.12); n.connect(lp); lp.connect(g); g.connect(this.out);
  },
  heart() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    for (const d of [0, 0.16]) { const o = this.ctx.createOscillator(); o.frequency.value = 52; const g = this.gain(0); this.env(g.gain, t0 + d, 0.01, 0.5, 0.12); o.connect(g); g.connect(this.out); o.start(t0 + d); o.stop(t0 + d + 0.2); }
  },
  swish() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime, n = this.noiseSrc(t0, 0.2), bp = this.filt('bandpass', 1200, 1.5), g = this.gain(0);
    bp.frequency.setValueAtTime(700, t0); bp.frequency.exponentialRampToValueAtTime(3000, t0 + 0.14); this.env(g.gain, t0, 0.03, 0.4, 0.12);
    n.connect(bp); bp.connect(g); g.connect(this.out);
  },
  explosion(pos) {
    if (!this.ready) return;
    const D = this.dest(pos, 10, 0.9), t0 = this.ctx.currentTime + D.delay;
    const master = this.gain(1.6); master.connect(D.node); const send = this.gain(0.9); master.connect(send); send.connect(this.rev); send.connect(this.echo);
    const n = this.noiseSrc(t0, 1.6), lp = this.filt('lowpass', 2400, 0.8);
    lp.frequency.setValueAtTime(3000, t0); lp.frequency.exponentialRampToValueAtTime(90, t0 + 1.3);
    const g = this.gain(0); this.env(g.gain, t0, 0.004, 1.2, 1.3); n.connect(lp); lp.connect(g); g.connect(master);
    const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(28, t0 + 0.6);
    const og = this.gain(0); this.env(og.gain, t0, 0.005, 1.4, 0.6); o.connect(og); og.connect(master); o.start(t0); o.stop(t0 + 0.8);
  },
  pin() { this.click(3800, 0.3, 0.03); this.click(2600, 0.2, 0.05, 0.1); },
  ui() { this.click(1900, 0.18, 0.025); },
  startAmbience() {
    const ctx = this.ctx;
    const mk = (buf, type, f, q, vol) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const fl = this.filt(type, f, q); const g = this.gain(vol); s.connect(fl); fl.connect(g); g.connect(this.out); s.start(); return { s, fl, g }; };
    const surf = mk(this.brown, 'lowpass', 520, 0.6, 0.35);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = this.gain(0.16); lfo.connect(lg); lg.connect(surf.g.gain); lfo.start();
    const lap = mk(this.noise, 'bandpass', 700, 0.8, 0.018);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.21; const lg2 = this.gain(0.012); lfo2.connect(lg2); lg2.connect(lap.g.gain); lfo2.start();
    this.wind = mk(this.brown, 'bandpass', 380, 0.7, 0.12);
    const hum = ctx.createOscillator(); hum.frequency.value = 47; const hg = this.gain(0.012); hum.connect(hg); hg.connect(this.out); hum.start();
  },
  gull() {
    const ang = Math.random() * TAU, pos = V3(this.lp.x + Math.cos(ang) * rand(25, 60), 22, this.lp.z + Math.sin(ang) * rand(25, 60));
    const D = this.dest(pos, 12, 1), t = this.ctx.currentTime + 0.05, n = randInt(2, 4);
    for (let i = 0; i < n; i++) {
      const t0 = t + i * rand(0.28, 0.42), o = this.ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(rand(1400, 1700), t0); o.frequency.exponentialRampToValueAtTime(rand(800, 1000), t0 + 0.24);
      const bp = this.filt('bandpass', 1800, 2), g = this.gain(0); this.env(g.gain, t0, 0.02, 0.07, 0.22);
      o.connect(bp); bp.connect(g); g.connect(D.node); o.start(t0); o.stop(t0 + 0.3);
    }
  },
  horn() {
    const pos = V3(rand(-200, 200), 20, 420), D = this.dest(pos, 60, 1), t0 = this.ctx.currentTime + 0.1;
    const g = this.gain(0); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.4, t0 + 0.3); g.gain.setValueAtTime(0.4, t0 + 2.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.6);
    const lp = this.filt('lowpass', 480); g.connect(lp); lp.connect(D.node); const s = this.gain(0.6); lp.connect(s); s.connect(this.rev);
    for (const f of [69, 104]) { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(g); o.start(t0); o.stop(t0 + 3.7); }
  },
  beeps() {
    const pos = V3(rand(-120, 120), 3, rand(-110, -60)), D = this.dest(pos, 30, 1), t = this.ctx.currentTime + 0.05;
    for (let i = 0; i < 5; i++) { const o = this.ctx.createOscillator(); o.frequency.value = 1180; const g = this.gain(0); const t0 = t + i * 0.7; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01); g.gain.setValueAtTime(0.05, t0 + 0.32); g.gain.linearRampToValueAtTime(0.0001, t0 + 0.34); o.connect(g); g.connect(D.node); o.start(t0); o.stop(t0 + 0.36); }
  },
  update(dt) {
    if (!this.ready) return;
    const a = this.ambT;
    a.gull -= dt; a.horn -= dt; a.beep -= dt;
    if (a.gull < 0) { a.gull = rand(7, 20); this.gull(); }
    if (a.horn < 0) { a.horn = rand(70, 140); this.horn(); }
    if (a.beep < 0) { a.beep = rand(25, 55); this.beeps(); }
    if (this.wind && Math.random() < dt * 0.3) this.wind.fl.frequency.setTargetAtTime(rand(260, 620), this.ctx.currentTime, 1.5);
  },
};
