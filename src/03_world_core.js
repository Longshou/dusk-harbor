/* ============================ WORLD CORE ============================ */
const SEA_Y = -1.3, DECK_Y = 3.6, FC_Y = 5.4, ROOF_Y = 7.0, SHIP_Z = 18;
const World = { boxes: [], stamp: 1, dyn: {} };
const HX0 = -64, HZ0 = -48, HCS = 4, HNX = 32, HNZ = 24;
const HASH = Array.from({ length: HNX * HNZ }, () => []);
function addCollider(x0, y0, z0, x1, y1, z1, o = {}) {
  const b = {
    x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1),
    move: o.move !== false, bullet: o.bullet !== false, sight: o.sight !== undefined ? o.sight : o.bullet !== false,
    walk: !!o.walk, stair: !!o.stair, mat: o.mat || 'concrete', pen: o.pen || 0, s: 0, id: World.boxes.length,
  };
  World.boxes.push(b);
  const ix0 = clamp(Math.floor((b.x0 - HX0) / HCS), 0, HNX - 1), ix1 = clamp(Math.floor((b.x1 - HX0) / HCS), 0, HNX - 1);
  const iz0 = clamp(Math.floor((b.z0 - HZ0) / HCS), 0, HNZ - 1), iz1 = clamp(Math.floor((b.z1 - HZ0) / HCS), 0, HNZ - 1);
  for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) HASH[iz * HNX + ix].push(b);
  return b;
}
function queryBoxes(x0, z0, x1, z1, out) {
  out.length = 0; const st = ++World.stamp;
  const ix0 = clamp(Math.floor((x0 - HX0) / HCS), 0, HNX - 1), ix1 = clamp(Math.floor((x1 - HX0) / HCS), 0, HNX - 1);
  const iz0 = clamp(Math.floor((z0 - HZ0) / HCS), 0, HNZ - 1), iz1 = clamp(Math.floor((z1 - HZ0) / HCS), 0, HNZ - 1);
  for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
    const cell = HASH[iz * HNX + ix];
    for (let k = 0; k < cell.length; k++) { const b = cell[k]; if (b.s !== st) { b.s = st; out.push(b); } }
  }
  return out;
}
const _rc = [];
const RAY = { t: 0, tf: 0, box: null, nx: 0, ny: 0, nz: 0 };
function raycast(o, d, maxT, mode, skip) {
  const ox = o.x, oy = o.y, oz = o.z, dx = d.x, dy = d.y, dz = d.z;
  const ex = ox + dx * maxT, ez = oz + dz * maxT;
  queryBoxes(Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez), _rc);
  const ix = 1 / (dx || 1e-12), iy = 1 / (dy || 1e-12), iz = 1 / (dz || 1e-12);
  let best = maxT, hit = null, ax = 0, bestF = 0;
  for (let k = 0; k < _rc.length; k++) {
    const b = _rc[k]; if (!b[mode] || b === skip) continue;
    let tx0 = (b.x0 - ox) * ix, tx1 = (b.x1 - ox) * ix; if (tx0 > tx1) { const t = tx0; tx0 = tx1; tx1 = t; }
    let ty0 = (b.y0 - oy) * iy, ty1 = (b.y1 - oy) * iy; if (ty0 > ty1) { const t = ty0; ty0 = ty1; ty1 = t; }
    let tz0 = (b.z0 - oz) * iz, tz1 = (b.z1 - oz) * iz; if (tz0 > tz1) { const t = tz0; tz0 = tz1; tz1 = t; }
    let tn = tx0, a = 0; if (ty0 > tn) { tn = ty0; a = 1; } if (tz0 > tn) { tn = tz0; a = 2; }
    const tf = Math.min(tx1, ty1, tz1);
    if (tn > tf || tf < 0 || tn >= best || tn < 0) continue;
    best = tn; hit = b; ax = a; bestF = tf;
  }
  if (!hit) return null;
  RAY.t = best; RAY.tf = bestF; RAY.box = hit; RAY.nx = RAY.ny = RAY.nz = 0;
  if (ax === 0) RAY.nx = dx > 0 ? -1 : 1; else if (ax === 1) RAY.ny = dy > 0 ? -1 : 1; else RAY.nz = dz > 0 ? -1 : 1;
  return RAY;
}
const _losD = new THREE.Vector3();
function losClear(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz);
  if (L < 0.01) return true;
  _losD.set(dx / L, dy / L, dz / L);
  return !raycast(a, _losD, L - 0.05, 'sight');
}

