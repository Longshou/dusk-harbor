/* ============================ RENDERER / SCENE ============================ */
const FOG_DEN = 0.0042;
let renderer = null, scene = null, camera = null, sun = null, hemi = null, sky = null, water = null;
const app = $('app');
let GT = 0, frameN = 0, lastTS = 0;
function qualityPR() { const q = Settings.quality; return Math.min(window.devicePixelRatio || 1, q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 1) * DynRes.k; }
const DynRes = { k: 1, acc: 0, n: 0, cool: 3 };
function updateDynRes(dt) {
  if (Game.state !== 'playing' && Game.state !== 'menu') return;
  DynRes.acc += dt; DynRes.n++; DynRes.cool -= dt;
  if (DynRes.acc < 2) return;
  const ft = DynRes.acc / DynRes.n; DynRes.acc = 0; DynRes.n = 0;
  if (DynRes.cool > 0) return;
  let k = DynRes.k;
  if (ft > 0.024) k = Math.max(0.55, k - 0.12); else if (ft < 0.0145 && k < 1) k = Math.min(1, k + 0.06);
  if (k !== DynRes.k) { DynRes.k = k; renderer.setPixelRatio(qualityPR()); onResize(); DynRes.cool = 1.5; }
}
function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(qualityPR());
  renderer.setSize(app.clientWidth || innerWidth, app.clientHeight || innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = Settings.quality !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  renderer.domElement.className = 'gl';
  app.insertBefore(renderer.domElement, app.firstChild);
  MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, (app.clientWidth || innerWidth) / (app.clientHeight || innerHeight), 0.05, 3000);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
}
function setupEnvironment() {
  scene.fog = new THREE.FogExp2(0xffffff, FOG_DEN); scene.fog.color.copy(FOG_COL);
  sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 40, 20), makeSkyMaterial(false));
  const f = FOG_COL, fc = `vec3(${f.r.toFixed(3)}, ${f.g.toFixed(3)}, ${f.b.toFixed(3)})`;
  sky.material.fragmentShader = sky.material.fragmentShader.replace('gl_FragColor = vec4(col, 1.0);',
    `col = mix(col, ${fc}, (1.0 - smoothstep(-0.02, 0.1, d.y)) * 0.78);\n  gl_FragColor = vec4(col, 1.0);`);
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  water = makeWater(); water.material.uniforms.fogDen.value = FOG_DEN; scene.add(water);
  // environment reflections from the sky
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), makeSkyMaterial(true)));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, 0.02, 0.1, 500).texture;
  pm.dispose();
  sun = new THREE.DirectionalLight(C(0xffc493), 2.6);
  sun.castShadow = true;
  const sm = Settings.quality === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera; sc.left = -48; sc.right = 48; sc.top = 48; sc.bottom = -48; sc.near = 1; sc.far = 420;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035;
  scene.add(sun); scene.add(sun.target);
  hemi = new THREE.HemisphereLight(C(0x9fb4d8), C(0x6b5846), 0.6); scene.add(hemi);
  // distant glows stay visible through the haze
  scene.traverse((o) => { if (o.isSprite && o.position.length() > 220) { o.material.fog = false; o.material.opacity *= 0.8; } });
  for (const l of MAP.lights) l.visible = Settings.quality !== 'low';
}
function updateSun() {
  const c = Game.state === 'playing' && Game.player ? Game.player.pos : camera.position;
  const texel = 96 / sun.shadow.mapSize.x;
  const cx = Math.round(c.x / texel) * texel, cz = Math.round(c.z / texel) * texel;
  sun.target.position.set(cx, 0, cz);
  sun.position.set(cx + SUN_DIR.x * 200, SUN_DIR.y * 200, cz + SUN_DIR.z * 200);
  sun.target.updateMatrixWorld();
}
function applyQuality() {
  if (!renderer) return;
  renderer.setPixelRatio(qualityPR());
  const shadows = Settings.quality !== 'low';
  if (renderer.shadowMap.enabled !== shadows) {
    renderer.shadowMap.enabled = shadows;
    scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
  }
  const sm = Settings.quality === 'high' ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== sm) { sun.shadow.mapSize.set(sm, sm); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  for (const l of MAP.lights) l.visible = Settings.quality !== 'low';
  onResize();
}
function onResize() {
  if (!renderer) return;
  const w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (VM.cam) { VM.cam.aspect = w / h; VM.cam.updateProjectionMatrix(); }
}

