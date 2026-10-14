// Witchy Flap - Halloween flappy game for English class. No persistence: refresh resets everything.
'use strict';
const W = 180, H = 320, S = 3;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
cv.width = W * S; cv.height = H * S;
function fit() { const k = Math.min(innerWidth / W, innerHeight / H); cv.style.width = Math.floor(W * k) + 'px'; cv.style.height = Math.floor(H * k) + 'px'; }
addEventListener('resize', fit); fit();

let M = null;            // manifest
const IMG = {};          // asset key -> Image
const WORLDS = ['graveyard', 'haunted_forest', 'pumpkin_village', 'castle_dungeon', 'foggy_swamp'];
const WORLD_NAMES = { graveyard: 'Graveyard', haunted_forest: 'Haunted Forest', pumpkin_village: 'Pumpkin Village', castle_dungeon: 'Castle Dungeon', foggy_swamp: 'Foggy Swamp' };
const TINTS = ['#ff7a3d', '#ffd23d', '#7dff5a', '#3dffd8', '#5aa8ff', '#b07dff', '#ff6bd0', '#ff4a4a', '#ffffff'];
const HAIR_PRESETS = ['', 'black', 'blonde', 'brown', 'teal', 'white'];
const HAIR_PRESET_COL = { '': '#e8632b', black: '#222', blonde: '#f5d76e', brown: '#7a4a2a', teal: '#2bb8a8', white: '#eee' };
const HAIRLESS = new Set(['skeleton', 'mummy', 'pumpkin_head', 'ghost', 'werewolf']);

// ---------- in-memory save (NO persistence) ----------
const save = {
  coins: 150, best: 0, owned: new Set(), world: 'graveyard', rotate: true,
  cfg: { head: 'witch_green', hair: 'long_wavy', hairColor: '', outfit: 'robe_purple', hat: 'pointy', mount: 'classic', acc: null, cape: null,
         colors: { hair: null, outfit: null, hat: null, acc: null, cape: null } }
};

// ---------- shop catalogue ----------
const CATS = [
  { id: 'head', label: 'SPECIES', slot: 'head', items: ['witch_green', 'witch_light', 'witch_peach', 'witch_tan', 'witch_brown', 'witch_dark', 'witch_blue', 'witch_lavender', 'zombie', 'vampire', 'skeleton', 'werewolf', 'mummy', 'pumpkin_head', 'ghost'] },
  { id: 'hair', label: 'HAIR', slot: 'hair_front', items: [null, 'bob', 'braids', 'long_wavy', 'ponytail', 'spiky'], tint: true },
  { id: 'outfit', label: 'OUTFIT', slot: 'outfit', items: ['robe_purple', 'dress_stockings', 'hoodie_jeans', 'school_uniform', 'suit_tie', 'skeleton_costume', 'star_robe', 'pumpkin_suit'], tint: true },
  { id: 'hat', label: 'HAT', slot: 'hat', items: [null, 'pointy', 'crooked_patched', 'beanie', 'pumpkin', 'bat_headband', 'top_hat', 'crown'], tint: true },
  { id: 'mount', label: 'RIDE', slot: 'mount', items: ['classic', 'rocket', 'bone', 'vacuum', 'glow', 'golden'] },
  { id: 'acc', label: 'EXTRA', slot: 'accessory_front', items: [null, 'hair_bow', 'scarf', 'glasses', 'candy_bag', 'pet_bat', 'pet_cat'], tint: true },
  { id: 'cape', label: 'CAPE', slot: 'accessory_back', items: [null, 'cape'], tint: true },
  { id: 'world', label: 'WORLD', items: WORLDS },
];
const SUGG_PREFIX = { head: 'head', hair: 'hair', outfit: 'outfit', hat: 'hat', mount: 'mount', acc: 'accessory', cape: 'accessory', world: 'world' };
function sugg(cat, name) {
  const s = M.shop_suggestions; if (name == null) return { price: 0, perk: 'Nothing equipped' };
  if (cat === 'head' && name.startsWith('witch_')) return { price: 0, perk: 'Witch: all skin tones free!' };
  if (cat === 'hair') return { price: 0, perk: 'Free! Pick a colour below.' };
  return s[SUGG_PREFIX[cat] + '.' + name] || { price: 0, perk: 'cosmetic' };
}
const price = (c, n) => sugg(c, n).price || 0;
const owns = (c, n) => price(c, n) === 0 || save.owned.has(c + '.' + n);
const pretty = n => n == null ? 'None' : n.replace(/^witch_/, 'witch ').replace(/_/g, ' ');
function equipped(c) { if (c === 'world') return save.world; return save.cfg[c]; }

// perks currently active (derived from equipped items)
function perks() {
  const c = save.cfg, p = {};
  p.flap = c.mount === 'rocket' ? 1.1 : 1;
  p.coinMul = (c.mount === 'golden' ? 2 : 1) * (c.acc === 'candy_bag' ? 1.1 : 1);
  p.magnet = c.mount === 'vacuum' ? 40 : 0;
  p.groundBounce = c.mount === 'bone';
  p.slowmo10 = c.mount === 'glow';
  p.scoreMul = 1 + (c.outfit === 'school_uniform' ? 0.05 : 0) + (c.hat === 'top_hat' ? 0.05 : 0);
  p.starTrail = c.outfit === 'star_robe';
  p.batImmune = c.outfit === 'skeleton_costume';
  p.slowCols = c.outfit === 'pumpkin_suit';
  p.extraLife = c.cape === 'cape' ? 1 : 0;
  p.petBat = c.acc === 'pet_bat';
  p.shields = (c.acc === 'pet_cat' ? 1 : 0) + (c.hat === 'crown' ? 1 : 0);
  p.ghostPass = c.head === 'ghost';
  return p;
}

// ---------- loading ----------
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => { console.warn('missing', src); r(null); }; i.src = src; }); }
async function boot() {
  M = await (await fetch('assets/assets.json')).json();
  const keys = Object.keys(M.assets).filter(k => !k.startsWith('species.'));
  let done = 0;
  await Promise.all(keys.map(k => loadImg('assets/' + M.assets[k].native).then(i => { if (i) IMG[k] = i; done++; loadPct = done / keys.length; })));
  await Promise.all([document.fonts.load('8px PS2P'), document.fonts.load('8px Pixelify')]).catch(() => {});
  state = 'menu';
}
let loadPct = 0;