/* ---------------- geometry buckets (merged static meshes) ---------------- */
const WHITE = new THREE.Color(1, 1, 1);
class Bucket {
  constructor(mat, o = {}) { this.mat = mat; this.p = []; this.n = []; this.u = []; this.c = o.color ? [] : null; this.i = []; this.cast = o.cast !== false; this.recv = o.recv !== false; this.vc = 0; this.order = o.order || 0; }
  vert(x, y, z, nx, ny, nz, u, v, col) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, v);
    if (this.c) { const c = col || WHITE; this.c.push(c.r, c.g, c.b); }
    return this.vc++;
  }
  quad(a, b, c, d, n, ua, ub, uc, ud, col) {
    const i0 = this.vert(a[0], a[1], a[2], n[0], n[1], n[2], ua[0], ua[1], col);
    const i1 = this.vert(b[0], b[1], b[2], n[0], n[1], n[2], ub[0], ub[1], col);
    const i2 = this.vert(c[0], c[1], c[2], n[0], n[1], n[2], uc[0], uc[1], col);
    const i3 = this.vert(d[0], d[1], d[2], n[0], n[1], n[2], ud[0], ud[1], col);
    this.i.push(i0, i1, i2, i0, i2, i3);
  }
  geom(g, m, col, uvScale) {
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const nm = new THREE.Matrix3().getNormalMatrix(m), v = new THREE.Vector3(), nn = new THREE.Vector3(), base = this.vc;
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(m);
      nn.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize();
      const us = uvScale || 1;
      this.vert(v.x, v.y, v.z, nn.x, nn.y, nn.z, uv ? uv.getX(k) * us : 0, uv ? uv.getY(k) * us : 0, col);
    }
    if (g.index) for (let k = 0; k < g.index.count; k++) this.i.push(base + g.index.getX(k));
    else for (let k = 0; k < pos.count; k++) this.i.push(base + k);
  }
  build(parent) {
    if (!this.vc) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.vc > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.mat);
    m.castShadow = this.cast; m.receiveShadow = this.recv; m.matrixAutoUpdate = false; m.renderOrder = this.order;
    parent.add(m); this.p = this.n = this.u = this.c = this.i = null;
    return m;
  }
}
const BK = {};
const F_PX = 1, F_NX = 2, F_PY = 4, F_NY = 8, F_PZ = 16, F_NZ = 32, F_ALL = 63, F_SIDES = 51, F_NOBOT = 55;
function addBox(key, x0, y0, z0, x1, y1, z1, o = {}) {
  const b = BK[key], s = 1 / (o.uv || 2), f = o.faces === undefined ? F_ALL : o.faces, col = o.color || null, fu = !!o.faceUV;
  const U = (a, c) => [a * s, c * s];
  if (f & F_PX) b.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], fu ? [0, 0] : U(-z1, y0), fu ? [1, 0] : U(-z0, y0), fu ? [1, 1] : U(-z0, y1), fu ? [0, 1] : U(-z1, y1), col);
  if (f & F_NX) b.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], fu ? [0, 0] : U(z0, y0), fu ? [1, 0] : U(z1, y0), fu ? [1, 1] : U(z1, y1), fu ? [0, 1] : U(z0, y1), col);
  if (f & F_PY) b.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], fu ? [0, 0] : U(x0, -z1), fu ? [1, 0] : U(x1, -z1), fu ? [1, 1] : U(x1, -z0), fu ? [0, 1] : U(x0, -z0), col);
  if (f & F_NY) b.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], U(x0, z0), U(x1, z0), U(x1, z1), U(x0, z1), col);
  if (f & F_PZ) b.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], fu ? [0, 0] : U(x0, y0), fu ? [1, 0] : U(x1, y0), fu ? [1, 1] : U(x1, y1), fu ? [0, 1] : U(x0, y1), col);
  if (f & F_NZ) b.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], fu ? [0, 0] : U(-x1, y0), fu ? [1, 0] : U(-x0, y0), fu ? [1, 1] : U(-x0, y1), fu ? [0, 1] : U(-x1, y1), col);
  if (o.col) addCollider(x0, y0, z0, x1, y1, z1, o.col === true ? {} : o.col);
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
function mtx(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz);
  return _m4.compose(_v, _q, _s).clone();
}
function addBoxR(key, cx, cy, cz, w, h, d, rx = 0, ry = 0, rz = 0, col) { BK[key].geom(UNIT_BOX, mtx(cx, cy, cz, rx, ry, rz, w, h, d), col); }
function addCyl(key, x, y, z, rT, rB, h, seg = 12, rx = 0, ry = 0, rz = 0, col, open) {
  const g = new THREE.CylinderGeometry(rT, rB, h, seg, 1, !!open);
  BK[key].geom(g, mtx(x, y, z, rx, ry, rz), col); g.dispose();
}
// beam between two points (square section)
function addBeam(key, a, b, w, col) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
  const m = new THREE.Matrix4(), dir = new THREE.Vector3(dx, dy, dz).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(w, L, w));
  BK[key].geom(UNIT_BOX, m, col);
}
function addDecal(key, cx, cy, cz, rx, ry, rz, ux, uy, uz, w, h, uv) {
  // rx.. = right vector, ux.. = up vector; normal = right x up
  const nx = ry * uz - rz * uy, ny = rz * ux - rx * uz, nz = rx * uy - ry * ux;
  const hw = w / 2, hh = h / 2;
  const P = (sr, su) => [cx + rx * sr * hw + ux * su * hh, cy + ry * sr * hw + uy * su * hh, cz + rz * sr * hw + uz * su * hh];
  BK[key].quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), [nx, ny, nz], [uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]);
}