/* ============================ MATCH ============================ */
const RESPAWN = 4.0;
const LIMITS = { 3: 30, 5: 50, 6: 60, 8: 75 };
const WNAME = { rifle: 'VX-7 突击步枪', sniper: 'LR-338 狙击枪', pistol: 'P9 手枪', knife: '战术刀', nade: 'FRAG-12 破片手雷', water: '海水', fall: '坠落' };
const Game = {
  state: 'loading', player: null, bots: [], all: [], time: 0, sounds: [], freeze: 0, freezeEnd: -10,
  score: { blue: 0, red: 0 }, limit: 50, timeLeft: 480, firstBlood: false, over: false, multi: { n: 0, t: -10 },
  noise(pos, r, owner, type) { this.sounds.push({ pos: V3(pos.x, pos.y, pos.z), r, owner, team: owner ? owner.team : null, t: this.time, type }); },
};
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickSpawn(team) {
  const list = MAP.spawns[team]; let best = list[0], bestS = -1e9;
  const eye = V3(), sp = V3();
  for (const s of list) {
    let minD = 1e9, seen = false, occupied = false;
    sp.set(s.x, s.y + 1.6, s.z);
    for (const e of Game.all) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - s.x, e.pos.z - s.z);
      if (e.team !== team) { if (d < minD) minD = d; if (!seen && d < 55 && losClear(sp, e.eyePos(eye))) seen = true; }
      if (d < 1.4) occupied = true;
    }
    const sc = Math.min(minD, 60) + Math.random() * 14 - (seen ? 60 : 0) - (occupied ? 100 : 0);
    if (sc > bestS) { bestS = sc; best = s; }
  }
  return best;
}
function spawnCombatant(c) {
  const s = pickSpawn(c.team);
  c.pos.set(s.x + rand(-0.7, 0.7), s.y + 0.02, s.z + rand(-0.7, 0.7));
  c.vel.set(0, 0, 0); c.yaw = s.yaw + rand(-0.25, 0.25); c.pitch = 0;
  c.hp = 100; c.alive = true; c.crouching = false; c.crouchK = 0; c.h = 1.8; c.eye = 1.64; c.onGround = false; c.stepOff = 0; c.jumped = false;
  c.spawnProt = c.isPlayer ? 2.5 : 2.0; c.dmgBy.clear(); c.reloadT = 0;
  if (c.isPlayer) {
    arsenalReset(); Cam.deathT = 0; Cam.killer = null; Cam.fov = hfovToV(Settings.fov);
    camera.fov = Cam.fov; camera.updateProjectionMatrix(); Game.multi.n = 0;
    $('respawn').classList.add('hidden'); HUD.dirtyWeapon = true;
  } else c.spawnReset();
}
function applyDamage(t, dmg, att, info = {}) {
  if (!t || !t.alive || Game.over) return;
  if (att && att !== t && att.team === t.team) return;
  if (t.spawnProt > 0 && att && att !== t) return;
  dmg = Math.max(1, Math.round(dmg));
  const before = t.hp;
  t.hp -= dmg; t.lastHurtT = Game.time;
  if (att && att !== t) t.dmgBy.set(att, (t.dmgBy.get(att) || 0) + Math.min(dmg, before));
  if (!t.isPlayer && t.onHurt) t.onHurt(att);
  if (t.isPlayer) HUD.hurt(att, info, dmg);
  if (att && att.isPlayer && t !== att) HUD.hitmark(t.hp <= 0, !!info.head);
  if (t.hp <= 0) killCombatant(t, att, info);
}
function killCombatant(v, k, info) {
  const now = Game.time, P = Game.player;
  v.alive = false; v.hp = 0; v.deaths++; v.respawnAt = now + RESPAWN; v.reloadT = 0;
  if (v.model) v.model.die(info.dir, v.yaw);
  const valid = !!k && k !== v;
  if (valid) {
    k.kills++; if (info.head) k.hs++; k.score += 100 + (info.head ? 25 : 0);
    Game.score[k.team]++;
  } else v.score = Math.max(0, v.score - 50);
  for (const [a, d] of v.dmgBy) if (a !== k && a !== v && a.team !== v.team && d >= 35) { a.assists++; a.score += 40; }
  v.dmgBy.clear();
  HUD.feed(valid ? k : null, v, info);
  if (valid && k.isPlayer) {
    const M = Game.multi; if (now - M.t > 4.5) M.n = 0; M.n++; M.t = now;
    const tags = [];
    let big = M.n >= 5 ? '暴走' : M.n === 4 ? '四杀' : M.n === 3 ? '三杀' : M.n === 2 ? '双杀' : '';
    const special = info.weapon === 'knife' ? '刀杀' : info.weapon === 'nade' ? '雷杀' : info.head ? '爆头' : '';
    if (!big) big = special; else if (special) tags.push(special);
    if (!Game.firstBlood) tags.push('首杀');
    if (k.nemesis === v) tags.push('复仇');
    HUD.center(big, `击败 ${v.name}${tags.length ? '，' + tags.join('，') : ''}`);
  }
  if (valid) { Game.firstBlood = true; v.nemesis = k; }
  if (v.isPlayer) {
    Cam.deathT = 0; Cam.killer = valid ? k : null; Game.multi.n = 0;
    const dist = valid ? Math.round(k.pos.distanceTo(v.pos)) : 0;
    $('rsKiller').textContent = valid ? `被 ${k.name} 击败` : info.weapon === 'water' ? '坠入海中' : info.weapon === 'fall' ? '坠落身亡' : '阵亡';
    $('rsSub').textContent = valid ? `${WNAME[info.weapon] || ''}，${dist} 米${info.head ? '，爆头' : ''}，对方剩余生命 ${Math.max(0, Math.ceil(k.hp))}` : '';
    HUD.loadoutText();
    $('respawn').classList.remove('hidden'); $('scope').classList.add('hidden');
    Arsenal.zoom = 0; Arsenal.ads = 0;
  }
  if (Game.score.blue >= Game.limit || Game.score.red >= Game.limit) endMatch('limit');
}
function cleanupMatch() {
  for (const b of Game.bots) scene.remove(b.model.root);
  Game.bots = []; Game.all = []; Game.player = null;
  for (const n of Nades) scene.remove(n.m);
  Nades.length = 0; FX.clear(); Game.sounds = [];
}
function startMatch() {
  Snd.init();
  cleanupMatch();
  const N = Settings.teamSize, names = shuffle(BOT_NAMES);
  let ni = 0;
  const P = Game.player = new Combatant('blue', '你', true);
  for (let i = 0; i < N - 1; i++) Game.bots.push(new Bot('blue', names[ni++], N >= 5 && i === 0 ? 'sniper' : 'rifle', true));
  for (let i = 0; i < N; i++) Game.bots.push(new Bot('red', names[ni++], N >= 5 && i === 0 ? 'sniper' : 'rifle', false));
  Game.all = [P, ...Game.bots];
  Game.score = { blue: 0, red: 0 }; Game.limit = LIMITS[N] || 50; Game.timeLeft = Settings.matchMinutes * 60;
  Game.time = 0; Game.sounds = []; Game.freeze = 3.0; Game.freezeEnd = 3.0; Game.firstBlood = false; Game.over = false; Game.multi = { n: 0, t: -10 };
  for (const c of Game.all) spawnCombatant(c);
  HUD.reset();
  $('limit').textContent = `先取得 ${Game.limit} 次击杀获胜`;
  for (const id of ['menu', 'end', 'pause', 'respawn']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (Input.touch) { $('touch').classList.remove('hidden'); app.classList.add('touchmode'); }
  Game.state = 'playing';
  updateCamera(0.016);
  if (!Input.touch && !Input.fallback) requestLock();
}
function endMatch(reason) {
  if (Game.over) return;
  Game.over = true; Game.state = 'ended';
  if (document.pointerLockElement) document.exitPointerLock();
  Input.lmb = Input.rmb = false; Input.tFire = false;
  HUD.board(false); HUD.showEnd(reason);
  if (reason === 'time') HUD.set(HUD.el.timer, '00:00');
  $('scope').classList.add('hidden'); $('respawn').classList.add('hidden'); $('touch').classList.add('hidden');
  $('end').classList.remove('hidden');
}
function pauseGame() {
  if (Game.state !== 'playing') return;
  Game.state = 'paused';
  Input.lmb = Input.rmb = false; Input.tFire = false; Input.keys = Object.create(null);
  HUD.board(false); syncUI();
  $('pause').classList.remove('hidden');
  if (Snd.ctx && Snd.ready && Snd.ctx.state === 'running') Snd.ctx.suspend();
}
function resumeGame() {
  $('pause').classList.add('hidden');
  Game.state = 'playing';
  if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume();
  if (!Input.touch && !Input.fallback && !Input.locked) requestLock();
}
function quitToMenu() {
  cleanupMatch();
  Game.state = 'menu';
  if (document.pointerLockElement) document.exitPointerLock();
  for (const id of ['pause', 'end', 'hud', 'respawn', 'board', 'scope', 'touch', 'lockhint']) $(id).classList.add('hidden');
  $('menu').classList.remove('hidden');
  if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume();
  syncUI();
}

/* ============================ UPDATE ============================ */
const _dm = new THREE.Matrix4(), _dq = new THREE.Quaternion(), _dv = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
function updateGame(dt) {
  Game.time += dt;
  const now = Game.time, P = Game.player;
  if (Game.freeze > 0) { Game.freeze -= dt; Input.lmb = false; Input.tFire = false; if (Game.freeze <= 0) Game.freezeEnd = now; }
  else { Game.timeLeft -= dt; if (Game.timeLeft <= 0) { Game.timeLeft = 0; endMatch('time'); return; } }
  if (Game.sounds.length) Game.sounds = Game.sounds.filter((s) => now - s.t < 1.0);
  if (P.alive) updatePlayer(dt, now); else updateDeathCam(dt);
  for (const b of Game.bots) b.update(dt, now);
  separateCharacters(Game.all);
  updateNades(dt);
  if (Game.state !== 'playing') return;
  for (const c of Game.all) if (!c.alive && now >= c.respawnAt) spawnCombatant(c);
  if (P.alive) { updateCamera(dt); updateVM(dt, now); }
  HUD.update(dt, now);
}
function updateDeathCam(dt) {
  const P = Game.player; Cam.deathT += dt;
  const e = 1 - Math.pow(1 - Math.min(1, Cam.deathT / 1.4), 3);
  const base = P.pos.y + P.eye;
  let rise = 1.7 * e;
  const up = raycast(_dv.set(P.pos.x, base, P.pos.z), UPV, 2.2, 'sight');
  if (up) rise = Math.min(rise, Math.max(0, up.t - 0.3));
  camera.position.set(P.pos.x, base + rise, P.pos.z);
  const k = Cam.killer;
  if (k) _dv.set(k.pos.x, k.pos.y + 1.3, k.pos.z);
  else _dv.set(P.pos.x - Math.sin(P.yaw) * 4, P.pos.y - 1, P.pos.z - Math.cos(P.yaw) * 4);
  _dm.lookAt(camera.position, _dv, UPV); _dq.setFromRotationMatrix(_dm);
  camera.quaternion.slerp(_dq, Math.min(1, dt * 2.4));
  const tf = hfovToV(Math.max(50, Settings.fov - 20));
  Cam.fov += (tf - Cam.fov) * Math.min(1, dt * 2); camera.fov = Cam.fov; camera.updateProjectionMatrix();
  HUD.update(dt, Game.time);
}
function updateMenuCam() {
  const t = 0.35 + GT * 0.028, c = Math.cos(t);
  camera.position.set(Math.sin(t) * 62, 10 + (1 - Math.max(0, c)) * 10 + Math.sin(t * 1.3) * 1.5, 10 + c * 46);
  camera.lookAt(Math.sin(t + 0.5) * 12, 7, 10);
  if (camera.fov !== 52) { camera.fov = 52; camera.updateProjectionMatrix(); }
}
function updateWorldAnim(dt) {
  sky.material.uniforms.time.value = GT; water.material.uniforms.time.value = GT;
  sky.position.copy(camera.position);
  const A = MAP.anim;
  if (A.radar) A.radar.rotation.y += dt * 2.3;
  if (A.flag && (frameN & 1) === 0) {
    const p = A.flag.geometry.attributes.position, b = A.flagBase;
    for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; p.array[i * 3 + 2] = Math.sin(x * 3.4 - GT * 5.5 + y * 0.9) * 0.13 * (x / 1.6); p.array[i * 3 + 1] = y - x * 0.06 + Math.sin(x * 2 - GT * 3) * 0.02; }
    p.needsUpdate = true; if ((frameN & 7) === 0) A.flag.geometry.computeVertexNormals();
  }
  if (A.buoys) for (const b of A.buoys) { b.g.position.y = SEA_Y + Math.sin(GT * 1.1 + b.ph) * 0.12; b.g.rotation.z = Math.sin(GT * 0.8 + b.ph) * 0.07; b.sprite.visible = ((GT + b.ph) % 3.2) < 0.45; }
  if (A.lighthouse) A.lighthouse.material.opacity = ((GT % 6) < 0.6) ? 1 : 0.18;
}
function render() {
  renderer.clear();
  renderer.render(scene, camera);
  if (Game.state !== 'menu' && Game.player && Game.player.alive && VM.cur) { renderer.clearDepth(); renderer.render(VM.scene, VM.cam); }
}
function frame(ts) {
  requestAnimationFrame(frame);
  let dt = (ts - lastTS) / 1000; lastTS = ts;
  if (!(dt > 0)) dt = 0.016; if (dt > 0.05) dt = 0.05;
  frameN++;
  const st = Game.state;
  if (st !== 'paused') GT += dt;
  if (st === 'playing') updateGame(dt);
  else if (st === 'menu') updateMenuCam();
  if (st !== 'paused') { updateWorldAnim(dt); FX.update(dt, camera); Snd.update(dt); }
  Snd.updateListener(camera);
  updateSun();
  render();
  HUD.tick(dt);
  updateDynRes(dt);
  Input.pressed.clear(); Input.mdx = 0; Input.mdy = 0;
}

