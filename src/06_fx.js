/* ============================ EFFECTS ============================ */
const PART_VS = `
attribute vec3 iPos; attribute vec4 iCol; attribute vec2 iSR;
uniform float fogDen;
varying vec2 vUv; varying vec4 vCol; varying float vFog;
void main(){
  vUv = uv; vCol = iCol;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float c = cos(iSR.y), s = sin(iSR.y);
  vec2 p = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * iSR.x;
  mv.xy += p;
  vFog = 1.0 - exp(-fogDen * fogDen * mv.z * mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const PART_FS = `
uniform sampler2D map; uniform vec3 fogCol; uniform float additive;
varying vec2 vUv; varying vec4 vCol; varying float vFog;
void main(){
  vec4 t = texture2D(map, vUv);
  vec4 c = vec4(vCol.rgb * t.rgb, vCol.a * t.a);
  if (c.a < 0.003) discard;
  if (additive > 0.5) c.rgb *= (1.0 - vFog); else c.rgb = mix(c.rgb, fogCol, vFog);
  gl_FragColor = c;
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
class PSys {
  constructor(max, tex, additive, parent) {
    this.max = max; this.n = 0; this.P = [];
    for (let i = 0; i < max; i++) this.P.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, s0: 1, s1: 1, r: 1, g: 1, b: 1, a: 1, fin: 0, rot: 0, vr: 0, grav: 0, drag: 0 });
    const geo = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1);
    geo.setIndex(q.index); geo.setAttribute('position', q.attributes.position); geo.setAttribute('uv', q.attributes.uv);
    const mk = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPos = mk(3); this.aCol = mk(4); this.aSR = mk(2);
    geo.setAttribute('iPos', this.aPos); geo.setAttribute('iCol', this.aCol); geo.setAttribute('iSR', this.aSR);
    geo.instanceCount = 0; this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, fogCol: { value: FOG_COL }, fogDen: { value: 0.0062 }, additive: { value: additive ? 1 : 0 } },
      vertexShader: PART_VS, fragmentShader: PART_FS, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 4 : 3;
    parent.add(this.mesh);
  }
  add(o) {
    let p;
    if (this.n < this.max) p = this.P[this.n++]; else p = this.P[Math.floor(Math.random() * this.max)];
    p.x = o.x; p.y = o.y; p.z = o.z; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.age = 0; p.life = o.life || 1; p.s0 = o.s0 || 0.2; p.s1 = o.s1 === undefined ? p.s0 : o.s1;
    p.r = o.r === undefined ? 1 : o.r; p.g = o.g === undefined ? 1 : o.g; p.b = o.b === undefined ? 1 : o.b; p.a = o.a === undefined ? 1 : o.a;
    p.fin = o.fin || 0; p.rot = o.rot === undefined ? Math.random() * TAU : o.rot; p.vr = o.vr || 0; p.grav = o.grav || 0; p.drag = o.drag || 0;
  }
  update(dt) {
    const P = this.P, pos = this.aPos.array, col = this.aCol.array, sr = this.aSR.array;
    for (let i = 0; i < this.n; i++) {
      const p = P[i];
      p.age += dt;
      if (p.age >= p.life) { const last = P[this.n - 1]; P[this.n - 1] = p; P[i] = last; this.n--; i--; continue; }
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy = p.vy * dr - p.grav * dt; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
      const t = p.age / p.life;
      const fade = (p.fin > 0 && t < p.fin ? t / p.fin : 1) * (1 - t) * (1 - t * 0.35);
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      col[i * 4] = p.r; col[i * 4 + 1] = p.g; col[i * 4 + 2] = p.b; col[i * 4 + 3] = p.a * fade;
      sr[i * 2] = p.s0 + (p.s1 - p.s0) * (1 - (1 - t) * (1 - t)); sr[i * 2 + 1] = p.rot;
    }
    this.geo.instanceCount = this.n;
    if (this.n) {
      this.aPos.updateRange.count = this.n * 3; this.aCol.updateRange.count = this.n * 4; this.aSR.updateRange.count = this.n * 2;
      this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSR.needsUpdate = true;
    }
  }
}
class DecalPool {
  constructor(max, mat, parent) {
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, max);
    this.mesh.count = 0; this.max = max; this.i = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.q2 = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); this.z = new THREE.Vector3(0, 0, 1);
    parent.add(this.mesh);
  }
  add(x, y, z, nx, ny, nz, size) {
    this.v.set(nx, ny, nz); this.q.setFromUnitVectors(this.z, this.v); this.q2.setFromAxisAngle(this.z, Math.random() * TAU); this.q.multiply(this.q2);
    this.v.set(x + nx * 0.012, y + ny * 0.012, z + nz * 0.012); this.s.set(size, size, size);
    this.m.compose(this.v, this.q, this.s); this.mesh.setMatrixAt(this.i, this.m);
    this.i = (this.i + 1) % this.max; this.mesh.count = Math.min(this.max, this.mesh.count + 1); this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { this.mesh.count = 0; this.i = 0; }
}
const FX = {
  shake: 0, gulls: [], flashes: [], tracers: [],
  init(scene) {
    this.scene = scene;
    this.fire = new PSys(500, Tex.soft, true, scene);
    this.smoke = new PSys(420, Tex.smoke, false, scene);
    this.dust = new PSys(360, Tex.soft, false, scene);
    this.holes = new DecalPool(180, new THREE.MeshStandardMaterial({ map: Tex.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 0.95 }), scene);
    this.blood = new DecalPool(60, new THREE.MeshStandardMaterial({ map: Tex.blood, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 0.5 }), scene);
    this.scorch = new DecalPool(12, new THREE.MeshStandardMaterial({ map: Tex.hole, color: C(0x555555), transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 1 }), scene);
    // tracers
    const TM = 56; this.trMax = TM;
    const g = new THREE.BufferGeometry(), pos = new Float32Array(TM * 12), uv = new Float32Array(TM * 8), idx = [];
    for (let i = 0; i < TM; i++) { uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    this.trGeo = g;
    const tm = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: Tex.tracer, color: new THREE.Color(3.2, 2.2, 1.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true }));
    tm.frustumCulled = false; tm.renderOrder = 5; scene.add(tm);
    for (let i = 0; i < TM; i++) this.tracers.push({ on: false });
    // muzzle flash sprites (world)
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.flash, color: new THREE.Color(2.4, 1.7, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.visible = false; scene.add(s); this.flashes.push({ s, t: 0 });
    }
    this.pLight = new THREE.PointLight(C(0xffc27a), 0, 9, 2); scene.add(this.pLight);
    this.bLight = new THREE.PointLight(C(0xffc27a), 0, 8, 2); scene.add(this.bLight);
    this.xLight = new THREE.PointLight(C(0xffa050), 0, 22, 2); scene.add(this.xLight);
    this.pLightT = 0; this.bLightT = 0; this.xLightT = 0;
    // seagulls
    const gm = new THREE.MeshStandardMaterial({ color: C(0xe8e8e2), roughness: 0.8 }), wm = new THREE.MeshStandardMaterial({ color: C(0xb9bcc0), roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), gm); body.scale.set(1, 0.8, 2.4); b.add(body);
      const wl = new THREE.Group(), wr = new THREE.Group();
      const wgeo = new THREE.PlaneGeometry(0.55, 0.2); wgeo.rotateX(-Math.PI / 2); wgeo.translate(0.28, 0, 0);
      const w1 = new THREE.Mesh(wgeo, wm), w2 = new THREE.Mesh(wgeo, wm); w2.scale.x = -1; wl.add(w2); wr.add(w1);
      b.add(wl, wr); scene.add(b);
      this.gulls.push({ b, wl, wr, cx: rand(-30, 30), cz: rand(0, 40), r: rand(12, 30), h: rand(16, 30), a: rand(0, TAU), w: rand(0.12, 0.25) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 10) });
    }
    this.smokeT = 0;
  },
  flash(pos, size) {
    const f = this.flashes.find((q) => !q.s.visible) || this.flashes[0];
    f.s.position.copy(pos); f.s.scale.set(size, size, size); f.s.material.rotation = Math.random() * TAU; f.s.visible = true; f.t = 0.05;
  },
  tracer(sx, sy, sz, ex, ey, ez, speed = 420, len = 6, w = 0.028) {
    const t = this.tracers.find((q) => !q.on) || this.tracers[0];
    t.on = true; t.sx = sx; t.sy = sy; t.sz = sz; t.ex = ex; t.ey = ey; t.ez = ez; t.d = 0; t.len = len; t.speed = speed; t.w = w;
    t.L = Math.hypot(ex - sx, ey - sy, ez - sz);
  },
  impact(x, y, z, nx, ny, nz, mat, decal = true) {
    const R = Math.random;
    if (mat === 'water') { this.splash(x, y, z, 0.6); return; }
    if (decal && mat !== 'flesh') this.holes.add(x, y, z, nx, ny, nz, mat === 'wood' ? 0.1 : 0.085);
    if (mat === 'metal') {
      for (let i = 0; i < 7; i++) this.fire.add({ x, y, z, vx: nx * 3 + (R() - 0.5) * 6, vy: ny * 3 + R() * 4, vz: nz * 3 + (R() - 0.5) * 6, life: 0.18 + R() * 0.25, s0: 0.05, s1: 0.02, r: 3, g: 1.9, b: 0.8, grav: 12 });
      this.dust.add({ x, y, z, vx: nx * 0.6, vy: 0.3, vz: nz * 0.6, life: 0.5, s0: 0.12, s1: 0.4, r: 0.5, g: 0.5, b: 0.5, a: 0.35, drag: 3 });
    } else if (mat === 'wood') {
      for (let i = 0; i < 6; i++) this.dust.add({ x, y, z, vx: nx * 3 + (R() - 0.5) * 3, vy: ny * 2 + R() * 3, vz: nz * 3 + (R() - 0.5) * 3, life: 0.5 + R() * 0.4, s0: 0.035, s1: 0.03, r: 0.45, g: 0.33, b: 0.2, a: 1, grav: 12 });
      this.smoke.add({ x, y, z, vx: nx * 0.8, vy: 0.2, vz: nz * 0.8, life: 0.8, s0: 0.15, s1: 0.5, r: 0.55, g: 0.48, b: 0.4, a: 0.4, drag: 3 });
    } else if (mat === 'flesh') {
      for (let i = 0; i < 6; i++) this.dust.add({ x, y, z, vx: nx * 1.5 + (R() - 0.5) * 2.5, vy: R() * 2, vz: nz * 1.5 + (R() - 0.5) * 2.5, life: 0.35 + R() * 0.3, s0: 0.07, s1: 0.18, r: 0.35, g: 0.02, b: 0.02, a: 0.85, grav: 6, drag: 2 });
      this.dust.add({ x, y, z, life: 0.25, s0: 0.2, s1: 0.5, r: 0.4, g: 0.03, b: 0.03, a: 0.5, drag: 2 });
    } else {
      for (let i = 0; i < 5; i++) this.dust.add({ x, y, z, vx: nx * 3 + (R() - 0.5) * 3, vy: ny * 3 + R() * 3, vz: nz * 3 + (R() - 0.5) * 3, life: 0.4 + R() * 0.3, s0: 0.03, s1: 0.03, r: 0.3, g: 0.29, b: 0.27, a: 1, grav: 14 });
      this.smoke.add({ x, y, z, vx: nx * 0.9, vy: 0.35, vz: nz * 0.9, life: 0.9, s0: 0.15, s1: 0.65, r: 0.62, g: 0.6, b: 0.57, a: 0.45, drag: 2.6 });
      if (R() < 0.3) this.fire.add({ x, y, z, vx: nx * 2, vy: 2, vz: nz * 2, life: 0.12, s0: 0.05, s1: 0.02, r: 2.5, g: 1.6, b: 0.7, grav: 10 });
    }
  },
  splash(x, y, z, s = 1) {
    const R = Math.random;
    for (let i = 0; i < 10 * s; i++) this.dust.add({ x: x + (R() - 0.5) * 0.2, y: SEA_Y + 0.02, z: z + (R() - 0.5) * 0.2, vx: (R() - 0.5) * 1.6 * s, vy: 2.5 + R() * 3 * s, vz: (R() - 0.5) * 1.6 * s, life: 0.6 + R() * 0.4, s0: 0.06 * s, s1: 0.14 * s, r: 0.85, g: 0.9, b: 0.92, a: 0.8, grav: 12 });
    this.smoke.add({ x, y: SEA_Y + 0.05, z, life: 0.9, s0: 0.3 * s, s1: 1.1 * s, r: 0.8, g: 0.85, b: 0.86, a: 0.35, drag: 2 });
  },
  bloodBurst(x, y, z, dx, dy, dz, head) {
    this.impact(x, y, z, -dx, -dy, -dz, 'flesh', false);
    if (head) for (let i = 0; i < 6; i++) this.dust.add({ x, y, z, vx: dx * 3 + (Math.random() - 0.5) * 2, vy: Math.random() * 2, vz: dz * 3 + (Math.random() - 0.5) * 2, life: 0.5, s0: 0.1, s1: 0.3, r: 0.4, g: 0.02, b: 0.02, a: 0.8, grav: 5, drag: 2 });
    // splatter on nearby wall behind the target
    const o = V3(x, y, z), d = V3(dx, dy, dz);
    const h = raycast(o, d, 2.4, 'bullet');
    if (h) this.blood.add(x + dx * h.t, y + dy * h.t, z + dz * h.t, h.nx, h.ny, h.nz, 0.35 + Math.random() * 0.35);
  },
  explosion(p) {
    const R = Math.random;
    this.flash(V3(p.x, p.y + 0.4, p.z), 5.5);
    this.xLight.position.set(p.x, p.y + 1, p.z); this.xLightT = 0.35;
    for (let i = 0; i < 26; i++) { const a = R() * TAU, u = R(); this.fire.add({ x: p.x, y: p.y + 0.3, z: p.z, vx: Math.cos(a) * 7 * u, vy: 2 + R() * 7, vz: Math.sin(a) * 7 * u, life: 0.25 + R() * 0.35, s0: 0.7, s1: 1.6, r: 3.2, g: 1.5, b: 0.45, drag: 4 }); }
    for (let i = 0; i < 30; i++) { const a = R() * TAU; this.fire.add({ x: p.x, y: p.y + 0.2, z: p.z, vx: Math.cos(a) * rand(6, 16), vy: rand(3, 12), vz: Math.sin(a) * rand(6, 16), life: 0.4 + R() * 0.6, s0: 0.06, s1: 0.03, r: 3, g: 1.8, b: 0.7, grav: 16 }); }
    for (let i = 0; i < 18; i++) { const a = R() * TAU, u = R(); this.smoke.add({ x: p.x + Math.cos(a) * u, y: p.y + 0.4 + R(), z: p.z + Math.sin(a) * u, vx: Math.cos(a) * 2.5 * u, vy: 0.8 + R() * 1.6, vz: Math.sin(a) * 2.5 * u, life: 2.8 + R() * 2.4, s0: 1.2, s1: 4.6, r: 0.2, g: 0.19, b: 0.18, a: 0.7, fin: 0.05, drag: 1.1, vr: (R() - 0.5) * 0.6 }); }
    for (let i = 0; i < 12; i++) { const a = R() * TAU; this.dust.add({ x: p.x, y: p.y + 0.1, z: p.z, vx: Math.cos(a) * 8, vy: 0.4, vz: Math.sin(a) * 8, life: 0.9, s0: 0.5, s1: 1.8, r: 0.5, g: 0.46, b: 0.4, a: 0.5, drag: 3 }); }
    this.scorch.add(p.x, p.gy !== undefined ? p.gy : p.y, p.z, 0, 1, 0, 2.4);
  },
  update(dt, cam) {
    this.fire.update(dt); this.smoke.update(dt); this.dust.update(dt);
    for (const f of this.flashes) if (f.s.visible) { f.t -= dt; if (f.t <= 0) f.s.visible = false; }
    this.pLightT -= dt; this.pLight.intensity = this.pLightT > 0 ? 2.4 : 0;
    this.bLightT -= dt; this.bLight.intensity = this.bLightT > 0 ? 1.6 : 0;
    this.xLightT -= dt; this.xLight.intensity = this.xLightT > 0 ? 14 * (this.xLightT / 0.35) : 0;
    // tracers
    const pos = this.trGeo.attributes.position.array, cp = cam.position;
    for (let i = 0; i < this.trMax; i++) {
      const t = this.tracers[i], o = i * 12;
      if (!t.on) { pos.fill(0, o, o + 12); continue; }
      t.d += t.speed * dt;
      const a0 = Math.max(0, t.d - t.len) / t.L, a1 = Math.min(t.L, t.d) / t.L;
      if (t.d - t.len > t.L) { t.on = false; pos.fill(0, o, o + 12); continue; }
      const dx = t.ex - t.sx, dy = t.ey - t.sy, dz = t.ez - t.sz;
      const ax = t.sx + dx * a0, ay = t.sy + dy * a0, az = t.sz + dz * a0, bx = t.sx + dx * a1, by = t.sy + dy * a1, bz = t.sz + dz * a1;
      const mx = (ax + bx) / 2 - cp.x, my = (ay + by) / 2 - cp.y, mz = (az + bz) / 2 - cp.z;
      let sx = dy * mz - dz * my, sy = dz * mx - dx * mz, sz = dx * my - dy * mx; const sl = Math.hypot(sx, sy, sz) || 1;
      const w = t.w * (1 + Math.hypot(mx, my, mz) * 0.02); sx = sx / sl * w; sy = sy / sl * w; sz = sz / sl * w;
      pos[o] = ax - sx; pos[o + 1] = ay - sy; pos[o + 2] = az - sz; pos[o + 3] = bx - sx; pos[o + 4] = by - sy; pos[o + 5] = bz - sz;
      pos[o + 6] = bx + sx; pos[o + 7] = by + sy; pos[o + 8] = bz + sz; pos[o + 9] = ax + sx; pos[o + 10] = ay + sy; pos[o + 11] = az + sz;
    }
    this.trGeo.attributes.position.needsUpdate = true;
    // funnel smoke
    this.smokeT -= dt;
    if (this.smokeT <= 0 && MAP.anim.funnel) {
      this.smokeT = 0.22; const f = MAP.anim.funnel;
      this.smoke.add({ x: f.x + rand(-0.2, 0.2), y: f.y, z: f.z + rand(-0.2, 0.2), vx: 0.9 + Math.random() * 0.4, vy: 1.3 + Math.random() * 0.4, vz: -0.5, life: 7, s0: 0.8, s1: 5.5, r: 0.28, g: 0.27, b: 0.28, a: 0.28, fin: 0.1, drag: 0.15, vr: 0.1 });
    }
    // seagulls
    const T = performance.now() / 1000;
    for (const g of this.gulls) {
      g.a += g.w * dt;
      const x = g.cx + Math.cos(g.a) * g.r, z = g.cz + Math.sin(g.a) * g.r, y = g.h + Math.sin(g.a * 2 + g.ph) * 1.5;
      g.b.position.set(x, y, z);
      g.b.rotation.set(0, -g.a + (g.w > 0 ? Math.PI : 0), (g.w > 0 ? 1 : -1) * 0.25);
      const flap = Math.sin(T * 1.3 + g.ph) > 0.2 ? Math.sin(T * 9 + g.ph) * 0.7 : 0.08;
      g.wr.rotation.z = flap; g.wl.rotation.z = -flap;
    }
    this.shake = Math.max(0, this.shake - dt * 2.2);
  },
  clear() {
    this.fire.n = this.smoke.n = this.dust.n = 0; this.holes.clear(); this.blood.clear(); this.scorch.clear();
    for (const t of this.tracers) t.on = false;
  },
};
