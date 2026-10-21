const $ = id => document.getElementById(id);
const cv = $('fx'), ctx = cv.getContext('2d'), img = $('bg');
let W, H, sc, px = 0, py = 0, tx = 0, ty = 0, moved = false;

function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; sc = Math.max(W / 1536, H / 1024) * 1.05; }
addEventListener('resize', resize); resize();
// coordenadas de la imagen (1536x1024) -> pantalla (con parallax)
const mp = (x, y) => [W / 2 + (x - 768) * sc + px, H / 2 + (y - 512) * sc + py];

// ---------- cofre de Minecraft dibujado en pixeles ----------
(function drawChest() {
    const c = $('chest').getContext('2d'), R = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    R('#2a1408', 1, 2, 22, 17); R('#8a5a2b', 2, 3, 20, 15); R('#a8743a', 2, 3, 20, 2); R('#2a1408', 1, 9, 22, 1);
    [6, 12, 17].forEach(x => { R('#6b4220', x, 4, 1, 5); R('#6b4220', x, 10, 1, 8); });
    R('#7a8296', 4, 3, 2, 15); R('#7a8296', 18, 3, 2, 15); R('#b9c0d4', 4, 3, 1, 15); R('#b9c0d4', 18, 3, 1, 15);
    R('#2a1408', 9, 7, 6, 6); R('#ffd45a', 10, 8, 4, 4); R('#2a1408', 11, 10, 2, 2);
    R('#ff6fb5', 8, 5, 1, 1); R('#ff6fb5', 10, 5, 1, 1); R('#ff6fb5', 8, 6, 3, 1); R('#ff6fb5', 9, 7, 1, 1);
    R('#4a2a12', 2, 16, 20, 2);
})();

// ---------- audio ----------
let AC; const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
function sfx(k) {
    const a = ac(); if (a.state === 'suspended') a.resume();
    const n = a.currentTime, v = a.createGain(); v.connect(a.destination);
    if (k === 'boom') {
        const len = a.sampleRate, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const s = a.createBufferSource(), f = a.createBiquadFilter(); s.buffer = buf; f.type = 'lowpass';
        f.frequency.setValueAtTime(1000, n); f.frequency.exponentialRampToValueAtTime(100, n + 1);
        v.gain.setValueAtTime(.5, n); v.gain.exponentialRampToValueAtTime(.01, n + 1);
        s.connect(f); f.connect(v); s.start(); return;
    }
    if (k === 'open') {
        [523, 659, 784, 1047].forEach((fr, i) => {
            const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = fr;
            g.gain.setValueAtTime(.2, n + i * .08); g.gain.exponentialRampToValueAtTime(.01, n + i * .08 + .35);
            o.connect(g); g.connect(a.destination); o.start(n + i * .08); o.stop(n + i * .08 + .35);
        }); return;
    }
    const up = k === 'launch', o = a.createOscillator(), dur = up ? .5 : .1;
    o.type = up ? 'sine' : 'square'; o.frequency.setValueAtTime(up ? 200 : 150, n); o.frequency.exponentialRampToValueAtTime(up ? 800 : 50, n + dur);
    v.gain.setValueAtTime(up ? .3 : .2, n); v.gain.exponentialRampToValueAtTime(.01, n + dur);
    o.connect(v); o.start(); o.stop(n + dur);
}

// ---------- efectos ----------
// luces: [x, y, radio, color] en coordenadas de la imagen
const G = [[243, 243, 70, '255,190,100'], [117, 375, 80, '255,190,100'], [100, 840, 150, '255,170,70'], [357, 447, 45, '255,190,100'],
    [600, 365, 55, '255,190,100'], [540, 410, 45, '255,190,100'], [495, 425, 40, '255,190,100'], [930, 230, 90, '255,200,120'],
    [985, 170, 60, '255,200,120'], [1205, 608, 55, '255,190,100'], [1258, 440, 35, '255,190,100'], [1292, 440, 35, '255,190,100'],
    [685, 452, 35, '255,190,100'], [745, 452, 35, '255,190,100'], [815, 452, 35, '255,190,100']];
const MOON = [1125, 135, 170, '210,180,255'];
const sparks = [...Array(80)].map(() => ({ x: 650 + Math.random() * 520, y: 460 + Math.random() * 160, p: Math.random() * 6 }));
const flies = [...Array(30)].map(() => ({ x: Math.random() * 1536, y: 420 + Math.random() * 480, p: Math.random() * 6 }));
const petals = [...Array(70)].map(() => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, z: 3 + Math.random() * 5,
    v: .5 + Math.random() * .9, a: Math.random() * 6, s: (Math.random() - .5) * .08, c: ['#ffb3d9', '#ffc9e6', '#ff8cc6'][Math.random() * 3 | 0] }));
