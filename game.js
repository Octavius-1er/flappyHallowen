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
function drawColumn(w, col) {
  const ob = M.worlds[w].obstacle, body = IMG[`world.${w}.obstacle.body_tile`];
  const x = Math.round(col.x);
  // top column: body tiles from 0 to gapTop-24, then cap_top
  for (let y = col.top - 24 - 32; y > -32; y -= 32) ctx.drawImage(body, x, y);
  spr(`world.${w}.obstacle.cap_top`, x + ob.cap_x_offset, col.top - 24);
  const by = col.top + col.gap;
  spr(`world.${w}.obstacle.cap_bottom`, x + ob.cap_x_offset, by);
  for (let y = by + 24; y < H; y += 32) ctx.drawImage(body, x, y);
}

// ---------- game state ----------
let state = 'loading', t = 0, run = null, quiz = null, over = null;
let shop = { cat: 0, page: 0, sel: 0, msg: '', msgT: 0 };
const PX = 6; // player canvas left x (small canvas 82x56)

function newRun() {
  const p = perks();
  run = {
    p, y: 120, vy: 0, cols: [], coins: [], bats: [], pick: [], fx: [], spawnX: 200, score: 0, scoreAcc: 0, colsPassed: 0,
    candy: 0, candyAcc: 0, lives: 1 + p.extraLife, maxLives: 3 + p.extraLife, shields: p.shields, inv: 0, ghost: p.ghostPass ? 1 : 0,
    bounce: p.groundBounce ? 1 : 0, petBat: p.petBat ? 1 : 0, magnetT: 0, slowT: 0, slowmoT: 0, batT: 4, world: save.world, prevWorld: null, fade: 0,
    banner: 'Tap to fly!', bannerT: 2, started: false, dead: 0, nextQuiz: 10, frame: 0
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
  const r = run; if (r.inv > 0 || r.dead) return;
  const c = hb();
  if (kind === 'column' && r.ghost > 0) { r.ghost--; r.inv = 1.2; r.banner = 'Ghost phase!'; r.bannerT = 1; return; }
  if (r.shields > 0) { r.shields--; r.inv = 1.2; addFx('fx.death_poof', c.x + c.w / 2 - 24, c.y + c.h / 2 - 24, 14, 6 / 14); return; }
  r.lives--; addFx('fx.death_poof', c.x + c.w / 2 - 24, c.y + c.h / 2 - 24, 14, 6 / 14);
  if (r.lives > 0) { r.inv = 1.6; r.vy = -3; return; }
  r.dead = 0.9; r.vy = -2;
}
function flap() { if (!run || run.dead) return; run.started = true; run.vy = -2.38 * run.p.flap; }

function step(dt) { // dt = 1 at 60fps
  const r = run; r.frame += dt;
  if (r.dead) { r.dead -= dt / 60; r.vy += 0.25 * dt; r.y += r.vy * dt; updFx(dt); if (r.dead <= 0) endRun(); return; }
  if (!r.started) { r.y = 120 + Math.sin(t * 4) * 4; scroll += 0.6 * dt; return; }
  const slow = (r.slowmoT > 0 ? 0.5 : 1); dt *= slow;
  const level = Math.min(r.score, 60);
  const speed = (1.1 + level * 0.004) * (r.slowT > 0 ? 0.6 : 1);
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
  // spawn columns
  r.spawnX -= speed * dt;
  if (r.spawnX <= W + 10) {
    const baseGap = (M.worlds[r.world].obstacle.suggested_gap || 96) * 1.3;
    const gap = Math.max(110, baseGap - level * 0.08);
    const top = 36 + Math.random() * (gy - 36 - 36 - gap);
    r.cols.push({ x: r.spawnX, top, gap, passed: false });
    if (Math.random() < 0.7) r.coins.push({ x: r.spawnX + 8, y: top + gap / 2 - 12, a: Math.random() * 6 });
    // coin arc between columns
    if (Math.random() < 0.5) { const yy = 60 + Math.random() * 160; for (let i = 0; i < 3; i++) r.coins.push({ x: r.spawnX + 64 + i * 14, y: yy - Math.sin(i / 2 * Math.PI) * 10, a: i }); }
    const roll = Math.random();
    if (roll < 0.06) r.pick.push({ k: 'fx.magnet_powerup', x: r.spawnX + 80, y: 60 + Math.random() * 150 });
    else if (roll < 0.10 && r.lives < r.maxLives) r.pick.push({ k: 'fx.heart', x: r.spawnX + 80, y: 60 + Math.random() * 150 });
    else if (roll < 0.14) r.pick.push({ k: 'fx.shield_bubble', x: r.spawnX + 80, y: 60 + Math.random() * 150 });
    r.spawnX += 136;
  }
  const ob = M.worlds[r.world].obstacle;
  for (const col of r.cols) {
    col.x -= speed * dt;
    const cx = col.x + ob.cap_x_offset, cw = ob.cap_width;
    const rects = [{ x: col.x, y: -50, w: ob.column_width, h: col.top - 24 + 50 }, { x: cx, y: col.top - 24, w: cw, h: 24 },
                   { x: cx, y: col.top + col.gap, w: cw, h: 24 }, { x: col.x, y: col.top + col.gap + 24, w: ob.column_width, h: 400 }];
    if (rects.some(q => ov(c, q))) hurt('column');
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
          if (window.QUESTIONS && QUESTIONS.length) startQuiz();
        }
      }
      if (r.p.slowmo10 && r.colsPassed % 10 === 0) r.slowmoT = 1;
    }
  }
  r.cols = r.cols.filter(q => q.x > -60);
  // coins + magnet
  const mag = Math.max(r.p.magnet, r.magnetT > 0 ? 60 : 0), pcx = c.x + c.w / 2, pcy = c.y + c.h / 2;
  for (const k of r.coins) {
    k.x -= speed * dt; k.a += dt / 5;
    const dx = pcx - (k.x + 12), dy = pcy - (k.y + 12), d = Math.hypot(dx, dy);
    if (mag && d < mag) { k.x += dx / d * 3 * dt; k.y += dy / d * 3 * dt; }
    if (d < 14) { k.got = true; giveCandy(1); addFx('fx.sparkle', k.x, k.y, 14, 4 / 14); }
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
  txt(String(r.score), W / 2, 28, 16, '#fff', 'center');
  let fy = 50; const tag = (s, col) => { txt(s, W / 2, fy, 8, col, 'center', 'Pixelify'); fy += 10; };
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

// ---------- quiz ----------
function startQuiz() {
  const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  quiz = { q, res: null, t: 0, reward: 20 }; state = 'quiz';
}
function answer(i) {
  if (quiz.res) return; const ok = i === quiz.q.answer;
  quiz.res = { ok, i, t: 0 };
  if (ok) giveCandy(quiz.reward);
}
function drawQuiz() {
  drawPlay();
  ctx.fillStyle = 'rgba(11,6,24,0.78)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a1648'; ctx.fillRect(8, 56, 164, 208); ctx.strokeStyle = '#b07dff'; ctx.lineWidth = 1; ctx.strokeRect(8.5, 56.5, 163, 207);
  txt('ENGLISH QUIZ!', W / 2, 64, 8, '#ffd23d', 'center');
  let y = 80; for (const l of wrap(quiz.q.q, 150, 10, 'Pixelify')) { txt(l, W / 2, y, 10, '#fff', 'center', 'Pixelify'); y += 12; }
  y = Math.max(y + 6, 118);
  quiz.q.choices.forEach((ch, i) => {
    const hov = !quiz.res && region(16, y, 148, 22, () => answer(i));
    let bg = hov ? '#ff8a3d' : '#6a3fb0';
    if (quiz.res) { if (i === quiz.q.answer) bg = '#2e9e4f'; else if (i === quiz.res.i) bg = '#b0303a'; }
    ctx.fillStyle = '#1a0d2e'; ctx.fillRect(16, y + 2, 148, 22); ctx.fillStyle = bg; ctx.fillRect(16, y, 148, 20);
    txt((i + 1) + '. ' + ch, 22, y + 5, 10, '#fff', 'left', 'Pixelify');
    y += 28;
  });
  if (quiz.res) {
    txt(quiz.res.ok ? 'Correct! +' + Math.floor(quiz.reward * run.p.coinMul) : 'Oops! Answer: ' + quiz.q.choices[quiz.q.answer], W / 2, 240, 8, quiz.res.ok ? '#7dff5a' : '#ff6b6b', 'center', 'Pixelify');
    if (quiz.res.ok) { spr('ui.coin_icon', 84, 226); }
    txt('Tap to continue', W / 2, 252, 8, '#ccc', 'center', 'Pixelify');
  } else txt('Answer for +' + Math.floor(quiz.reward * run.p.coinMul) + ' candy coins!', W / 2, 246, 8, '#ffd23d', 'center', 'Pixelify');
}

// ---------- game over ----------
function endRun() { save.best = Math.max(save.best, run.score); over = { score: run.score, candy: run.candy, newBest: run.score > 0 && run.score === save.best }; state = 'over'; }
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
  scroll += 0.4; drawWorld(save.world);
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
  save.coins -= p; save.owned.add(cat + '.' + name); equip(cat, name); flash('Bought! Enjoy!');
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
  if (shop.msgT > 0) { shop.msgT -= 1 / 60; txt(shop.msg, W / 2, 308, 8, '#ffd23d', 'center', 'Pixelify'); }
  else txt('PLAY from the menu to earn candy!', W / 2, 308, 8, '#888', 'center', 'Pixelify');
}