// ---------- tinting (method from assets.json: multiply + destination-in, cached) ----------
const tintCache = new Map();
function tinted(key, tintImg, col) {
  const ck = key + '|' + col; let c = tintCache.get(ck); if (c) return c;
  c = document.createElement('canvas'); c.width = tintImg.width; c.height = tintImg.height;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(tintImg, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(tintImg, 0, 0);
  g.globalCompositeOperation = 'source-over';
  tintCache.set(ck, c); return c;
}
function charLayers(c, p) {
  const L = [];
  const add = (slot, name, col) => {
    if (!name) return; const k = `${p}.${slot}.${name}`; const base = IMG[k]; if (!base) return;
    if (col && IMG[k + '.tint']) L.push(tinted(k, IMG[k + '.tint'], col)); else L.push(base);
  };
  const hair = c.hair && !HAIRLESS.has(c.head) ? c.hair + (c.hairColor ? '_' + c.hairColor : '') : null;
  const hcol = c.hairColor ? null : c.colors.hair;
  add('accessory_back', c.cape, c.colors.cape);
  add('hair_back', hair, hcol);
  add('mount', c.mount);
  add('outfit', c.outfit, c.colors.outfit);
  add('head', c.head);
  add('hair_front', hair, hcol);
  add('hat', c.hat, c.colors.hat);
  add('accessory_front', c.acc, c.colors.acc);
  return L;
}
function drawChar(c, small, x, y, frame) {
  const p = small ? 'character_small' : 'character', fw = small ? 82 : 141, fh = small ? 56 : 96;
  for (const l of charLayers(c, p)) ctx.drawImage(l, (frame % 4) * fw, 0, fw, fh, Math.round(x), Math.round(y), fw, fh);
}
function spr(key, x, y, frame = 0, alpha = 1) {
  const i = IMG[key]; if (!i) return; const a = M.assets[key]; const [fw, fh] = a.frame_size || a.native_size;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(i, (frame % (a.frames || 1)) * fw, 0, fw, fh, Math.round(x), Math.round(y), fw, fh);
  ctx.globalAlpha = 1;
}

// ---------- text ----------
function txt(s, x, y, size = 8, col = '#fff', align = 'left', font = 'PS2P', outline = '#1a0d2e') {
  ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'top';
  if (outline) { ctx.fillStyle = outline; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) ctx.fillText(s, x + dx, y + dy); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrap(s, maxW, size, font) {
  ctx.font = `${size}px ${font}`; const out = []; let line = '';
  for (const w of String(s).split(' ')) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

// ---------- immediate-mode UI ----------
let ui = [], mouse = { x: -1, y: -1 };
const inR = (x, y, w, h) => mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h;
function region(x, y, w, h, fn) { ui.push({ x, y, w, h, fn }); return inR(x, y, w, h); }
function button(name, x, y, fn, label) {
  const hov = region(x, y, 76, 24, fn);
  spr(`ui.button.${name}.${hov ? 'hover' : 'normal'}`, x, y);
  if (label) txt(label, x + 38, y + (hov ? 6 : 7), 8, '#fff', 'center');
}
function arrow(x, y, dir, fn) { const hov = region(x - 2, y - 2, 14, 14, fn); txt(dir < 0 ? '<' : '>', x + 5, y + 1, 8, hov ? '#ffd23d' : '#fff', 'center'); }

// ---------- world rendering ----------
let scroll = 0;
function drawWorld(w, alpha = 1) {
  ctx.globalAlpha = alpha;
  const lay = (k, sp, y) => { const i = IMG[`world.${w}.${k}`]; if (!i) return; const off = -((scroll * sp) % i.width); ctx.drawImage(i, Math.floor(off), y); ctx.drawImage(i, Math.floor(off) + i.width, y); };
  lay('sky', 0.1, 0); lay('mid', 0.3, 0);
  lay('ground', 1.0, M.worlds[w].ground_y);   // ground (z2)
  lay('near', 0.6, 0);                        // near props over ground, BEHIND columns
  ctx.globalAlpha = 1;
}
function drawSign(text, colX, midY) {
  let size = 8;
  ctx.font = size + 'px Pixelify';
  if (ctx.measureText(text).width > 70) size = 7;
  ctx.font = size + 'px Pixelify';
  const boxW = Math.ceil(ctx.measureText(text).width) + 8;
  const boxH = size + 6;
  let sx = Math.round(colX - boxW + 10);
  if (sx < 2) sx = 2;
  const sy = Math.round(midY - boxH / 2);
  ctx.fillStyle = '#24143f';
  ctx.fillRect(sx, sy, boxW, boxH);
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, sy + 0.5, boxW - 1, boxH - 1);
  txt(text, sx + 4, sy + 2, size, '#fff', 'left', 'Pixelify');
}
function drawColumn(w, col) {
  const ob = M.worlds[w].obstacle, body = IMG[`world.${w}.obstacle.body_tile`];
  const x = Math.round(col.x);
  const fillBody = (y0, y1) => { if (!body) return; for (let y = y0; y < y1; y += 32) ctx.drawImage(body, x, y); };
  if (!col.gate) {
    for (let y = col.top - 24 - 32; y > -32; y -= 32) if (body) ctx.drawImage(body, x, y);
    spr(`world.${w}.obstacle.cap_top`, x + ob.cap_x_offset, col.top - 24);
    const by = col.top + col.gap;
    spr(`world.${w}.obstacle.cap_bottom`, x + ob.cap_x_offset, by);
    for (let y = by + 24; y < H; y += 32) if (body) ctx.drawImage(body, x, y);
    return;
  }
  const gaps = col.gaps;
  fillBody(-32, gaps[0].top - 24);
  spr(`world.${w}.obstacle.cap_top`, x + ob.cap_x_offset, gaps[0].top - 24);
  for (let i = 0; i < gaps.length; i++) {
    const g = gaps[i];
    const bottom = g.top + g.gap;
    spr(`world.${w}.obstacle.cap_bottom`, x + ob.cap_x_offset, bottom);
    if (i + 1 < gaps.length) {
      const next = gaps[i + 1];
      fillBody(bottom + 24, next.top - 24);
      spr(`world.${w}.obstacle.cap_top`, x + ob.cap_x_offset, next.top - 24);
    }
    drawSign(g.label, x, g.top + g.gap / 2);
  }
  fillBody(gaps[gaps.length - 1].top + gaps[gaps.length - 1].gap + 24, H);
}

// ---------- game state ----------
let state = 'loading', t = 0, run = null, over = null;
let shop = { cat: 0, page: 0, sel: 0, msg: '', msgT: 0 };
const PX = 6; // player canvas left x (small canvas 82x56)

function newRun() {
  const p = perks();
  run = {
    p, y: 120, vy: 0, cols: [], coins: [], bats: [], pick: [], fx: [], spawnX: 200, score: 0, scoreAcc: 0, colsPassed: 0,
    candy: 0, candyAcc: 0, lives: 1 + p.extraLife, maxLives: 3 + p.extraLife, shields: p.shields, inv: 0, ghost: p.ghostPass ? 1 : 0,
    bounce: p.groundBounce ? 1 : 0, petBat: p.petBat ? 1 : 0, magnetT: 0, slowT: 0, slowmoT: 0, batT: 4, world: save.world, prevWorld: null, fade: 0,
    banner: 'Tap to fly!', bannerT: 2, started: false, dead: 0, nextQuiz: 10, frame: 0,
    streak: 1, gatesFaced: 0, regularSpawned: 0, boss: null
  };
  state = 'play';
}
function worldList() { return WORLDS.filter(w => owns('world', w)); }
function addFx(key, x, y, fps, life) { run.fx.push({ key, x, y, fps, t: 0, life }); }
function giveCandy(n) { run.candyAcc += n * run.p.coinMul; const g = Math.floor(run.candyAcc); if (g) { run.candyAcc -= g; run.candy += g; save.coins += g; } }

function hb() {
  const h = M.character.small_variant.hitbox_suggestion;
  const w = h.w * 0.8, hh = h.h * 0.8;
  return { x: PX + h.x + (h.w - w) / 2, y: run.y + h.y + (h.h - hh) / 2, w, h: hh };
}
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function hurt(kind) {
  if (auto || godMode) return;
  const r = run; if (r.inv > 0 || r.dead) return;
  sfxBad();
  const c = hb();
  if (kind === 'column' && r.ghost > 0) { r.ghost--; r.inv = 1.2; r.banner = 'Ghost phase!'; r.bannerT = 1; return; }
  if (r.shields > 0) { r.shields--; r.inv = 1.2; addFx('fx.death_poof', c.x + c.w / 2 - 24, c.y + c.h / 2 - 24, 14, 6 / 14); return; }
  r.lives--; addFx('fx.death_poof', c.x + c.w / 2 - 24, c.y + c.h / 2 - 24, 14, 6 / 14);
  if (r.lives > 0) { r.inv = 1.6; r.vy = -3; return; }
  r.dead = 0.9; r.vy = -2;
}
function flap(silent) { if (!run || run.dead) return; run.started = true; run.vy = -2.38 * run.p.flap; if (!silent) sfxFlap(); }

// Session cheats. Shift+A opens the hidden panel. Nothing here is saved.
let auto = false, autoBossT = 0, godMode = false, speedMul = 1, cheatOpen = false, cheatNote = '', cheatNoteT = 0;
function riseLeft(v) {
  if (v >= 0) return 0;
  let rise = 0;
  for (let i = 0; i < 80 && v < 0; i++) { v = Math.min(v + 0.14, 3.5); if (v < 0) rise -= v; else break; }
  return rise;
}
function autoSteer() {
  const r = run;
  if (r.dead) { r.dead = 0; r.lives = Math.max(1, r.lives); }
  r.started = true;
  const c = hb();
  const px = c.x + c.w / 2;
  let col = null;
  for (const q of r.cols) if (!q.passed && q.x >= -30 && (!col || q.x < col.x)) col = q;
  let target = 140;
  if (col) {
    if (col.gate) { const hole = col.gaps.find(g => g.correct) || col.gaps[0]; target = hole.top + hole.gap / 2; }
    else target = col.top + col.gap / 2;
  } else {
    for (const b of r.bats) {
      if (b.dead) continue;
      const dx = (b.x + 16) - px;
      if (dx < -20 || dx > 70) continue;
      const by = b.y + 12, mid = r.y + 25.5;
      if (Math.abs(by - mid) < 30) target = by >= mid ? mid - 28 : mid + 28;
    }
  }
  target = Math.max(40, Math.min(272, target));
  const err = (r.y + 25.5) - target;
  if (err > 3 && riseLeft(r.vy) < err - 2) flap(true);
}
function step(dt) { // dt = 1 at 60fps
  const r = run; r.frame += dt;
  if (auto) autoSteer();
  if (r.dead) { r.dead -= dt / 60; r.vy += 0.25 * dt; r.y += r.vy * dt; updFx(dt); if (r.dead <= 0) endRun(); return; }
  if (!r.started) { r.y = 120 + Math.sin(t * 4) * 4; scroll += 0.6 * dt; return; }
  const slow = (r.slowmoT > 0 ? 0.5 : 1); dt *= slow;
  const level = Math.min(r.score, 60);
  const gateAhead = r.cols.some(col => col.gate && !col.passed) || (r.regularSpawned >= 4 && window.QUESTIONS && QUESTIONS.length);
  const speed = (1.1 + level * 0.004) * (r.slowT > 0 ? 0.6 : 1) * (gateAhead ? 0.6 : 1);
  const grav = 0.14;
  r.vy = Math.min(r.vy + grav * dt, 3.5); r.y += r.vy * dt;
  for (const k of ['inv', 'magnetT', 'slowT', 'slowmoT', 'bannerT', 'fade']) if (r[k] > 0) r[k] = Math.max(0, r[k] - dt / 60 / slow);
  scroll += speed * dt;
  const c = hb();
  if (c.y < 0) { r.y -= c.y; r.vy = Math.max(0, r.vy); }
  const gy = M.worlds[r.world].collision_ground_y;
  if (c.y + c.h > gy) {
    if (r.bounce > 0) { r.bounce--; r.vy = -4; r.banner = 'Bone bounce!'; r.bannerT = 1; }
    else if (r.inv <= 0) { hurt('ground'); if (!r.dead) r.vy = -4.2; }
    else r.vy = -4;
    r.y = gy - c.h - (c.y - r.y);
  }
  // spawn columns — a gate replaces every 5th column (after 4 regular ones)
  r.spawnX -= speed * dt;
  if (r.spawnX <= W + 10) {
    const gateDue = r.regularSpawned >= 4 && window.QUESTIONS && QUESTIONS.length;
    if (gateDue) {
      const q = pickQuestion();
      const gaps = gateOpenings(q, gy);
      // Two extra column-gaps of lead (~6 s at normal speed) so the question can be read.
      const x = r.spawnX + 50 + 136 * 2;
      r.cols.push({ x, gate: true, gaps, q, passed: false, resolved: false });
      r.regularSpawned = 0;
      r.spawnX = x + 136;
    } else {
      const baseGap = (M.worlds[r.world].obstacle.suggested_gap || 96) * 1.3;
      const gap = Math.max(110, baseGap - level * 0.08);
      const top = 36 + Math.random() * (gy - 36 - 36 - gap);
      r.cols.push({ x: r.spawnX, top, gap, passed: false });
      if (Math.random() < 0.7) r.coins.push({ x: r.spawnX + 8, y: top + gap / 2 - 12, a: Math.random() * 6 });
      if (Math.random() < 0.5) { const yy = 60 + Math.random() * 160; for (let i = 0; i < 3; i++) r.coins.push({ x: r.spawnX + 64 + i * 14, y: yy - Math.sin(i / 2 * Math.PI) * 10, a: i }); }
      const roll = Math.random();
      if (roll < 0.06) r.pick.push({ k: 'fx.magnet_powerup', x: r.spawnX + 80, y: 60 + Math.random() * 150 });
      else if (roll < 0.10 && r.lives < r.maxLives) r.pick.push({ k: 'fx.heart', x: r.spawnX + 80, y: 60 + Math.random() * 150 });
      else if (roll < 0.14) r.pick.push({ k: 'fx.shield_bubble', x: r.spawnX + 80, y: 60 + Math.random() * 150 });
      r.regularSpawned++;
      r.spawnX += 136;
    }
  }
  const ob = M.worlds[r.world].obstacle;
  for (const col of r.cols) {
    col.x -= speed * dt;
    const slot = col.gate ? gateSlot(col, c, ob) : null;
    if (slot && !col.resolved) {
      col.resolved = true;
      if (slot.correct) rewardGate(); else punishGate();
    } else if (slot === false && !col.resolved && columnSolids(col, ob).some(q => ov(c, q))) {
      col.resolved = true; punishGate();
    } else if (!slot && columnSolids(col, ob).some(q => ov(c, q))) hurt('column');
    if (!col.passed && col.x + ob.column_width < c.x) {
      col.passed = true; r.colsPassed++;
      r.scoreAcc += r.p.scoreMul; const ns = Math.floor(r.scoreAcc + 1e-6);
      if (ns > r.score) {
        r.score = ns;
        if (r.p.starTrail && r.colsPassed % 5 === 0) giveCandy(1);
        if (r.score >= r.nextQuiz) {
          r.nextQuiz += 10;
          if (r.p.slowCols) r.slowT = 3;
          if (save.rotate) { const ws = worldList(); if (ws.length > 1 && r.score % 20 === 0) { r.prevWorld = r.world; r.world = ws[(ws.indexOf(r.world) + 1) % ws.length]; r.fade = 1; r.banner = WORLD_NAMES[r.world]; r.bannerT = 2; } }
        }
      }
      if (r.p.slowmo10 && r.colsPassed % 10 === 0) r.slowmoT = 1;
      if (col.gate && !r.dead) {
        r.gatesFaced++;
        if (r.gatesFaced >= 5) startBoss();
      }
    }
  }
  r.cols = r.cols.filter(q => q.x > -60);
  // coins + magnet
  const mag = Math.max(r.p.magnet, r.magnetT > 0 ? 60 : 0), pcx = c.x + c.w / 2, pcy = c.y + c.h / 2;
  for (const k of r.coins) {
    k.x -= speed * dt; k.a += dt / 5;
    const dx = pcx - (k.x + 12), dy = pcy - (k.y + 12), d = Math.hypot(dx, dy);
    if (mag && d < mag) { k.x += dx / d * 3 * dt; k.y += dy / d * 3 * dt; }
    if (d < 14) { k.got = true; giveCandy(1); sfxCoin(); addFx('fx.sparkle', k.x, k.y, 14, 4 / 14); }
  }
  r.coins = r.coins.filter(k => !k.got && k.x > -30);
  for (const k of r.pick) {
    k.x -= speed * dt; const d = Math.hypot(pcx - (k.x + 14), pcy - (k.y + 12));
    if (d < 18) { k.got = true; addFx('fx.sparkle', k.x, k.y, 14, 4 / 14);
      if (k.k === 'fx.heart') { r.lives = Math.min(r.maxLives, r.lives + 1); r.banner = 'Extra life!'; }
      else if (k.k === 'fx.magnet_powerup') { r.magnetT = 6; r.banner = 'Candy magnet!'; }
      else { r.shields++; r.banner = 'Shield!'; } r.bannerT = 1.2; }
  }
  r.pick = r.pick.filter(k => !k.got && k.x > -50);
  // bats
  if (r.score >= 3) { r.batT -= dt / 60; if (r.batT <= 0) { r.batT = Math.max(1.5, 4.5 - r.score * 0.05) + Math.random() * 2; r.bats.push({ x: W + 10, y0: 40 + Math.random() * 200, ph: Math.random() * 6 }); } }
  for (const b of r.bats) {
    b.x -= (speed + 0.8) * dt; b.ph += dt / 20; b.y = b.y0 + Math.sin(b.ph) * 18;
    if (!b.dead && ov(c, { x: b.x + 8, y: b.y + 6, w: 16, h: 14 })) {
      if (auto) { b.dead = true; addFx('fx.death_poof', b.x - 8, b.y - 8, 14, 6 / 14); continue; }
      if (r.p.batImmune) continue;
      if (r.petBat > 0) { r.petBat--; b.dead = true; addFx('fx.death_poof', b.x - 8, b.y - 12, 14, 6 / 14); r.banner = 'Pet bat: yum!'; r.bannerT = 1; }
      else { hurt('bat'); if (r.inv > 0 || r.dead) { b.dead = true; } }
    }
  }
  r.bats = r.bats.filter(b => !b.dead && b.x > -40);
  if (r.p.starTrail && Math.random() < 0.25 * dt) r.fx.push({ key: 'fx.sparkle', x: PX + 16 + Math.random() * 8, y: r.y + 24 + Math.random() * 10, fps: 14, t: 0, life: 4 / 14, vx: -speed });
  updFx(dt);
}
function updFx(dt) { for (const f of run.fx) { f.t += dt / 60; if (f.vx) f.x += f.vx * dt; } run.fx = run.fx.filter(f => f.t < f.life); }

function drawPlay() {
  const r = run;
  if (r.fade > 0 && r.prevWorld) { drawWorld(r.prevWorld); drawWorld(r.world, 1 - r.fade); } else drawWorld(r.world);
  for (const col of r.cols) drawColumn(r.world, col);
  for (const k of r.coins) spr('fx.candy_coin', k.x, k.y, Math.floor(k.a * 2));
  for (const k of r.pick) { const bob = Math.sin(t * 5 + k.x) * 2; if (k.k === 'fx.shield_bubble') { ctx.save(); ctx.translate(k.x + 12, k.y + 12 + bob); ctx.scale(0.5, 0.5); ctx.translate(-24, -24); shieldDraw(0, 0); ctx.restore(); } else spr(k.k, k.x, k.y + bob); }
  for (const b of r.bats) spr('enemy.bat', b.x, b.y, Math.floor(t * 12));
  // player
  const blink = r.inv > 0 && Math.floor(t * 15) % 2;
  if (!(r.dead && r.dead < 0.6)) {
    ctx.save();
    const cx = PX + 41, cy = r.y + 28; ctx.translate(cx, cy); ctx.rotate(Math.max(-0.35, Math.min(0.5, r.vy * 0.08))); ctx.translate(-cx, -cy);
    if (blink) ctx.globalAlpha = 0.4;
    drawChar(save.cfg, true, PX, r.y, Math.floor(t * 8));
    ctx.restore(); ctx.globalAlpha = 1;
  }
  if (r.shields > 0 && !r.dead) { const c = hb(); shieldDraw(c.x + c.w / 2 - 24, c.y + c.h / 2 - 24); }
  if ((r.magnetT > 0 || r.p.magnet) && !r.dead) { const c = hb(); ctx.strokeStyle = 'rgba(255,120,220,.35)'; ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h / 2, (r.magnetT > 0 ? 60 : r.p.magnet) * (0.9 + 0.1 * Math.sin(t * 6)), 0, 7); ctx.stroke(); }
  for (const f of r.fx) spr(f.key, f.x, f.y, Math.floor(f.t * f.fps));
  // HUD
  for (let i = 0; i < r.lives; i++) spr('fx.heart', 2 + i * 16, 2);
  for (let i = 0; i < r.shields; i++) { ctx.save(); ctx.translate(4 + i * 12, 26); ctx.scale(0.25, 0.25); shieldDraw(0, 0); ctx.restore(); }
  spr('ui.coin_icon', 126, 6); txt('x' + r.candy, 140, 8, 8);
  txt('x' + r.streak, 20, 6, 8, '#ffd23d', 'left', 'Pixelify');
  txt(String(r.score), W / 2, 22, 16, '#fff', 'center');
  const gate = activeGate();
  let bannerBottom = 36;
  if (gate) {
    const lines = wrap(gate.q.q, 164, 10, 'Pixelify').slice(0, 3);
    const lh = 12;
    const bh = 8 + lines.length * lh;
    ctx.fillStyle = 'rgba(16,6,32,.9)';
    ctx.fillRect(4, 36, 172, bh);
    ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 1; ctx.strokeRect(4.5, 36.5, 171, bh - 1);
    lines.forEach((l, i) => txt(l, W / 2, 40 + i * lh, 10, '#fff', 'center', 'Pixelify'));
    bannerBottom = 36 + bh;
  }
  let fy = bannerBottom + 4; const tag = (s, col) => { txt(s, W / 2, fy, 8, col, 'center', 'Pixelify'); fy += 10; };
  if (r.magnetT > 0) tag('MAGNET ' + Math.ceil(r.magnetT), '#ff9ee8');
  if (r.slowT > 0) tag('SLOW COLUMNS', '#ffb347');
  if (r.slowmoT > 0) tag('SLOW-MO', '#9effd8');
  if (r.bannerT > 0) txt(r.banner, W / 2, 120, 8, '#ffd23d', 'center');
  if (!r.started) txt('Click / Tap / Space', W / 2, 200, 8, '#fff', 'center', 'Pixelify');
}
function shieldDraw(x, y) {
  ctx.fillStyle = 'rgba(140,210,255,0.28)'; ctx.beginPath(); ctx.arc(x + 24, y + 24, 20, 0, 7); ctx.fill();
  spr('fx.shield_bubble', x, y, Math.floor(t * 8), 0.75);
}

// ---------- answer gates ----------
const BOSS_HP = 5, BOSS_SECONDS = 8, BOSS_REWARD = 40;
let lastQuestion = -1;
function pickQuestion() {
  const qs = window.QUESTIONS || [];
  if (!qs.length) return null;
  let i = Math.floor(Math.random() * qs.length);
  if (qs.length > 1 && i === lastQuestion) i = (i + 1) % qs.length;
  lastQuestion = i;
  return qs[i];
}
function gateOpenings(q, gy) {
  const maxN = Math.min(3, q.choices.length);
  const n = maxN < 2 ? maxN : (Math.random() < 0.55 || maxN === 2 ? 2 : 3);
  const pool = q.choices.map((_, i) => i).filter(i => i !== q.answer);
  const idxs = [q.answer];
  while (idxs.length < n && pool.length) idxs.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
  const topLimit = 74, botLimit = Math.min(gy - 6, 292);
  const wall = n >= 3 ? 26 : 48;
  const gapH = (botLimit - topLimit - wall * (n - 1)) / n;
  const gaps = [];
  let y = topLimit;
  for (const i of idxs) { gaps.push({ top: y, gap: gapH, label: q.choices[i], correct: i === q.answer }); y += gapH + wall; }
  return gaps;
}
function columnSolids(col, ob) {
  const cx = col.x + ob.cap_x_offset, cw = ob.cap_width, bw = ob.column_width;
  if (!col.gate) {
    return [{ x: col.x, y: -50, w: bw, h: col.top - 24 + 50 }, { x: cx, y: col.top - 24, w: cw, h: 24 },
      { x: cx, y: col.top + col.gap, w: cw, h: 24 }, { x: col.x, y: col.top + col.gap + 24, w: bw, h: 400 }];
  }
  const rects = [];
  const gaps = col.gaps;
  rects.push({ x: col.x, y: -50, w: bw, h: gaps[0].top - 24 + 50 });
  rects.push({ x: cx, y: gaps[0].top - 24, w: cw, h: 24 });
  for (let i = 0; i < gaps.length; i++) {
    const bottom = gaps[i].top + gaps[i].gap;
    rects.push({ x: cx, y: bottom, w: cw, h: 24 });
    if (i + 1 < gaps.length) {
      const next = gaps[i + 1];
      if (next.top - 24 > bottom + 24) rects.push({ x: col.x, y: bottom + 24, w: bw, h: next.top - 24 - (bottom + 24) });
      rects.push({ x: cx, y: next.top - 24, w: cw, h: 24 });
    }
  }
  const last = gaps[gaps.length - 1];
  rects.push({ x: col.x, y: last.top + last.gap + 24, w: bw, h: 400 });
  return rects;
}
function gateSlot(col, c, ob) {
  const left = col.x + ob.cap_x_offset, right = left + ob.cap_width;
  if (c.x + c.w < left || c.x > right) return null;
  const mid = c.y + c.h / 2;
  return col.gaps.find(g => mid >= g.top && mid < g.top + g.gap) || false;
}
function activeGate() {
  let best = null;
  for (const c of run.cols) if (c.gate && !c.passed && c.x > -70 && (!best || c.x < best.x)) best = c;
  return best;
}
function rewardGate() {
  const gain = run.streak;
  giveCandy(gain);
  const c = hb();
  addFx('fx.sparkle', c.x - 4, c.y, 14, 0.45);
  addFx('fx.sparkle', c.x + 8, c.y + 6, 14, 0.45);
  if (run.streak < 3) run.streak++;
  run.banner = 'Correct! x' + gain; run.bannerT = 1.2;
  sfxGood();
}
function punishGate() {
  const lives = run.lives, shields = run.shields, ghost = run.ghost;
  hurt('column');
  if (run.ghost < ghost) { const c = hb(); addFx('fx.death_poof', c.x, c.y, 14, 6 / 14); }
  run.streak = 1;
  run.banner = run.ghost < ghost ? 'Ghost phase!' : run.shields < shields ? 'Shield broke!' : 'Wrong opening!';
  run.bannerT = 1.2;
}

// ---------- end-of-world boss ----------
const BOSSES = {
  graveyard: { name: 'Giant Ghost', color: '#e6d6ff' },
  haunted_forest: { name: 'Werewolf', color: '#8dff9a' },
  castle_dungeon: { name: 'Vampire Lord', color: '#ff7a9a' },
  pumpkin_village: { name: 'Pumpkin King', color: '#ffb347' },
  foggy_swamp: { name: 'Toad Witch', color: '#c6e07a' }
};
function bossInfo() { return BOSSES[run && run.world] || BOSSES.graveyard; }
function startBoss() {
  run.boss = { hp: BOSS_HP, max: BOSS_HP, t: BOSS_SECONDS, q: null, answered: null, spell: 0, hit: 0, shake: 0, world: run.world };
  nextBossQuestion();
  state = 'boss';
}
function bossOptions(q) {
  const n = Math.min(3, q.choices.length);
  const pool = q.choices.map((_, i) => i).filter(i => i !== q.answer);
  const idxs = [q.answer];
  while (idxs.length < n && pool.length) idxs.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
  return idxs.map(i => ({ label: q.choices[i], i }));
}
function nextBossQuestion() {
  const b = run.boss;
  b.q = pickQuestion();
  b.options = b.q ? bossOptions(b.q) : [];
  b.t = BOSS_SECONDS;
  autoBossT = 0;
  b.answered = null;
  b.spell = 0;
}
function bossAnswer(i) {
  const b = run.boss;
  if (!b || b.answered || !b.q || run.dead) return;
  if (!b.options.some(o => o.i === i)) return;
  const ok = i === b.q.answer;
  b.answered = { ok, i, t: 0 };
  if (ok) { b.hp--; b.spell = 0.45; sfxBoss(); }
  else bossHitWitch();
}
function bossHitWitch() {
  if (auto || godMode) return;
  sfxBad();
  const c = hb();
  addFx('fx.death_poof', c.x, c.y, 14, 6 / 14);
  run.lives--;
  run.boss.hit = 0.45;
  run.boss.shake = 0.35;
  if (run.lives <= 0) { run.lives = 0; run.dead = 0.85; }
}
function defeatBoss() {
  sfxWin();
  giveCandy(BOSS_REWARD);
  const ws = WORLDS;
  const i = Math.max(0, ws.indexOf(run.world));
  run.world = ws[(i + 1) % ws.length];
  save.world = run.world;
  run.gatesFaced = 0;
  run.regularSpawned = 0;
  run.cols = []; run.coins = []; run.bats = []; run.pick = []; run.fx = [];
  run.spawnX = 230;
  run.y = 120; run.vy = 0;
  run.banner = WORLD_NAMES[run.world] + '  +' + BOSS_REWARD; run.bannerT = 2.4;
  run.inv = 1.5;
  run.boss = null;
  state = 'play';
}
function stepBoss(dt) {
  const b = run.boss;
  if (!b) return;
  b.spell = Math.max(0, b.spell - dt);
  b.hit = Math.max(0, b.hit - dt);
  b.shake = Math.max(0, b.shake - dt);
  scroll += 12 * dt;
  updFx(dt * 60);
  if (run.dead) { if (auto || godMode) { run.dead = 0; run.lives = Math.max(1, run.lives); } else { run.dead -= dt; if (run.dead <= 0) endRun(); return; } }
  if (b.answered) {
    b.answered.t += dt;
    if (b.answered.t >= 0.75) { if (b.hp <= 0) defeatBoss(); else nextBossQuestion(); }
    return;
  }
  b.t -= dt;
  if (b.t <= 0) { b.t = 0; b.answered = { ok: false, i: -1, timeout: true, t: 0 }; bossHitWitch(); }
}
function blitSheet(key, x, y, w, h) {
  const img = IMG[key]; if (!img) return;
  const frame = Math.floor(t * 6) % 4;
  ctx.drawImage(img, frame * 82, 0, 82, 56, Math.round(x), Math.round(y), w, h);
}
function drawBossSprite(x, y) {
  const world = (run.boss && run.boss.world) || run.world;
  const info = BOSSES[world] || BOSSES.graveyard;
  const bob = Math.sin(t * 3) * 4;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = info.color;
  ctx.beginPath(); ctx.ellipse(x + 48, y + 62, 46, 36, 0, 0, 7); ctx.fill();
  ctx.restore();
  if (world === 'haunted_forest') {
    const sway = Math.sin(t * 2) * 4;
    ctx.fillStyle = '#2f6b32';
    ctx.beginPath(); ctx.ellipse(x + 46 + sway, y + 30, 38, 20, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4e8f3c';
    ctx.beginPath(); ctx.ellipse(x + 24 + sway, y + 42, 16, 14, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 70 + sway, y + 44, 18, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a4424';
    ctx.fillRect(x + 40 + sway, y + 36, 14, 58);
    blitSheet('character_small.head.werewolf', x + 8 + sway, y + 16 + bob * 0.3, 80, 56);
  } else if (world === 'castle_dungeon') {
    ctx.fillStyle = '#240814';
    ctx.beginPath(); ctx.moveTo(x + 46, y + 28); ctx.lineTo(x + 96, y + 108); ctx.lineTo(x + 4, y + 108); ctx.fill();
    ctx.fillStyle = '#7a1838';
    ctx.beginPath(); ctx.moveTo(x + 46, y + 40); ctx.lineTo(x + 78, y + 104); ctx.lineTo(x + 16, y + 104); ctx.fill();
    blitSheet('character_small.head.vampire', x + 8, y + 6 + bob, 84, 58);
    spr('enemy.bat', x - 8 + Math.sin(t * 4) * 8, y + 8, Math.floor(t * 12));
    spr('enemy.bat', x + 78, y + 22 + Math.cos(t * 3) * 6, Math.floor(t * 12));
    spr('enemy.bat', x + 36, y + Math.sin(t * 2.2) * 5, Math.floor(t * 12));
  } else if (world === 'pumpkin_village') {
    ctx.fillStyle = '#e06a12';
    ctx.beginPath(); ctx.ellipse(x + 48, y + 78, 40, 30, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a3a08'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2f8a32';
    ctx.fillRect(x + 44, y + 28 + bob, 8, 18);
    blitSheet('character_small.head.pumpkin_head', x + 6, y + 10 + bob, 88, 60);
    blitSheet('character_small.hat.crown', x + 20, y - 8 + bob, 56, 38);
  } else if (world === 'foggy_swamp') {
    const hop = Math.abs(Math.sin(t * 3)) * 6;
    ctx.fillStyle = '#1c6a42';
    ctx.beginPath(); ctx.ellipse(x + 50, y + 96, 48, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3e9a48';
    ctx.beginPath(); ctx.ellipse(x + 48, y + 74 - hop, 34, 24, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2d7a38';
    ctx.beginPath(); ctx.ellipse(x + 22, y + 78 - hop, 10, 8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 74, y + 78 - hop, 10, 8, 0, 0, 7); ctx.fill();
    blitSheet('character_small.head.mummy', x + 12, y + 22 - hop, 76, 52);
    blitSheet('character_small.hat.pointy', x + 18, y - 2 - hop, 64, 44);
  } else {
    ctx.fillStyle = 'rgba(236, 226, 255, 0.45)';
    ctx.beginPath(); ctx.ellipse(x + 48, y + 68 + bob, 38, 46, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f7f0ff'; ctx.lineWidth = 1; ctx.stroke();
    blitSheet('character_small.head.ghost', x - 2, y + 16 + bob, 100, 68);
    spr('fx.sparkle', x + 10, y + 24 + Math.sin(t * 5) * 6, Math.floor(t * 10));
    spr('fx.sparkle', x + 70, y + 40 + Math.cos(t * 4) * 5, Math.floor(t * 10));
  }
}
function drawBoss() {
  const b = run.boss;
  ctx.save();
  if (b.shake > 0) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
  drawWorld(run.world);
  drawChar(save.cfg, true, 0, 78, Math.floor(t * 8));
  drawBossSprite(78, 36);
  if (b.spell > 0) {
    const u = 1 - b.spell / 0.45;
    spr('fx.sparkle', 46 + u * 62, 100 + Math.sin(u * 8) * 8, Math.floor(t * 14));
    spr('fx.sparkle', 36 + u * 62, 108, Math.floor(t * 14) + 1);
  }
  for (const f of run.fx) spr(f.key, f.x, f.y, Math.floor(f.t * f.fps));
  const info = BOSSES[(b.world)] || bossInfo();
  txt(info.name, 6, 3, 8, info.color, 'left', 'Pixelify');
  ctx.font = '8px Pixelify';
  const pipsX = Math.ceil(ctx.measureText(info.name).width) + 12;
  for (let i = 0; i < b.max; i++) { ctx.fillStyle = i < b.hp ? info.color : '#3a2048'; ctx.fillRect(pipsX + i * 14, 5, 11, 8); }
  for (let i = 0; i < run.lives; i++) spr('fx.heart', 4 + i * 14, 16);
  const frac = Math.max(0, b.t / BOSS_SECONDS);
  txt(Math.ceil(Math.max(0, b.t)) + 's', W / 2, 132, 10, frac < 0.375 ? '#ff6b6b' : '#ffd23d', 'center', 'Pixelify');
  ctx.fillStyle = '#1a0d2e'; ctx.fillRect(16, 146, 148, 6);
  ctx.fillStyle = frac < 0.375 ? '#ff4a4a' : '#ffd23d'; ctx.fillRect(16, 146, 148 * frac, 6);
  if (b.q) {
    const lines = wrap(b.q.q, 164, 8, 'Pixelify').slice(0, 2);
    lines.forEach((l, i) => txt(l, W / 2, 156 + i * 11, 8, '#fff', 'center', 'Pixelify'));
    b.options.forEach((o, n) => {
      const y = 182 + n * 28;
      const hov = !b.answered && region(12, y, 156, 24, () => bossAnswer(o.i));
      let bg = hov ? '#ff8a3d' : '#6a3fb0';
      if (b.answered) { if (o.i === b.q.answer) bg = '#2e9e4f'; else if (o.i === b.answered.i) bg = '#b0303a'; else bg = '#3a2458'; }
      ctx.fillStyle = '#1a0d2e'; ctx.fillRect(12, y + 2, 156, 24);
      ctx.fillStyle = bg; ctx.fillRect(12, y, 156, 22);
      txt((n + 1) + '. ' + o.label, 20, y + 6, 10, '#fff', 'left', 'Pixelify');
    });
  }
  if (b.answered) {
    const msg = b.answered.ok ? 'Spell hits!' : b.answered.timeout ? 'Too slow!' : 'The boss strikes!';
    txt(msg, W / 2, 268, 8, b.answered.ok ? '#7dff5a' : '#ff6b6b', 'center', 'Pixelify');
  }
  if (b.hit > 0) { ctx.fillStyle = 'rgba(255,40,60,' + (0.35 * b.hit / 0.45) + ')'; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

// ---------- game over ----------
function endRun() { sfxOver(); save.best = Math.max(save.best, run.score); over = { score: run.score, candy: run.candy, newBest: run.score > 0 && run.score === save.best }; state = 'over'; }
function drawOver() {
  drawWorld(run.world); for (const col of run.cols) drawColumn(run.world, col);
  ctx.fillStyle = 'rgba(11,6,24,.45)'; ctx.fillRect(0, 0, W, H);
  const px = 10, py = 50; spr('ui.game_over_panel', px, py);
  const sl = M.assets['ui.game_over_panel'].slots;
  txt(String(over.score), px + sl.score_value_right_x, py + sl.score_y, 8, '#fff', 'right');
  txt(String(save.best), px + sl.score_value_right_x, py + sl.best_y, 8, '#ffd23d', 'right');
  txt(String(over.candy), px + sl.score_value_right_x, py + sl.candy_y, 8, '#ff9ee8', 'right');
  if (over.newBest) txt('NEW BEST!', W / 2, py + 124, 8, '#7dff5a', 'center');
  txt('Bank: ' + save.coins + ' candy coins', W / 2, py + 136, 8, '#fff', 'center', 'Pixelify');
  button('play', 52, 206, newRun);
  button('shop', 52, 234, openShop);
  button('blank', 52, 262, () => state = 'menu', 'MENU');
}

// ---------- menu ----------
function drawMenu() {
  if (!cheatOpen) scroll += 0.4; drawWorld(save.world);
  ctx.fillStyle = 'rgba(11,6,24,.25)'; ctx.fillRect(0, 0, W, H);
  spr('ui.title_logo', 2, 10 + Math.round(Math.sin(t * 2) * 2));
  drawChar(save.cfg, false, 20, 96 + Math.sin(t * 3) * 4, Math.floor(t * 8));
  txt('Best: ' + save.best, 8, 196, 8, '#fff');
  spr('ui.coin_icon', 104, 194); txt(String(save.coins), 118, 196, 8, '#ffd23d');
  button('play', 52, 214, newRun);
  button('shop', 52, 242, openShop);
  button('blank', 52, 270, () => save.rotate = !save.rotate, save.rotate ? 'MIX:ON' : 'MIX:OFF');
  txt(save.rotate ? 'Worlds change every 20 pts' : 'Stay in ' + WORLD_NAMES[save.world], W / 2, 298, 8, '#ddd', 'center', 'Pixelify');
  txt('Click / Tap / Space to fly', W / 2, 309, 8, '#ffd23d', 'center', 'Pixelify');
}

// ---------- shop / wardrobe ----------
function openShop() { shop.page = 0; shop.sel = Math.max(0, CATS[shop.cat].items.indexOf(equipped(CATS[shop.cat].id))); shop.page = Math.floor(shop.sel / 2); state = 'shop'; }
function setCat(d) { shop.cat = (shop.cat + d + CATS.length) % CATS.length; openShop(); }
function tryOn(cat, name) { const c = JSON.parse(JSON.stringify(save.cfg)); if (cat !== 'world') c[cat] = name; return c; }
function equip(cat, name) { if (cat === 'world') save.world = name; else save.cfg[cat] = name; flash('Equipped!'); }
function buy(cat, name) {
  const p = price(cat, name);
  if (save.coins < p) { flash('Need ' + (p - save.coins) + ' more candy!'); return; }
  save.coins -= p; save.owned.add(cat + '.' + name); equip(cat, name); flash('Bought! Enjoy!'); sfxBuy();
}
function flash(m) { shop.msg = m; shop.msgT = 1.6; }
function drawIcon(cat, name, x, y) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, 52, 52); ctx.clip();
  if (cat === 'world') {
    ctx.drawImage(IMG[`world.${name}.sky`], 100, 180, 52, 52, x, y, 52, 52);
    ctx.drawImage(IMG[`world.${name}.mid`], 100, 180, 52, 52, x, y, 52, 52);
    ctx.drawImage(IMG[`world.${name}.obstacle.cap_bottom`], x + 2, y + 24);
    ctx.drawImage(IMG[`world.${name}.obstacle.body_tile`], x + 6, y + 48);
  } else {
    ctx.fillStyle = '#1e1036'; ctx.fillRect(x, y, 52, 52);
    const h = M.character.small_variant.hitbox_suggestion;
    drawChar(tryOn(cat, name), true, x + 26 - (h.x + h.w / 2) - 4, y + 26 - (h.y + h.h / 2) + 2, 0);
  }
  ctx.restore();
}
function drawShop() {
  const C = CATS[shop.cat], it = C.items;
  ctx.fillStyle = '#140a26'; ctx.fillRect(0, 0, W, H);
  txt('WARDROBE & SHOP', W / 2, 4, 8, '#fff', 'center');
  spr('ui.coin_icon', 118, 14); txt(String(save.coins), 132, 16, 8, '#ffd23d');
  // preview
  const sel = it[shop.sel];
  const pv = C.id === 'world' ? save.cfg : tryOn(C.id, sel);
  const pw = C.id === 'world' ? sel : save.world;
  ctx.save(); ctx.beginPath(); ctx.rect(4, 26, 172, 92); ctx.clip();
  const sk = IMG[`world.${pw}.sky`]; ctx.drawImage(sk, 60, 140, 172, 92, 4, 26, 172, 92); ctx.drawImage(IMG[`world.${pw}.mid`], 60, 140, 172, 92, 4, 26, 172, 92);
  drawChar(pv, false, 19, 24 + Math.sin(t * 3) * 2, Math.floor(t * 8));
  ctx.restore(); ctx.strokeStyle = '#b07dff'; ctx.strokeRect(4.5, 26.5, 171, 91);
  // category selector
  arrow(8, 122, -1, () => setCat(-1)); arrow(160, 122, 1, () => setCat(1));
  txt(C.label + ' ' + (shop.cat + 1) + '/' + CATS.length, W / 2, 124, 8, '#ff9e3d', 'center');
  region(30, 120, 120, 14, () => setCat(1));
  // colour swatches
  let sy = 136;
  if (C.tint && sel != null && !(C.id === 'hair' && HAIRLESS.has(save.cfg.head))) {
    const sw = [];
    if (C.id === 'hair') { for (const p of HAIR_PRESETS) sw.push({ col: HAIR_PRESET_COL[p], on: save.cfg.hairColor === p && !save.cfg.colors.hair, fn: () => { save.cfg.hairColor = p; save.cfg.colors.hair = null; } });
      for (const c of TINTS.slice(0, 6)) sw.push({ col: c, on: !save.cfg.hairColor && save.cfg.colors.hair === c, fn: () => { save.cfg.hairColor = ''; save.cfg.colors.hair = c; } }); }
    else { sw.push({ col: null, on: !save.cfg.colors[C.id], fn: () => save.cfg.colors[C.id] = null });
      for (const c of TINTS) sw.push({ col: c, on: save.cfg.colors[C.id] === c, fn: () => save.cfg.colors[C.id] = c }); }
    const x0 = Math.round(W / 2 - sw.length * 6);
    sw.forEach((s, i) => { const x = x0 + i * 12; const h = region(x, sy, 10, 10, s.fn);
      ctx.fillStyle = s.on ? '#fff' : (h ? '#ffd23d' : '#1a0d2e'); ctx.fillRect(x - 1, sy - 1, 12, 12);
      if (s.col) { ctx.fillStyle = s.col; ctx.fillRect(x, sy, 10, 10); } else { ctx.fillStyle = '#444'; ctx.fillRect(x, sy, 10, 10); txt('x', x + 5, sy + 1, 8, '#fff', 'center', 'Pixelify', null); } });
  } else if (C.tint) txt(C.id === 'hair' && sel != null ? '(hidden for this species)' : '', W / 2, sy, 8, '#888', 'center', 'Pixelify');
  // cards
  const pages = Math.ceil(it.length / 2), cy = 150;
  arrow(4, cy + 38, -1, () => { shop.page = (shop.page - 1 + pages) % pages; shop.sel = shop.page * 2; });
  arrow(164, cy + 38, 1, () => { shop.page = (shop.page + 1) % pages; shop.sel = shop.page * 2; });
  for (let j = 0; j < 2; j++) {
    const idx = shop.page * 2 + j; if (idx >= it.length) break; const name = it[idx], x = 22 + j * 72;
    region(x, cy, 64, 88, () => shop.sel = idx);
    spr(idx === shop.sel ? 'ui.shop_card_selected' : 'ui.shop_card', x, cy);
    drawIcon(C.id, name, x + 6, cy + 6);
    const eq = equipped(C.id) === name, ow = owns(C.id, name);
    const lab = eq ? 'ON' : ow ? 'OWN' : String(price(C.id, name));
    if (!ow) spr('ui.coin_icon', x + 8, cy + 66);
    txt(lab, x + (ow ? 32 : 38), cy + 68, 8, eq ? '#7dff5a' : ow ? '#fff' : '#ffd23d', 'center');
  }
  txt((shop.page + 1) + '/' + pages, W / 2, cy + 90, 8, '#888', 'center', 'Pixelify');
  // name + perk
  const s = sugg(C.id, sel);
  txt(C.id === 'world' ? WORLD_NAMES[sel] : pretty(sel), W / 2, 250, 8, '#fff', 'center', 'Pixelify');
  const perk = wrap('Perk: ' + s.perk, 168, 8, 'Pixelify');
  perk.slice(0, 2).forEach((l, i) => txt(l, W / 2, 259 + i * 8, 8, s.perk.startsWith('cosmetic') ? '#bbb' : '#9effd8', 'center', 'Pixelify'));
  // action buttons
  const ow = owns(C.id, sel), eq = equipped(C.id) === sel;
  if (!ow) button('buy', 12, 280, () => buy(C.id, sel));
  else if (!eq) button('equip', 12, 280, () => equip(C.id, sel));
  else { spr('ui.button.blank.normal', 12, 280); txt('ON', 50, 287, 8, '#7dff5a', 'center'); }
  button('back', 92, 280, () => state = 'menu');
  if (shop.msgT > 0) { if (!cheatOpen) shop.msgT -= 1 / 60; txt(shop.msg, W / 2, 308, 8, '#ffd23d', 'center', 'Pixelify'); }
  else txt('PLAY from the menu to earn candy!', W / 2, 308, 8, '#888', 'center', 'Pixelify');
}

// ---------- audio (Web Audio, no files) ----------
let actx = null, musicGain = null, sfxGain = null, muted = false, musicStep = 0, nextNoteAt = 0, noiseBuf = null;
const TUNE = [
  [220, 0.28], [0, 0.08], [233, 0.18], [220, 0.18],
  [196, 0.28], [0, 0.1], [174, 0.36],
  [196, 0.18], [220, 0.18], [262, 0.28], [247, 0.36],
  [0, 0.12], [233, 0.18], [220, 0.18], [196, 0.28], [174, 0.48],
  [165, 0.28], [196, 0.18], [220, 0.28], [0, 0.14],
  [262, 0.18], [247, 0.18], [233, 0.28], [220, 0.4],
  [196, 0.18], [174, 0.18], [165, 0.36], [147, 0.5],
  [0, 0.22]
];
function ensureAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!actx) {
    try {
      actx = new AC();
      const master = actx.createGain(); master.gain.value = 0.85; master.connect(actx.destination);
      musicGain = actx.createGain(); musicGain.gain.value = 1; musicGain.connect(master);
      sfxGain = actx.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
      nextNoteAt = actx.currentTime + 0.05;
    } catch (e) { actx = null; return; }
  }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
}
function tone(freq, dur, type, gain, at, dest, slideTo) {
  try {
    if (!actx || muted || !freq || !dest) return;
    const t0 = at || actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(Math.max(40, freq), t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    g.gain.setValueAtTime(Math.max(0.0008, gain), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.05);
  } catch (e) { /* a dropped blip should not stop the game */ }
}
function noiseThud() {
  try {
    if (!actx || muted) return;
    if (!noiseBuf) {
      const n = Math.floor(actx.sampleRate * 0.18);
      noiseBuf = actx.createBuffer(1, n, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    }
    const src = actx.createBufferSource(); src.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.22, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.16);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start();
  } catch (e) {}
}
function sfxFlap() { tone(460, 0.07, 'square', 0.055, 0, sfxGain, 740); }
function sfxCoin() { const t0 = actx && actx.currentTime; tone(988, 0.06, 'square', 0.05, t0, sfxGain); tone(1319, 0.1, 'square', 0.04, t0 ? t0 + 0.05 : 0, sfxGain); }
function sfxGood() { const t0 = actx && actx.currentTime; [523, 659, 784].forEach((f, i) => tone(f, 0.11, 'square', 0.05, t0 ? t0 + i * 0.07 : 0, sfxGain)); }
function sfxBad() { noiseThud(); tone(190, 0.16, 'square', 0.06, 0, sfxGain, 70); }
function sfxBoss() { tone(220, 0.12, 'square', 0.07, 0, sfxGain, 760); tone(660, 0.14, 'triangle', 0.035, 0, sfxGain); }
function sfxWin() { const t0 = actx && actx.currentTime; [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.05, t0 ? t0 + i * 0.09 : 0, sfxGain)); }
function sfxBuy() { const t0 = actx && actx.currentTime; tone(660, 0.08, 'square', 0.05, t0, sfxGain); tone(880, 0.12, 'square', 0.05, t0 ? t0 + 0.08 : 0, sfxGain); }
function sfxOver() { const t0 = actx && actx.currentTime; [440, 349, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, t0 ? t0 + i * 0.16 : 0, sfxGain)); }
function pumpMusic() {
  if (!actx || muted || !musicGain) return;
  const horizon = actx.currentTime + 0.28;
  if (nextNoteAt < actx.currentTime - 0.05) nextNoteAt = actx.currentTime + 0.02;
  let guard = 0;
  while (nextNoteAt < horizon && guard++ < 12) {
    const [freq, dur] = TUNE[musicStep % TUNE.length];
    if (freq) {
      tone(freq, dur * 0.9, 'square', 0.04, nextNoteAt, musicGain);
      tone(freq / 2, dur, 'triangle', 0.028, nextNoteAt, musicGain);
    }
    nextNoteAt += dur;
    musicStep++;
  }
}
function toggleMute() {
  ensureAudio();
  muted = !muted;
  if (actx && musicGain && sfxGain) {
    const g = muted ? 0 : 1, t0 = actx.currentTime;
    musicGain.gain.setValueAtTime(g, t0);
    sfxGain.gain.setValueAtTime(g, t0);
    if (!muted) nextNoteAt = t0 + 0.02;
  }
}

// ---------- hidden cheat menu ----------
function cheatNoteSet(s) { cheatNote = s; cheatNoteT = 1.1; }
function cycleSpeed() {
  speedMul = speedMul === 1 ? 2 : speedMul === 2 ? 3 : speedMul === 3 ? 5 : 1;
  acc = 0; cheatNoteSet('Speed x' + speedMul);
}
function grantCandy(n) {
  save.coins += n;
  if (run && (state === 'play' || state === 'boss')) run.candy += n;
  cheatNoteSet('+' + n + ' candy');
}
function unlockAll() {
  for (const c of CATS) for (const name of c.items) if (name && price(c.id, name) > 0) save.owned.add(c.id + '.' + name);
  cheatNoteSet('Shop unlocked');
}
function ensureRun() {
  if (state === 'loading') return false;
  if ((state === 'play' || state === 'boss') && run && !run.dead) return true;
  newRun();
  return true;
}
function spawnBossNow() {
  if (!ensureRun()) return;
  startBoss();
  cheatNoteSet(bossInfo().name);
}
function nextWorldNow() {
  const cur = (run && (state === 'play' || state === 'boss')) ? run.world : save.world;
  const n = WORLDS[(Math.max(0, WORLDS.indexOf(cur)) + 1) % WORLDS.length];
  save.world = n;
  if (run && (state === 'play' || state === 'boss')) {
    run.prevWorld = run.world; run.world = n; run.fade = 1; run.banner = WORLD_NAMES[n]; run.bannerT = 2;
  }
  cheatNoteSet(WORLD_NAMES[n]);
}
function nextGateNow() {
  if (!ensureRun()) return;
  if (state === 'boss') { run.boss = null; state = 'play'; }
  run.regularSpawned = 4;
  run.spawnX = Math.min(run.spawnX, W + 8);
  cheatNoteSet('Next column is a gate');
}
function fullHearts() {
  if (!ensureRun()) return;
  run.lives = run.maxLives;
  cheatNoteSet('Hearts full');
}
function toggleAutopilot() { auto = !auto; autoBossT = 0; cheatNoteSet(auto ? 'Autopilot on' : 'Autopilot off'); }
function stopAutopilot() { if (!auto) return; auto = false; autoBossT = 0; cheatNoteSet('Autopilot off'); }
function toggleGod() {
  godMode = !godMode;
  if (godMode && run && run.dead && state !== 'over') { run.dead = 0; run.lives = Math.max(1, run.lives); }
  cheatNoteSet(godMode ? 'Invincible on' : 'Invincible off');
}
const CHEAT_ROWS = [
  { key: '1', label: () => 'Autopilot  ' + (auto ? 'ON' : 'OFF'), on: () => auto, go: toggleAutopilot },
  { key: '2', label: () => 'Speed  x' + speedMul, on: () => speedMul !== 1, go: cycleSpeed },
  { key: '3', label: () => 'Give +100 candy', go: () => grantCandy(100) },
  { key: '4', label: () => 'Give +1000 candy', go: () => grantCandy(1000) },
  { key: '5', label: () => 'Invincible  ' + (godMode ? 'ON' : 'OFF'), on: () => godMode, go: toggleGod },
  { key: '6', label: () => 'Unlock all shop', go: unlockAll },
  { key: '7', label: () => 'Spawn boss now', go: spawnBossNow },
  { key: '8', label: () => 'Next world', go: nextWorldNow },
  { key: '9', label: () => 'Next gate now', go: nextGateNow },
  { key: '0', label: () => 'Full hearts', go: fullHearts }
];
function cheatBox() {
  const rect = cv.getBoundingClientRect();
  const scaleX = rect.width > 0 ? rect.width / W : 1;
  const scaleY = rect.height > 0 ? rect.height / H : 1;
  const scale = Math.min(scaleX, scaleY);
  const closeH = Math.max(18, Math.ceil(44 / scale));
  const panelX = 12, panelY = 6, panelW = W - 24, panelH = H - 12;
  const top = panelY + closeH + 3;
  const rowH = Math.min(26, Math.max(16, Math.floor((panelY + panelH - 14 - top) / CHEAT_ROWS.length)));
  return { closeH, panelX, panelY, panelW, panelH, top, rowH };
}
function drawCheat() {
  const box = cheatBox();
  region(0, 0, W, H, () => { cheatOpen = false; });
  ctx.fillStyle = 'rgba(6,2,16,.72)'; ctx.fillRect(0, 0, W, H);
  region(box.panelX, box.panelY, box.panelW, box.panelH, () => {});
  ctx.fillStyle = '#14081f'; ctx.fillRect(box.panelX, box.panelY, box.panelW, box.panelH);
  ctx.strokeStyle = '#b07dff'; ctx.strokeRect(box.panelX + 0.5, box.panelY + 0.5, box.panelW - 1, box.panelH - 1);
  const closeHov = region(box.panelX, box.panelY, box.panelW, box.closeH, () => { cheatOpen = false; });
  ctx.fillStyle = closeHov ? '#8a2848' : '#5a2038';
  ctx.fillRect(box.panelX, box.panelY, box.panelW, box.closeH);
  txt('X CLOSE', box.panelX + box.panelW / 2, box.panelY + Math.max(2, (box.closeH - 10) / 2), 8, '#fff', 'center', 'Pixelify');
  CHEAT_ROWS.forEach((row, i) => {
    const y = box.top + i * box.rowH;
    const hov = region(box.panelX + 4, y, box.panelW - 8, box.rowH, row.go);
    ctx.fillStyle = hov ? '#3a2458' : '#241433';
    ctx.fillRect(box.panelX + 6, y + 1, box.panelW - 12, box.rowH - 2);
    ctx.strokeStyle = row.on && row.on() ? '#7dff5a' : '#6a4a90';
    ctx.strokeRect(box.panelX + 6.5, y + 1.5, box.panelW - 13, box.rowH - 3);
    const textY = y + Math.max(2, (box.rowH - 10) / 2);
    if (row.key === '1') {
      txt('1  Auto', box.panelX + 12, textY, 8, '#fff', 'left', 'Pixelify');
      const pill = auto ? 'ON' : 'OFF';
      ctx.font = '8px Pixelify';
      const pw = Math.ceil(ctx.measureText(pill).width) + 12;
      const ph = Math.max(10, box.rowH - 4);
      const px = box.panelX + box.panelW - 10 - pw;
      const py = y + Math.floor((box.rowH - ph) / 2);
      ctx.fillStyle = auto ? '#7dff5a' : '#3a2458';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = auto ? '#14300f' : '#c8b6dc';
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      txt(pill, px + pw / 2, py + Math.max(1, (ph - 8) / 2), 8, auto ? '#10240c' : '#fff', 'center', 'Pixelify', null);
    } else txt(row.key + '  ' + row.label(), box.panelX + 12, textY, 8, row.on && row.on() ? '#b6ff9a' : '#fff', 'left', 'Pixelify');
  });
  const footY = box.top + CHEAT_ROWS.length * box.rowH;
  const foot = cheatNoteT > 0 ? cheatNote : 'Shift+A';
  if (footY < box.panelY + box.panelH - 8) txt(foot, W / 2, footY, 7, cheatNoteT > 0 ? '#ffd23d' : '#b09cc8', 'center', 'Pixelify');
}
function drawCheatMark() {
  const bits = [];
  if (auto) bits.push('AUTO');
  if (speedMul !== 1) bits.push('x' + speedMul);
  if (godMode) bits.push('GOD');
  if (!bits.length || state === 'loading') return;
  const s = bits.join(' ');
  ctx.save(); ctx.globalAlpha = 0.72;
  ctx.font = '7px Pixelify';
  const w = Math.ceil(ctx.measureText(s).width);
  ctx.fillStyle = 'rgba(12,6,24,.55)';
  ctx.fillRect(W - w - 8, H - 13, w + 6, 9);
  txt(s, W - 4, H - 12, 7, '#d9c8ff', 'right', 'Pixelify', null);
  ctx.restore();
}
function autoBadgeBox() {
  const rect = cv.getBoundingClientRect();
  const scaleX = rect.width > 0 ? rect.width / W : 1;
  const scaleY = rect.height > 0 ? rect.height / H : 1;
  const scale = Math.min(scaleX, scaleY);
  const h = Math.max(18, Math.ceil(44 / scale));
  return { x: 4, y: H - h - 4, w: W - 8, h };
}
function drawAutoBadge() {
  if (!auto || cheatOpen || (state !== 'play' && state !== 'boss')) return;
  const b = autoBadgeBox();
  const hov = region(b.x, b.y, b.w, b.h, stopAutopilot);
  ctx.fillStyle = hov ? '#c6ff6a' : '#7dff5a';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = '#14300f';
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  txt('AUTO ON - tap to stop', b.x + b.w / 2, b.y + Math.max(2, (b.h - 10) / 2), 8, '#10240c', 'center', 'Pixelify', null);
}
function drawMute() {
  if (state === 'loading' || cheatOpen) return;
  const x = cheatOpen ? 150 : state === 'menu' ? 158 : 160;
  const y = cheatOpen ? 12 : state === 'menu' ? 186 : state === 'play' ? 20 : 2;
  const hov = region(x, y, 16, 12, toggleMute);
  ctx.fillStyle = hov ? '#3a2458' : 'rgba(12,6,24,.78)';
  ctx.fillRect(x, y, 16, 12);
  ctx.strokeStyle = muted ? '#886' : '#ffd23d';
  ctx.strokeRect(x + 0.5, y + 0.5, 15, 11);
  txt('M', x + 8, y + 2, 8, muted ? '#888' : '#ffd23d', 'center', 'Pixelify', null);
  if (muted) { ctx.strokeStyle = '#e23b4a'; ctx.beginPath(); ctx.moveTo(x + 3, y + 10); ctx.lineTo(x + 13, y + 2); ctx.stroke(); }
}
function autoAnswerBoss(realDt) {
  if (!auto || state !== 'boss' || !run || !run.boss || run.boss.answered || !run.boss.q) return;
  autoBossT += realDt;
  if (autoBossT >= 0.7) { autoBossT = 0; bossAnswer(run.boss.q.answer); }
}
// QWERTY: Shift+A is code KeyA, key "A". AZERTY: the letter A is code KeyQ, key "A"/"a".
function isShiftA(e) {
  if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;
  const key = String(e.key || '').toLowerCase();
  return key === 'a' || e.code === 'KeyA';
}
const AZERTY_DIGIT = { '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0' };
function digitFromEvent(e) {
  const code = e.code || '';
  if (code === 'Digit0' || code === 'Numpad0') return '0';
  if (/^Digit[1-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[1-9]$/.test(code)) return code.slice(6);
  const k = e.key || '';
  if (AZERTY_DIGIT[k]) return AZERTY_DIGIT[k];
  if (/^[0-9]$/.test(k)) return k;
  return '';
}
let logoTaps = [];
function tapLogo(pt) {
  if (state !== 'menu' || cheatOpen || !pt) return false;
  if (pt.x < 0 || pt.x > W || pt.y < 4 || pt.y > 96) return false;
  const now = performance.now();
  logoTaps.push(now);
  logoTaps = logoTaps.filter(t => now - t < 2500);
  if (logoTaps.length >= 5) { logoTaps = []; cheatOpen = true; }
  return true;
}

// ---------- input ----------
function toNative(e) { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * W, y: (e.clientY - b.top) / b.height * H }; }
function press(pt) {
  ensureAudio();
  if (pt) mouse = pt;
  if (tapLogo(pt)) return;
  for (let i = ui.length - 1; i >= 0; i--) { const u = ui[i]; if (mouse.x >= u.x && mouse.x < u.x + u.w && mouse.y >= u.y && mouse.y < u.y + u.h) { u.fn(); return; } }
  if (cheatOpen) return;
  if (state === 'play') flap();
}
const seenInput = new WeakSet();
let lastPressAt = 0;
function onPointerDown(e) {
  if (!e || typeof e !== 'object') return;
  if (typeof Event !== 'undefined' && e instanceof Event) {
    if (seenInput.has(e)) return;
    seenInput.add(e);
  }
  const now = performance.now();
  if (now - lastPressAt < 50) return;
  if (e.isPrimary === false) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const b = cv.getBoundingClientRect();
  const inside = e.clientX >= b.left && e.clientX < b.right && e.clientY >= b.top && e.clientY < b.bottom;
  if (!inside) {
    if (cheatOpen) { cheatOpen = false; lastPressAt = now; }
    return;
  }
  if (e.preventDefault) e.preventDefault();
  lastPressAt = now;
  press(toNative(e));
}
function onTouchStart(e) {
  if (!e || !e.touches || !e.touches[0]) return;
  if (seenInput.has(e)) return;
  seenInput.add(e);
  const t = e.touches[0];
  onPointerDown({
    clientX: t.clientX, clientY: t.clientY, pointerType: 'touch', button: 0, isPrimary: true,
    preventDefault() { if (e.cancelable) e.preventDefault(); }
  });
}
function onKeyDown(e) {
  if (seenInput.has(e)) return;
  seenInput.add(e);
  ensureAudio();
  if (isShiftA(e)) { e.preventDefault(); if (!e.repeat) cheatOpen = !cheatOpen; return; }
  const letter = String(e.key || '').toLowerCase();
  if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'KeyM' || letter === 'm')) {
    e.preventDefault(); if (!e.repeat) toggleMute(); return;
  }
  if (cheatOpen) {
    e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Escape') { cheatOpen = false; return; }
    const k = digitFromEvent(e); const row = CHEAT_ROWS.find(r => r.key === k); if (row) row.go();
    return;
  }
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') { e.preventDefault(); if (e.repeat) return;
    if (state === 'play') flap(); else if (state === 'menu' || state === 'over') newRun(); }
  if (state === 'boss' && run.boss && !run.boss.answered) {
    const k = digitFromEvent(e);
    if (k && k !== '0') { const o = run.boss.options && run.boss.options[+k - 1]; if (o) bossAnswer(o.i); }
  }
  if (state === 'shop' && e.code === 'Escape') state = 'menu';
}
window.addEventListener('keydown', onKeyDown, true);
document.addEventListener('keydown', onKeyDown, true);
window.addEventListener('pointerdown', onPointerDown, true);
cv.addEventListener('pointerdown', onPointerDown);
window.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
cv.addEventListener('touchstart', onTouchStart, { passive: false });
cv.addEventListener('pointermove', e => { mouse = toNative(e); });

// ---------- main loop ----------
let last = performance.now(), acc = 0;
function drawState() {
  if (state === 'loading') {
    ctx.fillStyle = '#0b0618'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#b07dff'; ctx.fillRect(30, 158, 120 * loadPct, 6); ctx.strokeStyle = '#fff'; ctx.strokeRect(29.5, 157.5, 121, 7);
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('Loading spooky stuff...', 90, 145);
  } else if (state === 'menu') drawMenu();
  else if (state === 'shop') drawShop();
  else if (state === 'play') drawPlay();
  else if (state === 'boss') drawBoss();
  else if (state === 'over') drawOver();
  if (!cheatOpen) drawCheatMark();
  drawAutoBadge();
  if (cheatOpen) drawCheat();
  drawMute();
}
function frame(now) {
  const el = Math.min(0.1, (now - last) / 1000); last = now;
  if (!cheatOpen) t += el;
  if (cheatNoteT > 0) cheatNoteT = Math.max(0, cheatNoteT - el);
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false;
  ui = [];
  pumpMusic();
  if (!cheatOpen && state === 'play') {
    if (speedMul === 1) { acc += el * 60; while (acc >= 1) { step(1); acc -= 1; if (state !== 'play') break; } }
    else { for (let i = 0; i < speedMul && state === 'play'; i++) step(1); acc = 0; }
  } else if (!cheatOpen && state === 'boss') {
    const showing = !!(run.boss && run.boss.answered);
    stepBoss(el * (showing ? 1 : speedMul));
    if (auto) autoAnswerBoss(el);
  }
  drawState();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
boot().catch(e => { console.error(e); state = 'loading'; });