/* ============================ HUD ============================ */
const ICONS = {
  rifle: '<svg viewBox="0 0 34 14"><path d="M1 6h5l1-2h13V3h3v1h8v2h-8v1h-6l-1 1h-2l-1 4h-3l1-4H8l-2 3H3l1-3H1z"/></svg>',
  sniper: '<svg viewBox="0 0 34 14"><path d="M0 7h6l1-2h5V3h7v2h15v1.6H19v1h-5l-1 4h-3l1-4H7l-2 3H2l1-3H0z"/></svg>',
  pistol: '<svg viewBox="0 0 34 14"><path d="M9 3h15v4h-8l-1 1h-2l-1 5H9l1-5-1-1z"/></svg>',
  knife: '<svg viewBox="0 0 34 14"><path d="M3 6h8l1-1h2v1h16l-3 3H14v1h-2l-1-1H3z"/></svg>',
  nade: '<svg viewBox="0 0 34 14"><circle cx="17" cy="8" r="5"/><path d="M18 1h5v2h-5z"/></svg>',
  water: '<svg viewBox="0 0 34 14"><path d="M4 7c3-3 5-3 8 0s5 3 8 0 5-3 8 0v3c-3-3-5-3-8 0s-5 3-8 0-5-3-8 0z"/></svg>',
  fall: '<svg viewBox="0 0 34 14"><path d="M15 1h4v7h4l-6 6-6-6h4z"/></svg>',
  head: '<svg class="hs" viewBox="0 0 14 14"><path fill-rule="evenodd" d="M7 1a6 6 0 1 1 0 12A6 6 0 0 1 7 1zm0 2.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zM6 6h2v2H6z"/></svg>',
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const HUD = {
  dirtyAmmo: true, dirtyWeapon: true, dd: [], msgT: 0, hmT: 0, heartT: 0, flashA: 0, gap: 8, aimT: 0, boardT: 0, boardOn: false,
  fpsT: 0, fpsN: 0,
  init() {
    this.el = {};
    for (const id of ['hud', 'radar', 'scB', 'scR', 'pgB', 'pgR', 'timer', 'limit', 'killfeed', 'crosshair', 'hitmarker', 'aimname', 'dmgdirs', 'centermsg', 'banner', 'vitals', 'hpNum', 'hpBar', 'stance', 'ammo', 'magNum', 'resNum', 'wname', 'slots', 'hint', 'spawnprot', 'lowhp', 'flash', 'fps', 'scope', 'respawn', 'rsKiller', 'rsSub', 'rsCd', 'rsLoad', 'board', 'tbB', 'tbR', 'bdB', 'bdR', 'lockhint']) this.el[id] = $(id);
    this.el.flash.style.background = '#b5160c';
    this.rctx = this.el.radar.getContext('2d');
    this.buildRadarBase();
  },
  set(el, s) { if (el._t !== s) { el._t = s; el.textContent = s; } },
  css(el, prop, v) { const k = '_' + prop; if (el[k] !== v) { el[k] = v; el.style[prop] = v; } },
  reset() {
    this.el.killfeed.innerHTML = ''; this.el.dmgdirs.innerHTML = ''; this.dd = [];
    this.el.centermsg.innerHTML = ''; this.msgT = 0; this.hmT = 0; this.flashA = 0; this.dirtyAmmo = this.dirtyWeapon = true;
    this.css(this.el.hitmarker, 'opacity', '0'); this.css(this.el.banner, 'opacity', '0');
  },
  buildRadarBase() {
    const S = 4, W = 112 * S, H = 68 * S, c = makeCanvas(W, H), g = c.getContext('2d');
    const X = (x) => (x + 56) * S, Z = (z) => (z + 34) * S;
    g.fillStyle = '#17394a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#566064'; g.fillRect(X(-56), Z(-34), 112 * S, 42 * S);
    g.fillRect(X(-50), Z(8), 10 * S, 20 * S); g.fillRect(X(38), Z(8), 12 * S, 20 * S);
    g.fillStyle = '#4b5357'; g.fillRect(X(-56), Z(-34), 112 * S, 28.5 * S);
    // hull outline
    g.fillStyle = '#44584a'; g.beginPath(); g.moveTo(X(-32), Z(11));
    for (let x = 24; x <= 34.5; x += 0.5) g.lineTo(X(x), Z(SHIP_Z - hullHB(x, FC_Y)));
    for (let x = 34.5; x >= 24; x -= 0.5) g.lineTo(X(x), Z(SHIP_Z + hullHB(x, FC_Y)));
    g.lineTo(X(-32), Z(25)); g.closePath(); g.fill();
    const list = World.boxes.filter((b) => b.bullet && b.y1 > 0.25 && b.y1 < 30 && b.x1 - b.x0 < 40 && b.y1 - b.y0 > 0.1).sort((a, b) => a.y1 - b.y1);
    for (const b of list) {
      const l = 30 + Math.min(46, b.y1 * 5.2);
      g.fillStyle = b.walk && b.y1 - b.y0 < 0.6 ? `hsl(140, 6%, ${l}%)` : `hsl(205, 9%, ${l}%)`;
      g.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * S, (b.z1 - b.z0) * S);
      g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1; g.strokeRect(X(b.x0) + 0.5, Z(b.z0) + 0.5, (b.x1 - b.x0) * S - 1, (b.z1 - b.z0) * S - 1);
    }
    g.strokeStyle = 'rgba(220,225,225,0.35)'; g.setLineDash([6, 5]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(X(-50), Z(-28)); g.lineTo(X(50), Z(-28)); g.stroke(); g.setLineDash([]);
    this.radarBase = c;
  },
  drawRadar(now) {
    const g = this.rctx, W = 344, P = Game.player, range = 34, s = (W / 2) / range / 4;
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath(); if (g.roundRect) g.roundRect(0, 0, W, W, 24); else g.rect(0, 0, W, W); g.clip();
    g.fillStyle = '#17394a'; g.fillRect(0, 0, W, W);
    g.translate(W / 2, W / 2); g.rotate(P.yaw); g.scale(s, s);
    g.globalAlpha = 0.9; g.drawImage(this.radarBase, -(P.pos.x + 56) * 4, -(P.pos.z + 34) * 4); g.globalAlpha = 1;
    for (const n of Nades) { g.fillStyle = '#ffd166'; g.beginPath(); g.arc((n.p.x - P.pos.x) * 4, (n.p.z - P.pos.z) * 4, 4 / s, 0, TAU); g.fill(); }
    for (const c of Game.all) {
      if (c === P || !c.alive) continue;
      const ally = c.team === P.team;
      if (!ally && !(now - c.lastFire < 1.3 || now - c.spottedT < 1.1)) continue;
      const x = (c.pos.x - P.pos.x) * 4, y = (c.pos.z - P.pos.z) * 4, r = 7 / s;
      g.fillStyle = ally ? '#8cc8ff' : '#ff6b5e';
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      if (Math.abs(c.pos.y - P.pos.y) > 2.2) { g.strokeStyle = '#fff'; g.lineWidth = 2 / s; g.stroke(); }
      if (ally) { g.strokeStyle = '#8cc8ff'; g.lineWidth = 3 / s; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.sin(c.yaw) * r * 2.2, y - Math.cos(c.yaw) * r * 2.2); g.stroke(); }
    }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.moveTo(W / 2, W / 2); g.arc(W / 2, W / 2, W * 0.7, -Math.PI / 2 - 0.62, -Math.PI / 2 + 0.62); g.closePath(); g.fill();
    g.fillStyle = '#f5f1e6'; g.beginPath(); g.moveTo(W / 2, W / 2 - 13); g.lineTo(W / 2 + 9, W / 2 + 9); g.lineTo(W / 2, W / 2 + 4); g.lineTo(W / 2 - 9, W / 2 + 9); g.closePath(); g.fill();
  },
  feed(k, v, info) {
    const row = document.createElement('div');
    row.className = 'kf' + ((k && k.isPlayer) || v.isPlayer ? ' me' : '');
    const nm = (c) => `<span class="${c.team === 'blue' ? 'b' : 'r'}">${esc(c.name)}</span>`;
    row.innerHTML = (k ? nm(k) : '') + (ICONS[info.weapon] || ICONS.rifle) + (info.head ? ICONS.head : '') + nm(v);
    const kf = this.el.killfeed; kf.appendChild(row);
    while (kf.children.length > 5) kf.removeChild(kf.firstChild);
    setTimeout(() => row.remove(), 7000);
  },
  center(big, small) {
    const e = this.el.centermsg;
    e.innerHTML = (big ? `<div class="big">${esc(big)}</div>` : '') + (small ? `<div class="small">${esc(small)}</div>` : '');
    this.msgT = big ? 2.0 : 1.4;
  },
  hitmark(kill, head) {
    const e = this.el.hitmarker; e.className = kill ? 'kill' : head ? 'head' : '';
    this.hmT = kill ? 0.42 : 0.2; e.style.opacity = '1'; Snd.hit(head, kill);
  },
  hurt(att, info, dmg) {
    Snd.hurt(); FX.shake = Math.max(FX.shake, Math.min(0.5, dmg / 120));
    this.flashA = Math.min(0.32, this.flashA + dmg / 260);
    if (att && att !== Game.player) {
      const el = document.createElement('div'); el.className = 'dd'; this.el.dmgdirs.appendChild(el);
      this.dd.push({ el, t: 1.5, x: att.pos.x, z: att.pos.z });
      if (this.dd.length > 6) { const o = this.dd.shift(); o.el.remove(); }
    }
  },
  loadoutText() { this.el.rsLoad.textContent = `下一条命主武器：${Settings.primary === 'sniper' ? 'LR-338 狙击枪' : 'VX-7 突击步枪'}，按 B 切换`; },
  board(on) {
    this.boardOn = on; this.el.board.classList.toggle('hidden', !on);
    if (on) this.fillBoard();
  },
  fillBoard() {
    const rows = (team) => Game.all.filter((c) => c.team === team).sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
      .map((c) => `<tr class="${c.isPlayer ? 'me' : ''}${c.alive ? '' : ' dead'}"><td>${esc(c.name)}${c.role === 'sniper' ? ' <span style="opacity:.6">狙击手</span>' : ''}</td><td class="n">${c.kills}</td><td class="n">${c.deaths}</td><td class="n">${c.hs}</td></tr>`).join('');
    this.el.tbB.innerHTML = rows('blue'); this.el.tbR.innerHTML = rows('red');
    this.el.bdB.textContent = Game.score.blue; this.el.bdR.textContent = Game.score.red;
  },
  showEnd(reason) {
    const P = Game.player, b = Game.score.blue, r = Game.score.red;
    $('endTitle').textContent = b > r ? '胜利' : b < r ? '失败' : '平局';
    $('endSub').textContent = `蓝队 ${b} : ${r} 红队，${reason === 'time' ? '比赛时间到' : '已达到目标击杀数'}`;
    $('esK').textContent = P.kills; $('esD').textContent = P.deaths;
    $('esH').textContent = (P.kills ? Math.round(P.hs / P.kills * 100) : 0) + '%';
    $('esA').textContent = (P.shots ? Math.round(P.hits / P.shots * 100) : 0) + '%';
    const mvp = Game.all.slice().sort((x, y) => y.score - x.score || y.kills - x.kills)[0];
    $('endMvp').textContent = mvp ? `本局最佳：${mvp.name}，${mvp.kills} 次击杀，${mvp.deaths} 次阵亡${mvp.isPlayer ? '。干得漂亮！' : ''}` : '';
  },
  update(dt, now) {
    const E = this.el, P = Game.player, A = Arsenal;
    // score & timer
    this.set(E.scB, String(Game.score.blue)); this.set(E.scR, String(Game.score.red));
    this.css(E.pgB, 'width', Math.min(100, Game.score.blue / Game.limit * 100).toFixed(1) + '%');
    this.css(E.pgR, 'width', Math.min(100, Game.score.red / Game.limit * 100).toFixed(1) + '%');
    const tl = Math.max(0, Math.ceil(Game.timeLeft));
    this.set(E.timer, `${String(Math.floor(tl / 60)).padStart(2, '0')}:${String(tl % 60).padStart(2, '0')}`);
    // countdown banner
    if (Game.freeze > 0) { this.set(E.banner, String(Math.ceil(Game.freeze))); this.css(E.banner, 'opacity', '1'); }
    else if (now - Game.freezeEnd < 0.9) { this.set(E.banner, '开战'); this.css(E.banner, 'opacity', String(1 - (now - Game.freezeEnd) / 0.9)); }
    else this.css(E.banner, 'opacity', '0');
    const W = WPN[A.cur];
    if (P.alive && W) {
      this.set(E.hpNum, String(Math.max(0, Math.ceil(P.hp))));
      this.css(E.hpBar, 'width', clamp(P.hp, 0, 100).toFixed(0) + '%');
      E.vitals.classList.toggle('low', P.hp <= 30);
      this.set(E.stance, P.crouching ? '蹲伏' : kd('ShiftLeft') || kd('ShiftRight') ? '静步' : !P.onGround ? '腾空' : '站立');
      const w = A.w[A.cur], gun = !!w;
      if (gun) { this.set(E.magNum, String(w.mag)); this.set(E.resNum, '/ ' + w.res); }
      else if (A.cur === 'nade') { this.set(E.magNum, String(A.nades)); this.set(E.resNum, '枚'); }
      else { this.set(E.magNum, '—'); this.set(E.resNum, ''); }
      E.ammo.classList.toggle('empty', gun && w.mag === 0);
      if (this.dirtyWeapon || this.dirtyAmmo) {
        this.set(E.wname, W.name);
        const nm = { rifle: 'VX-7', sniper: 'LR-338', pistol: 'P9', knife: '刀', nade: '雷' };
        E.slots.innerHTML = [A.primary, 'pistol', 'knife', 'nade'].map((k, i) => `<div class="${k === A.cur ? 'on' : ''}"><kbd>${i + 1}</kbd>${nm[k]}${k === 'nade' ? ' ×' + A.nades : ''}</div>`).join('');
        this.dirtyWeapon = this.dirtyAmmo = false;
      }
      // hints
      let hint = '';
      if (Game.freeze > 0) hint = '';
      else if (A.state === 'reload') hint = '换弹中';
      else if (gun && w.mag === 0 && w.res === 0) hint = Input.touch ? '弹药耗尽，点「切枪」' : '弹药耗尽，按 2 换手枪';
      else if (gun && w.mag <= Math.ceil(W.mag * 0.25) && w.res > 0) hint = Input.touch ? '点「换弹」装填' : '按 R 换弹';
      this.set(E.hint, hint);
      this.set(E.spawnprot, P.spawnProt > 0 ? `出生保护 ${P.spawnProt.toFixed(1)} 秒` : '');
      // crosshair
      const hs = Math.hypot(P.vel.x, P.vel.z);
      let sp;
      if (W.melee || A.cur === 'nade') sp = 1.0;
      else if (A.cur === 'sniper') sp = W.sHip + hs / 5 * W.sMove;
      else sp = (W.spread + A.bloom) * lerp(1, W.sAds, A.ads) + hs / 5.2 * W.sMove;
      if (!P.onGround && W.sAir) sp += W.sAir;
      if (P.crouchK > 0.5 && W.sCrouch) sp *= W.sCrouch;
      const px = Math.tan(sp * DEG) / Math.tan(camera.fov * DEG / 2) * ((app.clientHeight || innerHeight) / 2);
      this.gap += (clamp(px, 3, 110) - this.gap) * Math.min(1, dt * 18);
      E.crosshair.style.setProperty('--gap', this.gap.toFixed(1) + 'px');
      const hideX = ((A.cur === 'rifle' || A.cur === 'pistol') && A.ads > 0.55) || (A.cur === 'sniper' && A.zoom > 0);
      this.css(E.crosshair, 'opacity', hideX ? '0' : '1');
      // aim target
      this.aimT -= dt;
      if (this.aimT <= 0) {
        this.aimT = 0.06;
        const o = camera.position, d = camera.getWorldDirection(_dv);
        const wh = raycast(o, d, 140, 'bullet'); let bt = wh ? wh.t : 140, best = null;
        for (const c of Game.all) { if (c === P || !c.alive) continue; const h = rayHitChar(o, d, c, bt); if (h && h.t < bt) { bt = h.t; best = c; } }
        E.crosshair.classList.toggle('enemy', !!best && best.team !== P.team);
        E.crosshair.classList.toggle('ally', !!best && best.team === P.team);
        if (best && bt < 70) { this.set(E.aimname, best.name); E.aimname.style.color = best.team === P.team ? '#8cc8ff' : '#ff8f84'; } else this.set(E.aimname, '');
      }
      // scope
      const scoped = A.cur === 'sniper' && A.zoom > 0 && A.ads > 0.85;
      E.scope.classList.toggle('hidden', !scoped);
      // low hp
      this.css(E.lowhp, 'opacity', P.hp < 40 ? ((40 - P.hp) / 40 * 0.9).toFixed(2) : '0');
      if (P.hp <= 25) { this.heartT -= dt; if (this.heartT <= 0) { this.heartT = 0.9; Snd.heart(); } }
    } else {
      this.css(E.crosshair, 'opacity', '0'); E.scope.classList.add('hidden'); this.css(E.lowhp, 'opacity', '0'); this.set(E.hint, ''); this.set(E.aimname, ''); this.set(E.spawnprot, '');
      this.set(E.hpNum, '0'); this.css(E.hpBar, 'width', '0%');
      this.set(E.rsCd, String(Math.max(1, Math.ceil(P.respawnAt - now))));
    }
    // damage direction arcs
    for (let i = this.dd.length - 1; i >= 0; i--) {
      const d = this.dd[i]; d.t -= dt;
      if (d.t <= 0) { d.el.remove(); this.dd.splice(i, 1); continue; }
      const dx = d.x - P.pos.x, dz = d.z - P.pos.z, fwd = -Math.sin(P.yaw) * dx - Math.cos(P.yaw) * dz, rt = Math.cos(P.yaw) * dx - Math.sin(P.yaw) * dz;
      d.el.style.transform = `rotate(${(Math.atan2(rt, fwd) / DEG).toFixed(1)}deg)`; d.el.style.opacity = Math.min(1, d.t / 0.8).toFixed(2);
    }
    if ((frameN & 1) === 0) this.drawRadar(now);
    this.boardT -= dt;
    if (this.boardOn && this.boardT <= 0) { this.boardT = 0.5; this.fillBoard(); }
  },
  tick(dt) {
    const E = this.el;
    if (this.hmT > 0) { this.hmT -= dt; if (this.hmT <= 0) E.hitmarker.style.opacity = '0'; }
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) E.centermsg.innerHTML = ''; }
    this.flashA *= Math.exp(-dt * 5); this.css(E.flash, 'opacity', this.flashA.toFixed(3));
    const lockNeeded = Game.state === 'playing' && !Input.locked && !Input.fallback && !Input.touch;
    E.lockhint.classList.toggle('hidden', !lockNeeded);
    this.fpsT += dt; this.fpsN++;
    if (this.fpsT >= 0.5) { this.set(E.fps, Math.round(this.fpsN / this.fpsT) + ' FPS'); this.fpsT = 0; this.fpsN = 0; }
  },
};

