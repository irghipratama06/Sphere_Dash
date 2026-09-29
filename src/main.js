import { autoConnect } from '@unicitylabs/sphere-sdk/connect/browser';
import { SPHERE_NETWORKS } from '@unicitylabs/sphere-sdk/connect';
const E = import.meta.env;
const C = { TREASURY: E.VITE_TREASURY || '', PRICE: E.VITE_PRICE || '5', COIN: E.VITE_COIN || 'UCT', TRIES: 20, SPEED: 340 };
const $ = id => document.getElementById(id);
const cv = $('c'), g = cv.getContext('2d'); let W, H, GY;
const rs = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; GY = H - 90 }; rs(); addEventListener('resize', rs);
const img = new Image(); img.src = '/char.jpeg';
let client = null, who = null, tries = 0, st = 'menu', held = false;
const setTries = n => { tries = n; try { localStorage.setItem('gd_' + who, n) } catch {} $('tries').textContent = n };
const msg = t => $('msg').textContent = t;

// ---------- leaderboard (server-side, real) ----------
async function loadLB() {
  try {
    const r = await (await fetch('/api/leaderboard')).json();
    $('rows').innerHTML = (r.rows || []).map((x, i) => `<div><span>${i + 1}. ${String(x.addr).slice(0, 18)}</span><b>${x.dist} m</b></div>`).join('') || '<div>Belum ada skor</div>';
  } catch { $('rows').innerHTML = '<div>Leaderboard belum aktif</div>' }
}
const post = (dist, ms) => fetch('/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ addr: who, dist, ms }) }).then(loadLB).catch(() => {});

// ---------- wallet ----------
async function connect() {
  try {
    const r = await autoConnect({
      dapp: { name: 'Unicity Dash', url: location.origin, icon: location.origin + '/char.jpeg' },
      network: SPHERE_NETWORKS.testnet2, permissions: ['identity:read', 'transfer:request'],
      walletUrl: 'https://sphere.unicity.network', silent: false });
    client = r.client; const id = r.connection.identity; who = id.nametag || id.directAddress;
    client.on?.('wallet:disconnected', () => { client = null; who = null; st = 'menu'; ui() });
    let n = 0; try { n = +localStorage.getItem('gd_' + who) || 0 } catch {} setTries(n); ui();
  } catch (e) { msg('Gagal connect: ' + (e.message || e.code)) }
}
async function deposit() {
  if (!C.TREASURY) return msg('VITE_TREASURY belum diisi di Vercel.');
  try {
    msg('Konfirmasi di wallet…');
    await client.intent('send', { to: C.TREASURY, amount: C.PRICE, coinId: C.COIN, memo: 'Unicity Dash 20 tries' });
    setTries(tries + C.TRIES); msg('Deposit berhasil! +20 percobaan'); ui();
  } catch (e) {
    const c = e && e.code;
    msg(c === 4003 ? 'Dibatalkan di wallet.' : c === 4201 ? 'Status transfer belum pasti. JANGAN bayar ulang, cek wallet dulu.' : 'Gagal: ' + (e.message || c));
  }
}
function ui() {
  $('ov').style.display = st === 'play' ? 'none' : 'flex'; const b = $('btn');
  if (!client) { b.textContent = 'Connect Wallet'; b.onclick = connect }
  else if (tries <= 0) { b.textContent = `Deposit ${C.PRICE} UCT = ${C.TRIES} percobaan`; b.onclick = deposit }
  else { b.textContent = st === 'dead' ? 'Coba Lagi' : 'Main'; b.onclick = start }
}

// ---------- game ----------
let P, obs, sc, seed, nextX, t0, last;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
function start() {
  if (tries <= 0) return ui();
  setTries(tries - 1); P = { y: GY - 40, vy: 0, rot: 0, on: true }; obs = []; sc = 0; nextX = 700; seed = Date.now() >>> 0;
  t0 = last = performance.now(); st = 'play'; ui(); requestAnimationFrame(loop);
}
function die() {
  st = 'dead'; const dist = Math.floor(sc / 10), ms = Math.round(performance.now() - t0);
  msg(`Game over! Jarak: ${dist} m` + (tries <= 0 ? ' — percobaan habis, deposit lagi.' : ` — sisa ${tries} percobaan`));
  if (dist > 0) post(dist, ms); ui();
}
function loop(now) {
  if (st !== 'play') return;
  const dt = Math.min((now - last) / 1000, 0.033); last = now; sc += C.SPEED * dt;
  while (nextX < sc + W + 300) {
    const r = rnd();
    if (r < .55) { const n = 1 + (rnd() * 3 | 0); obs.push({ x: nextX, t: 's', w: 30 * n, h: 30 }); nextX += 30 * n }
    else { obs.push({ x: nextX, t: 'b', w: 40, h: 40 }); nextX += 40 }
    nextX += 280 + rnd() * 220;
  }
  obs = obs.filter(o => o.x + o.w > sc - 200);
  const px = sc + 110, prevB = P.y + 40;
  if (held && P.on) { P.vy = -820; P.on = false }
  P.vy += 2600 * dt; P.y += P.vy * dt; P.on = false;
  if (P.y >= GY - 40) { P.y = GY - 40; P.vy = 0; P.on = true }
  for (const o of obs) {
    if (o.x > px + 40 || o.x + o.w < px) continue;
    if (o.t === 's') { if (o.x + 8 < px + 36 && o.x + o.w - 8 > px + 4 && P.y + 40 > GY - 24) return die() }
    else if (P.y + 40 > GY - o.h) {
      if (prevB <= GY - o.h + 10 && P.vy >= 0) { P.y = GY - o.h - 40; P.vy = 0; P.on = true } else return die();
    }
  }
  P.rot = P.on ? Math.round(P.rot / (Math.PI / 2)) * Math.PI / 2 : P.rot + dt * Math.PI * 1.6;
  draw(); $('dist').textContent = Math.floor(sc / 10) + ' m'; requestAnimationFrame(loop);
}
function draw() {
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#000'); bg.addColorStop(1, '#3a1d00'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ff8a00'; g.fillRect(0, GY, W, 3); g.fillStyle = '#111'; g.fillRect(0, GY + 3, W, H);
  for (const o of obs) {
    const x = o.x - sc;
    if (o.t === 'b') { g.fillStyle = '#222'; g.fillRect(x, GY - o.h, o.w, o.h); g.strokeStyle = '#ff8a00'; g.strokeRect(x, GY - o.h, o.w, o.h) }
    else { g.fillStyle = '#fff'; for (let i = 0; i < o.w / 30; i++) { g.beginPath(); g.moveTo(x + i * 30, GY); g.lineTo(x + i * 30 + 15, GY - 30); g.lineTo(x + i * 30 + 30, GY); g.fill() } }
  }
  g.save(); g.translate(130, P.y + 20); g.rotate(P.rot); g.drawImage(img, -20, -20, 40, 40); g.strokeStyle = '#fff'; g.strokeRect(-20, -20, 40, 40); g.restore();
}
addEventListener('pointerdown', () => held = true); addEventListener('pointerup', () => held = false);
addEventListener('keydown', e => { if (e.code === 'Space') held = true }); addEventListener('keyup', e => { if (e.code === 'Space') held = false });
P = { y: GY - 40, vy: 0, rot: 0 }; obs = []; sc = 0; img.onload = () => draw(); loadLB(); ui();