let hearts = [], shoots = [], nextShoot = 2500, nextHeart = 0;
const fw = [], pt = [];

function glow(x, y, r, col, a) {
    const q = ctx.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, `rgba(${col},${a})`); q.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = q; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function heart(x, y, s, col) {
    ctx.fillStyle = col;
    [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]].forEach(([i, j]) => ctx.fillRect(x + i * s, y + j * s, s, s));
}
const mk = (x, y, c, vx, vy, gv) => ({ x, y, c, vx, vy, gv, l: 1, d: Math.random() * .015 + .015, z: 3 + Math.random() * 4 });
function boom(x, y) {
    sfx('boom');
    if (Math.random() > .5) for (let i = 0; i < 6.28; i += .1)
        pt.push(mk(x, y, '#ff3a6e', 16 * Math.sin(i) ** 3 * .45, -(13 * Math.cos(i) - 5 * Math.cos(2 * i) - 2 * Math.cos(3 * i) - Math.cos(4 * i)) * .45, .05));
    else { const c = ['#55ffff', '#ffaa00', '#55ff55', '#ff55ff', '#ffffff'][Math.random() * 5 | 0];
        for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, s = Math.random() * 6 + 1; pt.push(mk(x, y, c, Math.cos(a) * s, Math.sin(a) * s, .1)); } }
}
function launch(tx_, ty_) {
    sfx('launch'); const a = Math.atan2(ty_ - H, tx_ - W / 2);
    fw.push({ x: W / 2, y: H, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, d: Math.hypot(tx_ - W / 2, ty_ - H), tx: tx_, ty: ty_ });
}

