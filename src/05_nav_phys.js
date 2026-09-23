/* ============================ NAVIGATION ============================ */
const NAV = { cs: 0.5, x0: -50, z0: -28, nx: 200, nz: 112, L: 3, h: null, stair: null, adj: null, cost: null, comp: null };
const NAV_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function buildNav() {
  const { cs, x0, z0, nx, nz, L } = NAV, N = nx * nz * L, r = 0.3, H = 1.7;
  const h = NAV.h = new Float32Array(N).fill(NaN), st = NAV.stair = new Uint8Array(N);
  const cand = [];
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const cx = x0 + (ix + 0.5) * cs, cz = z0 + (iz + 0.5) * cs;
    queryBoxes(cx - r, cz - r, cx + r, cz + r, cand);
    const tops = [];
    for (const b of cand) {
      if (!b.walk || b.x0 > cx || b.x1 < cx || b.z0 > cz || b.z1 < cz) continue;
      const t = tops.find((q) => Math.abs(q.y - b.y1) < 0.05);
      if (t) { if (b.stair) t.stair = true; } else tops.push({ y: b.y1, stair: b.stair });
    }
    tops.sort((a, b) => a.y - b.y);
    let l = 0;
    for (const t of tops) {
      if (l >= L) break;
      let ok = true;
      for (const b of cand) {
        if (!b.move) continue;
        if (b.x1 <= cx - r || b.x0 >= cx + r || b.z1 <= cz - r || b.z0 >= cz + r) continue;
        if (b.y1 <= t.y + 0.5 || b.y0 >= t.y + H) continue;
        ok = false; break;
      }
      // the column under the floor must actually be topped here (not inside a thicker solid)
      if (ok) {
        for (const b of cand) {
          if (!b.move || b.x0 > cx || b.x1 < cx || b.z0 > cz || b.z1 < cz) continue;
          if (b.y0 < t.y - 0.01 && b.y1 > t.y + 0.01) { ok = false; break; }
        }
      }
      if (ok) { const n = (iz * nx + ix) * L + l; h[n] = t.y; st[n] = t.stair ? 1 : 0; l++; }
    }
  }
  // adjacency
  const adj = NAV.adj = new Int32Array(N * 8).fill(-1);
  const layerNear = (c, y, s) => {
    let best = -1, bd = 1e9;
    for (let l = 0; l < L; l++) { const v = h[c * L + l]; if (v !== v) continue; const d = Math.abs(v - y); const tol = (s || st[c * L + l]) ? 0.72 : 0.5; if (d <= tol && d < bd) { bd = d; best = c * L + l; } }
    return best;
  };
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const c = iz * nx + ix;
    for (let l = 0; l < L; l++) {
      const n = c * L + l, y = h[n]; if (y !== y) continue;
      for (let k = 0; k < 8; k++) {
        const jx = ix + NAV_DIRS[k][0], jz = iz + NAV_DIRS[k][1];
        if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue;
        const m = layerNear(jz * nx + jx, y, st[n]); if (m < 0) continue;
        if (k >= 4) { if (st[n] || st[m]) continue; if (layerNear(iz * nx + jx, y, 0) < 0 || layerNear(jz * nx + ix, y, 0) < 0) continue; }
        adj[n * 8 + k] = m;
      }
    }
  }
  // wall proximity cost
  const cost = NAV.cost = new Uint8Array(N);
  for (let n = 0; n < N; n++) { if (h[n] !== h[n]) continue; let miss = 0; for (let k = 0; k < 8; k++) if (adj[n * 8 + k] < 0) miss++; cost[n] = miss > 0 ? (miss > 3 ? 3 : 2) : 0; }
  // components
  const comp = NAV.comp = new Int32Array(N).fill(-1); let cid = 0; const q = new Int32Array(N);
  for (let n = 0; n < N; n++) {
    if (h[n] !== h[n] || comp[n] >= 0) continue;
    let qh = 0, qt = 0; q[qt++] = n; comp[n] = cid;
    while (qh < qt) { const a = q[qh++]; for (let k = 0; k < 8; k++) { const b = adj[a * 8 + k]; if (b >= 0 && comp[b] < 0) { comp[b] = cid; q[qt++] = b; } } }
    cid++;
  }
  // search buffers
  NAV.g = new Float32Array(N); NAV.came = new Int32Array(N); NAV.seen = new Uint32Array(N); NAV.closed = new Uint32Array(N); NAV.gen = 1;
  NAV.heap = new Int32Array(N); NAV.hf = new Float32Array(N);
  // main component = the one containing the quay centre
  NAV.main = comp[navNode(0, 0, 0)];
  for (const hs of MAP.hotspots) hs.node = navNode(hs.x, hs.y, hs.z);
}
function navNode(x, y, z, search = 3) {
  const { cs, x0, z0, nx, nz, L, h } = NAV;
  const ix0 = Math.floor((x - x0) / cs), iz0 = Math.floor((z - z0) / cs);
  let best = -1, bd = 1e9;
  for (let rr = 0; rr <= search; rr++) {
    for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== rr) continue;
      const ix = ix0 + dx, iz = iz0 + dz; if (ix < 0 || iz < 0 || ix >= nx || iz >= nz) continue;
      const c = iz * nx + ix;
      for (let l = 0; l < L; l++) { const v = h[c * L + l]; if (v !== v) continue; const d = Math.abs(v - y) + rr * 0.6; if (Math.abs(v - y) < 1.3 && d < bd) { bd = d; best = c * L + l; } }
    }
    if (best >= 0) return best;
  }
  return -1;
}
function navPos(n, out) { const c = Math.floor(n / NAV.L), ix = c % NAV.nx, iz = Math.floor(c / NAV.nx); out.x = NAV.x0 + (ix + 0.5) * NAV.cs; out.z = NAV.z0 + (iz + 0.5) * NAV.cs; out.y = NAV.h[n]; return out; }
function heapPush(n, f) {
  const H = NAV.heap, F = NAV.hf; let i = NAV.hn++;
  while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= f) break; H[i] = H[p]; F[i] = F[p]; i = p; }
  H[i] = n; F[i] = f;
}
function heapPop() {
  const H = NAV.heap, F = NAV.hf, top = H[0], n = --NAV.hn;
  if (n > 0) {
    const ln = H[n], lf = F[n]; let i = 0;
    while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && F[c + 1] < F[c]) c++; if (F[c] >= lf) break; H[i] = H[c]; F[i] = F[c]; i = c; }
    H[i] = ln; F[i] = lf;
  }
  return top;
}
function findPath(sx, sy, sz, gx, gy, gz) {
  const s = navNode(sx, sy, sz), g = navNode(gx, gy, gz);
  if (s < 0 || g < 0 || NAV.comp[s] !== NAV.comp[g]) return null;
  const gen = ++NAV.gen, G = NAV.g, came = NAV.came, seen = NAV.seen, closed = NAV.closed, adj = NAV.adj, cost = NAV.cost, Hh = NAV.h, L = NAV.L, nx = NAV.nx;
  const gc = Math.floor(g / L), gix = gc % nx, giz = Math.floor(gc / nx), gy2 = Hh[g];
  const heur = (n) => { const c = Math.floor(n / L), dx = Math.abs(c % nx - gix), dz = Math.abs(Math.floor(c / nx) - giz); return (Math.max(dx, dz) + 0.414 * Math.min(dx, dz)) + Math.abs(Hh[n] - gy2); };
  NAV.hn = 0; G[s] = 0; seen[s] = gen; came[s] = -1; heapPush(s, heur(s));
  let iter = 0, found = false;
  while (NAV.hn > 0 && iter++ < 26000) {
    const n = heapPop();
    if (closed[n] === gen) continue; closed[n] = gen;
    if (n === g) { found = true; break; }
    const gn = G[n];
    for (let k = 0; k < 8; k++) {
      const m = adj[n * 8 + k]; if (m < 0 || closed[m] === gen) continue;
      const ng = gn + (k < 4 ? 1 : 1.414) + cost[m] * 0.35 + Math.abs(Hh[m] - Hh[n]) * 0.5;
      if (seen[m] !== gen || ng < G[m]) { seen[m] = gen; G[m] = ng; came[m] = n; heapPush(m, ng + heur(m) * 1.05); }
    }
  }
  if (!found) return null;
  const raw = []; let n = g;
  while (n >= 0) { raw.push(n); n = came[n]; }
  raw.reverse();
  const pts = raw.map((k) => navPos(k, { x: 0, y: 0, z: 0 }));
  // string pulling
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) {
    let j = Math.min(pts.length - 1, i + 28);
    while (j > i + 1 && !navLineOK(pts[i], pts[j])) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}