/* ============================ INPUT BINDINGS ============================ */
Input.touch = IS_TOUCH; Input.everLocked = false;
function requestLock() {
  const el = renderer.domElement;
  if (!el.requestPointerLock) { enableFallback(); return; }
  try {
    const p = el.requestPointerLock();
    if (p && p.catch) p.catch(() => onLockError());
  } catch (e) { onLockError(); }
}
function onLockError() { if (!Input.everLocked) enableFallback(); }
function enableFallback() {
  if (Input.fallback) return;
  Input.fallback = true; renderer.domElement.style.cursor = 'none';
  if (Game.state === 'playing') HUD.center('', '鼠标锁定不可用，已切换兼容模式，Esc 暂停');
}
document.addEventListener('pointerlockchange', () => {
  Input.locked = document.pointerLockElement === renderer.domElement;
  if (Input.locked) Input.everLocked = true;
  else if (Game.state === 'playing' && !Input.fallback && !Input.touch) pauseGame();
});
document.addEventListener('pointerlockerror', () => onLockError());
const GAME_KEYS = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ControlLeft', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyQ', 'KeyR', 'KeyG', 'KeyB', 'Digit1', 'Digit2', 'Digit3', 'Digit4']);
addEventListener('keydown', (e) => {
  const c = e.code;
  if (Game.state === 'playing') {
    if (GAME_KEYS.has(c)) e.preventDefault();
    Input.keys[c] = true;
    if (!e.repeat) Input.pressed.add(c);
    if (c === 'Tab' && !e.repeat) HUD.board(true);
    if (c === 'Escape' && (Input.fallback || Input.touch)) pauseGame();
    if (c === 'KeyB' && !e.repeat && Game.player && !Game.player.alive) { Settings.primary = Settings.primary === 'sniper' ? 'rifle' : 'sniper'; saveSettings(); HUD.loadoutText(); Snd.ui(); }
  } else if (Game.state === 'paused' && c === 'Escape' && (Input.fallback || Input.touch)) resumeGame();
  else if (Game.state === 'ended' && (c === 'Enter' || c === 'Space') && !e.repeat) { e.preventDefault(); startMatch(); }
});
addEventListener('keyup', (e) => { Input.keys[e.code] = false; if (e.code === 'Tab') HUD.board(false); });
addEventListener('blur', () => { Input.keys = Object.create(null); Input.lmb = Input.rmb = false; if (HUD.el) HUD.board(false); });
document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'playing') pauseGame(); });
app.addEventListener('mousedown', (e) => {
  if (Game.state !== 'playing' || Input.touch) return;
  if (e.target !== renderer.domElement && !e.target.closest('#hud') && e.target.id !== 'lockhint' && e.target.id !== 'vignette') return;
  if (!Input.locked && !Input.fallback) { requestLock(); return; }
  if (e.button === 0) { Input.lmb = true; Input.pressed.add('LMB'); }
  if (e.button === 2) { Input.rmb = true; Input.pressed.add('RMB'); }
});
addEventListener('mouseup', (e) => { if (e.button === 0) Input.lmb = false; if (e.button === 2) Input.rmb = false; });
addEventListener('mousemove', (e) => {
  if (Game.state !== 'playing' || Input.touch) return;
  if (!Input.locked && !Input.fallback) return;
  const mx = clamp(e.movementX || 0, -250, 250), my = clamp(e.movementY || 0, -250, 250);
  Input.mdx += mx; Input.mdy += my;
});
addEventListener('wheel', (e) => { if (Game.state === 'playing') Input.pressed.add(e.deltaY > 0 ? 'WheelDown' : 'WheelUp'); }, { passive: true });
addEventListener('contextmenu', (e) => { if (Game.state === 'playing' || e.target === (renderer && renderer.domElement)) e.preventDefault(); });
addEventListener('resize', () => onResize());