function frame(t) {
    if (!moved) { tx = Math.sin(t / 4500) * 9; ty = Math.cos(t / 6000) * 5; }
    px += (tx - px) * .06; py += (ty - py) * .06;
    img.style.transform = `translate(${px}px,${py}px) scale(1.05)`;
    ctx.clearRect(0, 0, W, H);

    // luces que parpadean
    ctx.globalCompositeOperation = 'lighter';
    G.forEach(([x, y, r, c], i) => { const [X, Y] = mp(x, y); glow(X, Y, r * sc, c, .24 + .12 * Math.sin(t / 230 + i * 1.7) + .04 * Math.sin(t / 90 + i)); });
    { const [X, Y] = mp(MOON[0], MOON[1]); glow(X, Y, MOON[2] * sc, MOON[3], .32 + .08 * Math.sin(t / 900)); }
    // brillo del cofre
    const cr = $('chest').getBoundingClientRect();
    if (!$('chest').classList.contains('squash') && !bookOpen) glow(cr.left + cr.width / 2, cr.top + cr.height / 2, cr.width * 1.2, '255,120,200', .3 + .12 * Math.sin(t / 400));
    // destellos del lago
    for (const s of sparks) {
        const a = Math.sin(t / 500 + s.p); if (a < .3) continue; const [X, Y] = mp(s.x, s.y);
        ctx.fillStyle = `rgba(255,220,245,${a})`; ctx.fillRect(X, Y, 3 * sc + 1, 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // luciérnagas
    for (const f of flies) {
        f.x += Math.sin(t / 1500 + f.p) * .5; f.y += Math.cos(t / 1100 + f.p * 2) * .4;
        const [X, Y] = mp(f.x, f.y), a = .5 + .5 * Math.sin(t / 400 + f.p);
        ctx.fillStyle = `rgba(255,233,160,${a * .25})`; ctx.fillRect(X - 4, Y - 4, 9, 9);
        ctx.fillStyle = `rgba(255,233,160,${a})`; ctx.fillRect(X - 1, Y - 1, 3, 3);
    }

    // pétalos con viento
    const wd = Math.sin(t * .0004) * .6 + Math.sin(t * .0013 + 2) * .3;
    for (const p of petals) {
        p.a += p.s; p.x += Math.sin(p.a) * .8 + .9 + wd; p.y += p.v;
        if (p.y > H + 10 || p.x > W + 20) { p.y = -10; p.x = Math.random() * W * .8; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.ellipse(0, 0, p.z, p.z * .5, 0, 0, 7); ctx.fill(); ctx.restore();
    }

    // corazoncitos que salen del cofre
    if (!bookOpen && t > nextHeart) { nextHeart = t + 450; hearts.push({ x: cr.left + cr.width * (.25 + Math.random() * .5), y: cr.top + cr.height * .3, vy: -(.6 + Math.random() * .8), l: 1, s: 3 + (Math.random() * 3 | 0), p: Math.random() * 6 }); }
    hearts = hearts.filter(h => h.l > 0);
    for (const h of hearts) { h.y += h.vy; h.x += Math.sin(t / 300 + h.p) * .6; h.l -= .008; ctx.globalAlpha = Math.max(0, h.l); heart(h.x, h.y, h.s, '#ff6fb5'); }
    ctx.globalAlpha = 1;

    // estrellas fugaces
    if (t > nextShoot) { nextShoot = t + 3000 + Math.random() * 4000; const [X, Y] = mp(500 + Math.random() * 950, 20 + Math.random() * 220); shoots.push({ x: X, y: Y, vx: -(10 + Math.random() * 6), vy: 5 + Math.random() * 3, l: 1 }); }
    shoots = shoots.filter(s => s.l > 0);
    for (const s of shoots) {
        s.x += s.vx; s.y += s.vy; s.l -= .018;
        const q = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 7, s.y - s.vy * 7);
        q.addColorStop(0, `rgba(255,255,255,${s.l})`); q.addColorStop(1, 'rgba(255,200,240,0)');
        ctx.strokeStyle = q; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 7, s.y - s.vy * 7); ctx.stroke();
    }

    // fuegos artificiales
    for (let i = fw.length - 1; i >= 0; i--) {
        const f = fw[i]; f.x += f.vx; f.y += f.vy; f.d -= 12; ctx.fillStyle = '#fff'; ctx.fillRect(f.x, f.y, 4, 4);
        if (f.d <= 0) { boom(f.tx, f.ty); fw.splice(i, 1); }
    }
    for (let i = pt.length - 1; i >= 0; i--) {
        const p = pt[i]; p.vy += p.gv; p.x += p.vx; p.y += p.vy; p.l -= p.d;
        if (p.l <= 0) { pt.splice(i, 1); continue; }
        ctx.globalAlpha = p.l; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.z, p.z);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('pointermove', e => { moved = true; tx = -(e.clientX / W - .5) * 22; ty = -(e.clientY / H - .5) * 14; });
// tocar el cielo / fondo lanza fuegos artificiales
document.addEventListener('click', e => { if (!e.target.closest('.hot')) launch(e.clientX, e.clientY); });

// ---------- cofre -> libro ----------
const chest = $('chest'), book = $('book'), scrim = $('scrim'), burst = $('burst');
let bookOpen = false, busy = false, pg = 1;

function page(n) {
    pg = n; $('s1').classList.toggle('hidden', n !== 1); $('s2').classList.toggle('hidden', n !== 2);
    $('pgnum').textContent = n + ' / 2'; $('prev').disabled = n === 1; $('next').disabled = n === 2;
}
function openLetter(n = 1) {
    if (busy) return; if (bookOpen) { page(n); return; }
    busy = true; sfx('open');
    burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go');
    chest.classList.remove('pop'); chest.classList.add('squash'); // el cofre se aplana
    setTimeout(() => {
        page(n); scrim.classList.remove('hidden'); book.classList.remove('hidden', 'fold'); book.classList.add('unfold');
        bookOpen = true; busy = false;
    }, 420);
}
function closeLetter() {
    if (busy || !bookOpen) return; busy = true; sfx('page');
    book.classList.remove('unfold'); book.classList.add('fold');
    setTimeout(() => {
        book.classList.add('hidden'); scrim.classList.add('hidden'); bookOpen = false;
        chest.classList.remove('squash'); chest.classList.add('pop'); busy = false;
    }, 450);
}
chest.addEventListener('click', () => openLetter(1));
chest.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openLetter(1); });
$('closeBook').onclick = closeLetter;
scrim.onclick = closeLetter;
$('prev').onclick = () => { sfx('page'); page(1); };
$('next').onclick = () => { sfx('page'); page(2); };
addEventListener('keydown', e => { if (e.key === 'Escape') closeLetter(); });

// ---------- menú ----------
$('n-home').onclick = closeLetter;
$('n-letter').onclick = () => openLetter(2);
$('n-explore').onclick = () => { for (let i = 0; i < 6; i++) setTimeout(() => launch(W * (.15 + Math.random() * .7), H * (.08 + Math.random() * .3)), i * 350); };
$('n-world').onclick = () => {
    for (let i = 0; i < 50; i++) petals.push({ x: Math.random() * W * .5, y: -Math.random() * H * .4, z: 3 + Math.random() * 5, v: .8 + Math.random(), a: Math.random() * 6, s: (Math.random() - .5) * .08, c: '#ffb3d9' });
    if (petals.length > 200) petals.splice(0, petals.length - 200);
    nextShoot = 0;
};
page(1);