/* ---------------- materials ---------------- */
const MAT = {};
function makeMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const V2 = (a) => new THREE.Vector2(a, a);
  MAT.ground = std({ map: Tex.concrete.map, normalMap: Tex.concrete.normal, normalScale: V2(0.7), color: C(0xc9c4b8), roughness: 0.92, metalness: 0 });
  MAT.yard = std({ map: Tex.concrete.map, normalMap: Tex.concrete.normal, normalScale: V2(0.5), color: C(0x9c9a98), roughness: 0.95 });
  MAT.quaywall = std({ map: Tex.concrete.map, normalMap: Tex.concrete.normal, color: C(0x8a857a), roughness: 0.96 });
  MAT.deck = std({ map: Tex.deck.map, normalMap: Tex.deck.normal, normalScale: V2(0.8), roughness: 0.62, metalness: 0.25 });
  MAT.hull = std({ map: Tex.hull, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
  MAT.white = std({ map: Tex.metal.map, normalMap: Tex.metal.normal, normalScale: V2(0.35), color: C(0xe4e1d7), roughness: 0.5, metalness: 0.12 });
  MAT.interior = std({ map: Tex.metal.map, color: C(0xc9c2ae), roughness: 0.75 });
  MAT.dark = std({ map: Tex.metal.map, color: C(0x3a4148), roughness: 0.55, metalness: 0.5 });
  MAT.steel = std({ map: Tex.metal.map, normalMap: Tex.metal.normal, color: C(0x6d747b), roughness: 0.42, metalness: 0.75 });
  MAT.crane = std({ map: Tex.metal.map, normalMap: Tex.metal.normal, normalScale: V2(0.4), color: C(0xc3582a), roughness: 0.55, metalness: 0.28 });
  MAT.craneW = std({ map: Tex.metal.map, color: C(0xdcd8cc), roughness: 0.5, metalness: 0.25 });
  MAT.yellow = std({ map: Tex.metal.map, color: C(0xd9a31f), roughness: 0.55, metalness: 0.2 });
  MAT.green = std({ map: Tex.metal.map, color: C(0x4c6a50), roughness: 0.55, metalness: 0.25 });
  MAT.funnel = std({ map: Tex.metal.map, color: C(0x1f3c63), roughness: 0.45, metalness: 0.3 });
  MAT.redpaint = std({ map: Tex.metal.map, color: C(0xa8352b), roughness: 0.5, metalness: 0.2 });
  MAT.orange = std({ map: Tex.metal.map, color: C(0xe8691f), roughness: 0.45, metalness: 0.05 });
  MAT.cside = std({ map: Tex.cside.map, normalMap: Tex.cside.normal, vertexColors: true, roughness: 0.6, metalness: 0.35 });
  MAT.cend = std({ map: Tex.cend.map, normalMap: Tex.cend.normal, vertexColors: true, roughness: 0.6, metalness: 0.35 });
  MAT.logo = std({ map: Tex.logos, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, roughness: 0.6, metalness: 0.2 });
  MAT.wood = std({ map: Tex.wood, roughness: 0.85 });
  MAT.rubber = std({ color: C(0x1c1d1f), roughness: 0.9 });
  MAT.glass = std({ map: Tex.windows, roughness: 0.1, metalness: 0.6, envMapIntensity: 1.4 });
  MAT.porthole = std({ map: Tex.porthole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, roughness: 0.15, metalness: 0.5 });
  MAT.lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 2.0) });
  MAT.lampR = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.3, 0.2) });
  MAT.lampG = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 6, 0.8) });
  MAT.lampW = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 5) });
  MAT.screen = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.8, 1.1) });
  MAT.rope = std({ color: C(0x9a8a66), roughness: 0.9 });
  MAT.fence = std({ map: Tex.fence, alphaTest: 0.45, side: THREE.DoubleSide, color: C(0xb5baba), roughness: 0.45, metalness: 0.6 });
  const paint = (hex) => std({ map: Tex.paint, color: C(hex), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, roughness: 0.75 });
  MAT.paintY = paint(0xe0ae2a); MAT.paintW = paint(0xe9e6de);
  const txt = (t) => std({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, roughness: 0.55, metalness: 0.1 });
  MAT.shipName = txt(Tex.shipName); MAT.shipPort = txt(Tex.shipPort); MAT.warn = txt(Tex.warn); MAT.berth = txt(Tex.berth);
  MAT.bd = new THREE.MeshLambertMaterial({ vertexColors: true });
  MAT.bdC = new THREE.MeshLambertMaterial({ map: Tex.cside.map, vertexColors: true });
  MAT.facade = new THREE.MeshLambertMaterial({ map: Tex.facade.map, color: C(0x6f7884), emissiveMap: Tex.facade.emissive, emissive: new THREE.Color(1.5, 1.15, 0.8), fog: false });
  MAT.glowSprite = new THREE.SpriteMaterial({ map: Tex.soft, color: new THREE.Color(1.0, 0.72, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true });
}
function makeBuckets() {
  const b = (k, m, o) => { BK[k] = new Bucket(MAT[m || k], o); };
  b('ground'); b('yard'); b('quaywall'); b('deck'); b('white'); b('interior'); b('dark'); b('steel'); b('crane'); b('craneW'); b('yellow'); b('green'); b('funnel'); b('redpaint'); b('orange');
  b('cside', null, { color: true }); b('cend', null, { color: true }); b('logo', null, { cast: false, order: 1 });
  b('wood'); b('rubber'); b('glass'); b('porthole', null, { cast: false, order: 1 }); b('rope', null, { cast: true });
  b('lamp', null, { cast: false }); b('lampR', null, { cast: false }); b('lampG', null, { cast: false }); b('lampW', null, { cast: false }); b('screen', null, { cast: false });
  b('fence', null, { cast: false }); b('paintY', null, { cast: false, order: 1 }); b('paintW', null, { cast: false, order: 1 });
  b('shipName', null, { cast: false, order: 1 }); b('shipPort', null, { cast: false, order: 1 }); b('warn', null, { cast: false, order: 1 }); b('berth', null, { cast: false, order: 1 });
  b('bd', null, { color: true, cast: false, recv: false }); b('bdC', null, { color: true, cast: false, recv: false }); b('facade', null, { cast: false, recv: false });
  b('cside2', 'cside', { color: true, cast: false }); b('cend2', 'cend', { color: true, cast: false });
}