// ---------- input ----------
function toNative(e) { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * W, y: (e.clientY - b.top) / b.height * H }; }
function press(pt) {
  if (pt) mouse = pt;
  if (state === 'play') { flap(); return; }
  if (state === 'quiz' && quiz.res) { state = 'play'; run.inv = Math.max(run.inv, 0.8); run.vy = -2; return; }
  for (let i = ui.length - 1; i >= 0; i--) { const u = ui[i]; if (mouse.x >= u.x && mouse.x < u.x + u.w && mouse.y >= u.y && mouse.y < u.y + u.h) { u.fn(); return; } }
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); press(toNative(e)); });
cv.addEventListener('pointermove', e => { mouse = toNative(e); });
addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (e.repeat) return;
    if (state === 'play') flap(); else if (state === 'menu' || state === 'over') newRun(); else if (state === 'quiz' && quiz.res) press(); }
  if (state === 'quiz' && !quiz.res && /^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < quiz.q.choices.length) answer(i); }
  if (state === 'shop' && e.code === 'Escape') state = 'menu';
});

// ---------- main loop ----------
let last = performance.now(), acc = 0;
function frame(now) {
  const el = Math.min(0.1, (now - last) / 1000); last = now; t += el;
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false;
  ui = [];
  if (state === 'loading') {
    ctx.fillStyle = '#0b0618'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#b07dff'; ctx.fillRect(30, 158, 120 * loadPct, 6); ctx.strokeStyle = '#fff'; ctx.strokeRect(29.5, 157.5, 121, 7);
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('Loading spooky stuff...', 90, 145);
  } else if (state === 'menu') drawMenu();
  else if (state === 'shop') drawShop();
  else if (state === 'play') { acc += el * 60; while (acc >= 1) { step(1); acc -= 1; if (state !== 'play') break; } drawPlay(); }
  else if (state === 'quiz') { acc = 0; drawQuiz(); }
  else if (state === 'over') drawOver();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
boot().catch(e => { console.error(e); state = 'loading'; });