function setupTouch() {
  const stick = $('stick'), knob = stick.firstElementChild;
  let stickId = null, sx = 0, sy = 0, lookId = null, lx = 0, ly = 0;
  const K = 1.5;
  const btn = (id, down, up, look) => {
    const el = $(id);
    el.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation(); el.classList.add('on');
      const t = e.changedTouches[0]; el._tid = t.identifier; el._lx = t.clientX; el._ly = t.clientY;
      if (Game.state === 'playing' || id === 'tPause') down();
    }, { passive: false });
    el.addEventListener('touchmove', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!look) return;
      for (const t of e.changedTouches) if (t.identifier === el._tid) { Input.mdx += (t.clientX - el._lx) * K; Input.mdy += (t.clientY - el._ly) * K; el._lx = t.clientX; el._ly = t.clientY; }
    }, { passive: false });
    const end = (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('on'); if (up) up(); };
    el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false });
  };
  btn('tFire', () => { Input.tFire = true; }, () => { Input.tFire = false; }, true);
  btn('tFire2', () => { Input.tFire = true; }, () => { Input.tFire = false; }, false);
  btn('tAim', () => { if (Arsenal.cur === 'sniper') Input.pressed.add('RMB'); else Input.tAim = !Input.tAim; });
  btn('tJump', () => { Input.tJump = true; });
  btn('tCrouch', () => { Input.tCrouch = !Input.tCrouch; $('tCrouch').classList.toggle('on', Input.tCrouch); }, () => { $('tCrouch').classList.toggle('on', Input.tCrouch); });
  btn('tReload', () => Input.pressed.add('KeyR'));
  btn('tSwap', () => { Input.pressed.add('KeyQ'); Input.tAim = false; });
  btn('tNade', () => Input.pressed.add('KeyG'));
  btn('tPause', () => { if (Game.state === 'playing') pauseGame(); });
  app.addEventListener('touchstart', (e) => {
    if (Game.state !== 'playing') return;
    const r = app.getBoundingClientRect();
    for (const t of e.changedTouches) {
      if (t.clientX - r.left < r.width * 0.42 && stickId === null) {
        stickId = t.identifier; sx = t.clientX; sy = t.clientY;
        stick.style.display = 'block'; stick.style.left = (sx - r.left - 60) + 'px'; stick.style.top = (sy - r.top - 60) + 'px';
      } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: true });
  app.addEventListener('touchmove', (e) => {
    if (Game.state === 'playing') e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - sx, dy = t.clientY - sy; const L = Math.hypot(dx, dy), m = 50;
        if (L > m) { dx *= m / L; dy *= m / L; }
        Input.tMove.x = dx / m; Input.tMove.y = dy / m; knob.style.transform = `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px)`;
      } else if (t.identifier === lookId) { Input.mdx += (t.clientX - lx) * K; Input.mdy += (t.clientY - ly) * K; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: false });
  const endT = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; Input.tMove.x = 0; Input.tMove.y = 0; stick.style.display = 'none'; knob.style.transform = ''; }
      if (t.identifier === lookId) lookId = null;
    }
  };
  app.addEventListener('touchend', endT); app.addEventListener('touchcancel', endT);
}