function navLineOK(a, b) {
  const { cs, x0, z0, nx, nz, L, h, stair, cost } = NAV;
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.2);
  let y = a.y;
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    const ix = Math.floor((x - x0) / cs), iz = Math.floor((z - z0) / cs);
    if (ix < 0 || iz < 0 || ix >= nx || iz >= nz) return false;
    const c = iz * nx + ix; let best = NaN, bd = 1e9, bs = 0, bn = -1;
    for (let l = 0; l < L; l++) { const v = h[c * L + l]; if (v !== v) continue; const dd = Math.abs(v - y); if (dd < bd) { bd = dd; best = v; bs = stair[c * L + l]; bn = c * L + l; } }
    if (best !== best || bd > (bs ? 0.72 : 0.5) || cost[bn] >= 3) return false;
    y = best;
  }
  return Math.abs(y - b.y) < 0.8;
}

/* ============================ CHARACTER PHYSICS ============================ */
const PHYS = { g: 21, step: 0.46 };
const _pc = [];
function overlapAt(x, y, z, r, h) {
  for (let k = 0; k < _pc.length; k++) {
    const b = _pc[k]; if (!b.move) continue;
    if (b.x1 <= x - r || b.x0 >= x + r || b.z1 <= z - r || b.z0 >= z + r || b.y1 <= y + 0.002 || b.y0 >= y + h - 0.002) continue;
    return true;
  }
  return false;
}
function canStand(e) {
  queryBoxes(e.pos.x - 1, e.pos.z - 1, e.pos.x + 1, e.pos.z + 1, _pc);
  return !overlapAt(e.pos.x, e.pos.y, e.pos.z, e.r, 1.8);
}
function moveAxis(e, axis, d) {
  if (d === 0) return;
  const p = e.pos, r = e.r, h = e.h;
  const nx = axis === 0 ? p.x + d : p.x, nz = axis === 2 ? p.z + d : p.z;
  let any = false, canStep = e.onGround || e.stepGrace > 0, top = -1e9;
  for (let k = 0; k < _pc.length; k++) {
    const b = _pc[k]; if (!b.move) continue;
    if (b.x1 <= nx - r || b.x0 >= nx + r || b.z1 <= nz - r || b.z0 >= nz + r || b.y1 <= p.y + 0.002 || b.y0 >= p.y + h - 0.002) continue;
    any = true; if (b.y1 - p.y > PHYS.step) canStep = false; if (b.y1 > top) top = b.y1;
  }
  if (!any) { p.x = nx; p.z = nz; return; }
  if (canStep && !overlapAt(nx, top + 0.003, nz, r, h)) {
    e.stepOff += top + 0.003 - p.y; p.x = nx; p.z = nz; p.y = top + 0.003; if (e.vel.y < 0) e.vel.y = 0; e.onGround = true; return;
  }
  let lim = axis === 0 ? nx : nz;
  for (let k = 0; k < _pc.length; k++) {
    const b = _pc[k]; if (!b.move) continue;
    if (b.x1 <= nx - r || b.x0 >= nx + r || b.z1 <= nz - r || b.z0 >= nz + r || b.y1 <= p.y + 0.002 || b.y0 >= p.y + h - 0.002) continue;
    if (axis === 0) lim = d > 0 ? Math.min(lim, b.x0 - r - 0.001) : Math.max(lim, b.x1 + r + 0.001);
    else lim = d > 0 ? Math.min(lim, b.z0 - r - 0.001) : Math.max(lim, b.z1 + r + 0.001);
  }
  if (axis === 0) { if ((d > 0 && lim > p.x) || (d < 0 && lim < p.x)) p.x = lim; e.vel.x = 0; }
  else { if ((d > 0 && lim > p.z) || (d < 0 && lim < p.z)) p.z = lim; e.vel.z = 0; }
  e.blocked = true;
}
// returns landing speed (positive) if landed this step
function physStep(e, dt) {
  const p = e.pos, v = e.vel, r = e.r;
  const m = Math.max(Math.abs(v.x), Math.abs(v.z)) * dt + r + 0.6;
  queryBoxes(p.x - m, p.z - m, p.x + m, p.z + m, _pc);
  const wasGround = e.onGround;
  e.blocked = false;
  moveAxis(e, 0, v.x * dt);
  moveAxis(e, 2, v.z * dt);
  let landed = 0;
  v.y -= PHYS.g * dt;
  if (v.y < -40) v.y = -40;
  const ny = p.y + v.y * dt;
  if (v.y <= 0) {
    let top = -1e9;
    for (let k = 0; k < _pc.length; k++) {
      const b = _pc[k]; if (!b.move) continue;
      if (b.x1 <= p.x - r || b.x0 >= p.x + r || b.z1 <= p.z - r || b.z0 >= p.z + r) continue;
      if (b.y1 <= p.y + 0.004 && b.y1 >= ny - 0.001 && b.y1 > top) top = b.y1;
    }
    if (top > -1e9) { landed = wasGround ? 0 : -v.y; p.y = top; v.y = 0; e.onGround = true; }
    else {
      p.y = ny; e.onGround = false;
      if (wasGround && !e.jumped) { // snap down stairs / small ledges
        let t2 = -1e9;
        for (let k = 0; k < _pc.length; k++) {
          const b = _pc[k]; if (!b.move) continue;
          if (b.x1 <= p.x - r || b.x0 >= p.x + r || b.z1 <= p.z - r || b.z0 >= p.z + r) continue;
          if (b.y1 <= p.y + 0.004 && b.y1 >= p.y - PHYS.step && b.y1 > t2) t2 = b.y1;
        }
        if (t2 > -1e9) { e.stepOff += t2 - p.y; p.y = t2; v.y = 0; e.onGround = true; }
      }
    }
  } else {
    let bot = 1e9;
    for (let k = 0; k < _pc.length; k++) {
      const b = _pc[k]; if (!b.move) continue;
      if (b.x1 <= p.x - r || b.x0 >= p.x + r || b.z1 <= p.z - r || b.z0 >= p.z + r) continue;
      if (b.y0 >= p.y + e.h - 0.004 && b.y0 <= ny + e.h && b.y0 < bot) bot = b.y0;
    }
    if (bot < 1e9) { p.y = bot - e.h - 0.002; v.y = 0; } else p.y = ny;
    e.onGround = false;
  }
  if (e.onGround) { e.stepGrace = 0.12; e.jumped = false; } else e.stepGrace -= dt;
  return landed;
}
function moveCharacter(e, dt) {
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const sd = dt / n; let land = 0;
  for (let i = 0; i < n; i++) land = Math.max(land, physStep(e, sd));
  return land;
}
// soft separation between characters
function separateCharacters(list) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i]; if (!a.alive) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]; if (!b.alive) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz, min = a.r + b.r;
      if (d2 >= min * min || Math.abs(a.pos.y - b.pos.y) > 1.6) continue;
      const d = Math.sqrt(d2) || 0.01, push = (min - d) * 0.5, ux = dx / d, uz = dz / d;
      for (const [c, s] of [[a, -1], [b, 1]]) {
        queryBoxes(c.pos.x - 1, c.pos.z - 1, c.pos.x + 1, c.pos.z + 1, _pc);
        const sv = c.vel.x, svz = c.vel.z; const og = c.onGround;
        moveAxis(c, 0, ux * push * s); moveAxis(c, 2, uz * push * s);
        c.vel.x = sv; c.vel.z = svz; c.onGround = og;
      }
    }
  }
}