/* ---------------- sky / water / lighting ---------------- */
const SUN_DIR = new THREE.Vector3(-0.55, 0.36, 0.75).normalize();
const FOG_COL = new THREE.Color(0.6, 0.5, 0.49);
const SKY_GLSL = `
uniform vec3 sunDir;
vec3 skyCol(vec3 d){
  float h = d.y;
  float sd = max(dot(d, sunDir), 0.0);
  vec2 dh = normalize(d.xz + vec2(1e-5));
  vec2 sh = normalize(sunDir.xz);
  float az = dot(dh, sh) * 0.5 + 0.5;
  vec3 hzWarm = vec3(1.0, 0.5, 0.27);
  vec3 hzCool = vec3(0.44, 0.42, 0.55);
  vec3 hz = mix(hzCool, hzWarm, pow(az, 2.4));
  vec3 zen = vec3(0.07, 0.125, 0.26);
  float t = pow(clamp(h, 0.0, 1.0), 0.5);
  vec3 c = mix(hz, zen, t);
  c += vec3(1.0, 0.52, 0.22) * pow(sd, 6.0) * 0.55;
  c += vec3(1.0, 0.76, 0.48) * pow(sd, 48.0) * 1.1;
  if (h < 0.0) c = mix(hz * 0.85, vec3(0.14, 0.13, 0.13), clamp(-h * 5.0, 0.0, 1.0));
  return c;
}
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y); }
float cfbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
`;
function makeSkyMaterial(forEnv) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: SUN_DIR }, time: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: SKY_GLSL + `
uniform float time; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  vec3 col = skyCol(d);
  ${forEnv ? '' : `
  float sd = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.86, 0.66) * smoothstep(0.99955, 0.99975, sd) * 14.0;
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.07) * 0.55 + vec2(time * 0.006, time * 0.0025);
    float c = cfbm(uv * 1.2);
    c = smoothstep(0.5, 0.82, c) * smoothstep(0.0, 0.14, d.y);
    vec3 lit = mix(vec3(0.34, 0.3, 0.38), vec3(1.0, 0.58, 0.36), pow(sd, 2.5) * 0.9 + 0.25 * (1.0 - d.y));
    col = mix(col, lit, c * 0.8);
  }
  `}
  gl_FragColor = vec4(col, 1.0);
  ${forEnv ? '#include <encodings_fragment>' : '#include <tonemapping_fragment>\n#include <encodings_fragment>'}
}`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}
function makeWater() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: SUN_DIR }, time: { value: 0 }, fogCol: { value: FOG_COL }, fogDen: { value: 0.0062 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: SKY_GLSL + `
uniform float time; uniform vec3 fogCol; uniform float fogDen; varying vec3 vW;
vec2 W(float a){ return vec2(cos(a), sin(a)); }
void main(){
  vec2 p = vW.xz; float t = time;
  vec2 g = vec2(0.0);
  g += 0.055 * W(0.3) * cos(dot(W(0.3), p) * 0.55 + t * 1.05);
  g += 0.054 * W(1.25) * cos(dot(W(1.25), p) * 0.9 + t * 1.4);
  g += 0.068 * W(-0.62) * cos(dot(W(-0.62), p) * 1.7 + t * 2.0);
  g += 0.062 * W(2.2) * cos(dot(W(2.2), p) * 3.1 + t * 2.8);
  g += 0.064 * W(-1.9) * cos(dot(W(-1.9), p) * 5.3 + t * 3.7);
  g += 0.05 * W(0.9) * cos(dot(W(0.9), p) * 8.7 + t * 4.9);
  float dist = length(cameraPosition - vW);
  g *= 1.0 - clamp(dist / 450.0, 0.0, 0.85);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = normalize(cameraPosition - vW);
  float ndv = max(dot(n, V), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  vec3 R = reflect(-V, n); R.y = abs(R.y) + 0.01;
  vec3 sky = skyCol(normalize(R));
  vec3 deep = vec3(0.01, 0.03, 0.04);
  vec3 sss = vec3(0.02, 0.075, 0.07) * (0.4 + 0.6 * pow(max(dot(-V, sunDir), 0.0), 2.0));
  vec3 col = mix(deep + sss, sky * 0.9, fres);
  float spec = pow(max(dot(R, sunDir), 0.0), 400.0);
  col += vec3(1.0, 0.72, 0.45) * spec * 7.0;
  float f = 1.0 - exp(-fogDen * fogDen * dist * dist);
  col = mix(col, fogCol, f);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = SEA_Y; m.renderOrder = -1;
  return m;
}