/* ============================ MENUS ============================ */
function syncUI() {
  document.querySelectorAll('.seg').forEach((seg) => {
    const key = seg.dataset.set;
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(String(Settings[key]) === b.dataset.v)));
  });
  document.querySelectorAll('input[data-range]').forEach((inp) => { inp.value = Settings[inp.dataset.range]; });
  document.querySelectorAll('[data-out]').forEach((o) => {
    const k = o.dataset.out, v = Settings[k];
    o.textContent = k === 'volume' ? Math.round(v * 100) + '%' : k === 'fov' ? v + '°' : (+v).toFixed(2);
  });
}
function bindUI() {
  document.querySelectorAll('.seg').forEach((seg) => {
    const key = seg.dataset.set;
    seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      let v = b.dataset.v;
      if (key === 'teamSize' || key === 'matchMinutes') v = +v;
      if (key === 'adsHold') v = v === 'true';
      Settings[key] = v; saveSettings(); syncUI(); Snd.ui();
      if (key === 'quality') applyQuality();
      if (key === 'primary' && Game.player && !Game.player.alive) HUD.loadoutText();
    }));
  });
  document.querySelectorAll('input[data-range]').forEach((inp) => inp.addEventListener('input', () => {
    const k = inp.dataset.range; Settings[k] = +inp.value; saveSettings(); syncUI();
    if (k === 'volume') Snd.setVolume(Settings.volume);
    if (k === 'fov' && Game.player) Cam.fov = hfovToV(Settings.fov);
  }));
  $('btnStart').addEventListener('click', () => startMatch());
  $('btnResume').addEventListener('click', () => resumeGame());
  $('btnQuit').addEventListener('click', () => quitToMenu());
  $('btnAgain').addEventListener('click', () => startMatch());
  $('btnMenu').addEventListener('click', () => quitToMenu());
  $('deviceNote').textContent = IS_TOUCH
    ? '已启用触屏操控：左半屏拖动移动，右半屏拖动转向，按钮开火、瞄准、跳跃和换弹。横屏体验更好。'
    : '点击开始后鼠标会被锁定，按 Esc 暂停。戴耳机能听清脚步和枪声的方位。';
  syncUI();
}

/* ============================ BOOT ============================ */
async function boot() {
  const bar = $('loadbar').firstElementChild, txt = $('loadtxt');
  const prog = (p, t) => { bar.style.width = (p * 100).toFixed(0) + '%'; if (t) txt.textContent = t; };
  try {
    try { initRenderer(); } catch (e) { txt.textContent = '无法启动 3D 渲染，请换用支持 WebGL 的浏览器。'; return; }
    prog(0.03, '正在生成材质'); await nextFrame();
    await genAllTextures((p) => prog(p));
    makeMaterials(); makeBuckets(); makeCharMats();
    prog(0.6, '正在搭建码头'); await nextFrame();
    buildMap(scene);
    prog(0.74, '正在计算寻路网格'); await nextFrame();
    buildNav();
    prog(0.86, '正在布置灯光'); await nextFrame();
    setupEnvironment();
    initVM(); FX.init(scene);
    VM.scene.environment = scene.environment; VM.cam.fov = 50; VM.cam.updateProjectionMatrix();
    for (const p of [FX.fire, FX.smoke, FX.dust]) p.mesh.material.uniforms.fogDen.value = FOG_DEN;
    HUD.init(); bindUI();
    if (IS_TOUCH) setupTouch();
    prog(0.94, '正在编译着色器'); await nextFrame();
    updateMenuCam(); updateSun();
    renderer.compile(scene, camera); renderer.compile(VM.scene, VM.cam);
    prog(1, '准备就绪');
    Game.state = 'menu';
    $('menu').classList.remove('hidden');
    lastTS = performance.now();
    requestAnimationFrame(frame);
    setTimeout(() => { $('loading').classList.add('hidden'); }, 120);
  } catch (err) {
    console.error(err);
    txt.textContent = '加载出错：' + (err && err.message ? err.message : err);
  }
}
boot();
