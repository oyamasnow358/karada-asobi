  /* ============================================================
     ゲーム（つづき）
     ============================================================ */
  const EMO_FONT = 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif';
  function emo(g, e, x, y, size) { g.font = size + 'px ' + EMO_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, x, y); }
  const handPts = (B, feet) => !B || !B.ok ? [] : [B.lw, B.rw, B.li, B.ri].concat(feet && B.hasLegs ? [B.la, B.ra] : []).filter(p => B.vis(p));

  /* ---------- 6. まどを ふこう ---------- */
  const SCENES = [
    { top: '#4DABF7', bottom: '#1864AB', items: ['🐳', '🐠', '🐙', '🐢', '🐡', '🦀', '🐬', '🫧'] },
    { top: '#FFE066', bottom: '#8CE99A', items: ['🎡', '🎠', '🍦', '🎈', '🌻', '🦋', '🐶', '🌈'] },
    { top: '#343A40', bottom: '#5F3DC4', items: ['🚀', '🪐', '⭐', '🌙', '👽', '🛸', '🌟', '☄️'] },
    { top: '#FFC9C9', bottom: '#FFE8CC', items: ['🍰', '🍓', '🍩', '🧁', '🍭', '🍪', '🍫', '🍬'] },
    { top: '#C3FAE8', bottom: '#69DB7C', items: ['🦁', '🐘', '🦒', '🦓', '🐒', '🌴', '🦜', '🐊'] }
  ];
  GAMES.push({
    id: 'mado', name: 'まどを ふこう', e: '🧽', unit: 'まい', bgm: 'calm', legs: false,
    desc: 'くもった まどを ゴシゴシ。なにが かくれて いるかな？', how: 'てで ゴシゴシ ふいて みよう',
    perMin: [1, 2, 3],
    create(K) {
      const GX = 32, GY = 20;
      let fog = null, grid = null, scene = null, placed = [], cleared = 0, wait = 0, lastIdx = -1;
      function newPic() {
        let i; do { i = Math.floor(Math.random() * SCENES.length); } while (i === lastIdx && SCENES.length > 1); lastIdx = i;
        scene = SCENES[i]; placed = [];
        for (let k = 0; k < 7; k++) placed.push({ e: pick(scene.items), x: rnd(0.1, 0.9), y: rnd(0.15, 0.85), s: rnd(0.1, 0.17), ph: rnd(0, 6) });
        fog = document.createElement('canvas'); fog.width = Math.max(2, Math.round(K.W / 2)); fog.height = Math.max(2, Math.round(K.H / 2));
        const f = fog.getContext('2d');
        f.fillStyle = 'rgba(225,232,240,.97)'; f.fillRect(0, 0, fog.width, fog.height);
        for (let k = 0; k < 140; k++) { f.fillStyle = 'rgba(255,255,255,' + rnd(0.2, 0.6) + ')'; f.beginPath(); f.arc(rnd(0, fog.width), rnd(0, fog.height), rnd(2, 9), 0, 7); f.fill(); }
        grid = new Uint8Array(GX * GY); cleared = 0;
        K.say('まどを ふいてね');
      }
      function wipe(x, y, r) {
        const f = fog.getContext('2d'); f.globalCompositeOperation = 'destination-out';
        const sx = fog.width / K.W, sy = fog.height / K.H;
        f.beginPath(); f.arc(x * sx, y * sy, r * sx, 0, 7); f.fill(); f.globalCompositeOperation = 'source-over';
        const cw = K.W / GX, ch = K.H / GY;
        for (let gy = Math.max(0, Math.floor((y - r) / ch)); gy <= Math.min(GY - 1, Math.floor((y + r) / ch)); gy++)
          for (let gx = Math.max(0, Math.floor((x - r) / cw)); gx <= Math.min(GX - 1, Math.floor((x + r) / cw)); gx++) {
            const i = gy * GX + gx; if (!grid[i] && Math.hypot((gx + 0.5) * cw - x, (gy + 0.5) * ch - y) < r) { grid[i] = 1; cleared++; }
          }
      }
      const prev = {};
      function picture(g) {
        sky(g, K.W, K.H, scene.top, scene.bottom);
        placed.forEach(p => emo(g, p.e, p.x * K.W + Math.sin(K.t * 1.5 + p.ph) * 8, p.y * K.H + Math.cos(K.t * 1.2 + p.ph) * 6, Math.round(p.s * Math.min(K.W, K.H) * 1.4)));
      }
      function drawFog(g) { if (fog) g.drawImage(fog, 0, 0, K.W, K.H); }
      return {
        avatarAlpha: 0.22,
        drawBg(g) { if (!scene) return; picture(g); drawFog(g); },
        update(dt, B) {
          if (!fog || fog.width !== Math.round(K.W / 2)) newPic();
          if (wait > 0) { wait -= dt; if (wait <= 0) newPic(); return; }
          if (!B || !B.ok) return;
          const r = B.sw * [0.75, 0.6, 0.48][K.diff];
          // てくびの うごいた 道を つなげて ふく（はやく うごかしても すきまが できない）
          ['lw', 'rw', 'li', 'ri'].forEach(k => {
            const p = B[k]; if (!B.vis(p)) { prev[k] = null; return; }
            const q = prev[k] || p, n = Math.max(1, Math.ceil(Math.hypot(p.x - q.x, p.y - q.y) / (r * 0.5)));
            for (let i = 1; i <= n; i++) wipe(q.x + (p.x - q.x) * i / n, q.y + (p.y - q.y) * i / n, r);
            prev[k] = { x: p.x, y: p.y };
          });
          if (Math.random() < dt * 6) K.sfx('flap');
          if (cleared / (GX * GY) >= [0.75, 0.85, 0.92][K.diff]) {
            const f = fog.getContext('2d'); f.clearRect(0, 0, fog.width, fog.height);
            K.sfx('good'); K.add(1, K.W / 2, K.H / 2); K.msg('ピカピカ！', pick(PRAISE), 1500); K.burst(K.W / 2, K.H / 2, ['#fff', '#FFD43B', '#74C0FC'], 30); wait = 2.2;
          }
        },
        draw(g, B) {
          if (K.look !== 'chara') drawFog(g);   // カメラ表示：じぶんの すがたが 見えてくる
          if (B && B.ok) [B.lw, B.rw].forEach(p => { if (B.vis(p)) emo(g, '🧽', p.x, p.y, Math.round(B.sw * 0.7)); });
          const pct = Math.min(100, Math.round(cleared / (GX * GY) * 100 / [0.75, 0.85, 0.92][K.diff]));
          g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(K.W / 2 - 110, K.H - 50, 220, 26); g.fillStyle = '#4DABF7'; g.fillRect(K.W / 2 - 106, K.H - 46, 212 * pct / 100, 18);
        }
      };
    }
  });

  /* ---------- 7. ボールを とめよう（キーパー） ---------- */
  GAMES.push({
    id: 'keeper', name: 'ボールを とめよう', e: '🧤', unit: 'こ', bgm: 'bounce', legs: false,
    desc: 'とんでくる ボールを てで キャッチ！', how: 'ボールを よく みて キャッチ！',
    perMin: [8, 14, 20],
    create(K) {
      const balls = []; let next = 1.2;
      const DUR = [2.4, 1.8, 1.25][K.diff];
      const BALLS = ['⚽', '🏀', '🏐', '🎾', '⚾', '🍎', '🧸'];
      return {
        avatarAlpha: 1,
        drawBg(g) {
          sky(g, K.W, K.H, '#D3F9D8', '#B2F2BB');
          g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 8;
          g.strokeRect(K.W * 0.08, K.H * 0.1, K.W * 0.84, K.H * 0.95);   // ゴール
          g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
          for (let x = K.W * 0.08; x < K.W * 0.92; x += 34) { g.beginPath(); g.moveTo(x, K.H * 0.1); g.lineTo(x, K.H); g.stroke(); }
          for (let y = K.H * 0.1; y < K.H; y += 34) { g.beginPath(); g.moveTo(K.W * 0.08, y); g.lineTo(K.W * 0.92, y); g.stroke(); }
        },
        update(dt, B) {
          next -= dt;
          if (B && B.ok && next <= 0 && balls.length < 2) {
            next = [2.2, 1.6, 1.1][K.diff];
            const reach = B.sw * (K.seated ? 1.6 : 2.0);
            const tx = clamp(B.sx + rnd(-reach, reach), K.W * 0.12, K.W * 0.88), ty = clamp(B.sy + rnd(-B.sw * 1.3, B.sw * 0.9), K.H * 0.12, K.H * 0.85);
            balls.push({ sx: K.W / 2 + rnd(-K.W * 0.2, K.W * 0.2), sy: K.H * 0.25, tx, ty, t: 0, e: pick(BALLS), r: B.sw * [0.55, 0.45, 0.38][K.diff], done: false });
          }
          const hp = handPts(B, false);
          for (let i = balls.length - 1; i >= 0; i--) {
            const b = balls[i]; b.t += dt / DUR;
            const k = Math.min(1, b.t), e = k * k;
            b.x = b.sx + (b.tx - b.sx) * e; b.y = b.sy + (b.ty - b.sy) * e - Math.sin(k * Math.PI) * K.H * 0.12; b.s = 0.25 + 0.75 * e;
            if (!b.done && k > 0.72 && hp.some(p => Math.hypot(p.x - b.x, p.y - b.y) < b.r * b.s + B.sw * 0.25)) {
              b.done = true; balls.splice(i, 1); K.sfx('good'); K.add(1, b.x, b.y); K.burst(b.x, b.y, ['#FFD43B', '#fff', '#69DB7C'], 20);
              if (Math.random() < 0.3) K.msg('ナイス キャッチ！', null, 900);
              continue;
            }
            if (b.t > 1.15) { balls.splice(i, 1); K.sfx('flap'); }
          }
        },
        draw(g) {
          balls.forEach(b => {
            if (K.diff === 0 && b.t < 1) { g.strokeStyle = 'rgba(255,146,43,' + (0.3 + 0.5 * b.t) + ')'; g.lineWidth = 5; g.setLineDash([10, 8]); g.beginPath(); g.arc(b.tx, b.ty, b.r, 0, 7); g.stroke(); g.setLineDash([]); }
            g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(b.x, K.H * 0.95, b.r * b.s, b.r * b.s * 0.25, 0, 0, 7); g.fill();
            g.save(); g.translate(b.x, b.y); g.rotate(b.t * 8); emo(g, b.e, 0, 0, Math.round(b.r * 2 * b.s)); g.restore();
          });
        }
      };
    }
  });

  /* ---------- 8. そらに なぞろう ---------- */
  const SHAPES = [
    { n: 'まる', e: '⭕', f: t => [Math.cos(t * 2 * Math.PI), Math.sin(t * 2 * Math.PI)] },
    { n: 'しかく', e: '🟦', f: t => { const k = t * 4, s = Math.floor(k) % 4, u = k - Math.floor(k) * 1; const v = u * 2 - 1; return [[v, -1], [1, v], [-v, 1], [-1, -v]][s]; } },
    { n: 'さんかく', e: '🔺', f: t => { const P = [[0, -1], [0.95, 0.75], [-0.95, 0.75]]; const k = t * 3, s = Math.floor(k) % 3, u = k - Math.floor(k); const a = P[s], b = P[(s + 1) % 3]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; } },
    { n: 'なみなみ', e: '🌊', f: t => [t * 2.4 - 1.2, Math.sin(t * Math.PI * 4) * 0.45] },
    { n: 'ハート', e: '❤️', f: t => { const a = t * 2 * Math.PI; return [16 * Math.pow(Math.sin(a), 3) / 16, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16]; } },
    { n: 'ほし', e: '⭐', f: t => { const k = t * 10, s = Math.floor(k) % 10, u = k - Math.floor(k); const pt = i => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.45 : 1; return [Math.cos(a) * r, Math.sin(a) * r]; }; const a = pt(s), b = pt(s + 1); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; } },
    { n: 'ぐるぐる', e: '🌀', f: t => { const a = t * 4 * Math.PI, r = 0.25 + t * 0.8; return [Math.cos(a) * r, Math.sin(a) * r]; } }
  ];
  GAMES.push({
    id: 'nazoru', name: 'そらに なぞろう', e: '🖌️', unit: 'こ', bgm: 'calm', legs: false,
    desc: 'ゆびで そらに まる・さんかく・ハートを かこう', how: 'ゆびさきで てんてんを なぞろう',
    perMin: [1.5, 2.5, 3.5],
    create(K) {
      let sh = null, pts = [], wait = 0, cx = 0, cy = 0, R = 0, bag = [], hue = 0;
      const trail = [];
      function next(B) {
        if (!bag.length) bag = SHAPES.slice(0, K.diff === 0 ? 4 : 7).sort(() => Math.random() - 0.5);
        sh = bag.pop();
        R = B.sw * (K.seated ? 1.1 : 1.3); cx = clamp(B.sx, R * 1.3, K.W - R * 1.3); cy = clamp(B.sy - B.sw * 0.2, R * 1.1 + 40, K.H - R * 1.1);
        const n = [16, 24, 32][K.diff];
        pts = Array.from({ length: n }, (_, i) => { const [x, y] = sh.f(i / n); return { x: cx + x * R, y: cy + y * R, on: false }; });
        K.say(sh.n + ' を かこう');
      }
      return {
        avatarAlpha: 0.5,
        drawBg(g) { sky(g, K.W, K.H, '#1B1F3B', '#3B2F63'); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(K.t * 2 + i)) + ')'; g.fillRect((i * 97) % K.W, (i * 53) % (K.H * 0.8), 3, 3); } },
        update(dt, B) {
          if (wait > 0) { wait -= dt; if (wait <= 0) sh = null; return; }
          if (!B || !B.ok) return;
          if (!sh) next(B);
          const hp = [B.li, B.ri].filter(p => B.vis(p));
          hp.forEach(p => { trail.push({ x: p.x, y: p.y, t: K.t, c: 'hsl(' + (hue = (hue + 4) % 360) + ',90%,65%)' }); });
          while (trail.length && K.t - trail[0].t > 1.6) trail.shift();
          const rad = B.sw * [0.42, 0.32, 0.25][K.diff];
          pts.forEach(q => { if (!q.on && hp.some(p => Math.hypot(p.x - q.x, p.y - q.y) < rad)) { q.on = true; K.sfx('coin'); K.burst(q.x, q.y, ['#FFD43B', '#fff'], 5); } });
          if (pts.every(q => q.on)) { K.sfx('good'); K.add(1, cx, cy); K.msg(sh.e + ' できた！', pick(PRAISE), 1500); K.burst(cx, cy, ['#FFD43B', '#F783AC', '#74C0FC', '#fff'], 40); wait = 1.8; }
        },
        draw(g) {
          if (sh) {
            g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 6; g.setLineDash([6, 12]); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); if (sh.n !== 'なみなみ' && sh.n !== 'ぐるぐる') g.closePath(); g.stroke(); g.setLineDash([]);
            pts.forEach(q => { g.fillStyle = q.on ? '#FFD43B' : 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(q.x, q.y, q.on ? 11 : 8, 0, 7); g.fill(); });
            g.fillStyle = '#fff'; g.font = '800 26px sans-serif'; g.textAlign = 'center'; g.fillText(sh.e + ' ' + sh.n + '（' + pts.filter(q => q.on).length + '/' + pts.length + '）', K.W / 2, 92);
          }
          g.lineCap = 'round';
          for (let i = 1; i < trail.length; i++) { const a = trail[i - 1], b = trail[i]; if (Math.hypot(a.x - b.x, a.y - b.y) > 120) continue; g.globalAlpha = Math.max(0, 1 - (K.t - b.t) / 1.6); g.strokeStyle = b.c; g.lineWidth = 12; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
          g.globalAlpha = 1;
        }
      };
    }
  });

  /* ---------- 9. バランス チャレンジ ---------- */
  GAMES.push({
    id: 'balance', name: 'バランス チャレンジ', e: '🦩', unit: 'びょう', bgm: 'calm', legs: false,
    desc: 'かたあしで フラミンゴ！（すわって モードは りょうてで ひこうき）', how: 'かたあしで たって グラグラ しないで キープ！',
    perMin: [15, 25, 35],
    create(K) {
      let hold = 0, total = 0, best = 0, side = pick(['みぎ', 'ひだり']), goal = [3, 5, 8][K.diff], on = false, wob = 0, cool = 0;
      const seated = K.seated;
      K.say(seated ? 'りょうてを よこに ひろげて キープ' : side + 'あしを あげて キープ');
      function ok(B) {
        if (!B || !B.ok) return false;
        if (seated) { if (!B.vis(B.lw) || !B.vis(B.rw)) return false; const l = angDiff(angOf(B.ls, B.lw), 180), r = angDiff(angOf(B.rs, B.rw), 0); return l < 30 && r < 30; }
        if (!B.hasLegs) return false;
        const up = side === 'みぎ' ? B.ra : B.la, down = side === 'みぎ' ? B.la : B.ra;   // その子の みぎ＝画面の みぎ（かがみ）
        return (down.y - up.y) / B.sw > 0.28;
      }
      return {
        avatarAlpha: 1,
        drawBg(g) { sky(g, K.W, K.H, '#FFDEEB', '#FFF0F6'); g.fillStyle = '#A5D8FF'; g.fillRect(0, K.H * 0.85, K.W, K.H * 0.15); },
        update(dt, B) {
          if (cool > 0) { cool -= dt; return; }
          const now = ok(B);
          if (now) {
            hold += dt; total += dt;
            if (!on) { on = true; K.sfx('beep'); }
            wob = B ? Math.sin(K.t * 3) * 0.05 : 0;
            if (hold >= goal) {
              K.float(Math.round(hold) + 'びょう！', K.W / 2, K.H * 0.35);
              best = Math.max(best, hold); K.sfx('good'); K.msg(pick(PRAISE), Math.round(hold) + 'びょう キープ！', 1500); K.burst(K.W / 2, K.H * 0.4, ['#F783AC', '#FFD43B', '#fff'], 30);
              hold = 0; on = false; cool = 1.8; K.stat('せいこう');
              if (!seated) { side = side === 'みぎ' ? 'ひだり' : 'みぎ'; setTimeout(() => K.say('こんどは ' + side + 'あし'), 600); }
            }
          } else {
            if (on && hold > 0.5) { best = Math.max(best, hold); K.msg('おしい！', Math.round(hold * 10) / 10 + 'びょう', 900); }
            on = false; hold = 0;
          }
          K.setScore(Math.round(total));
        },
        draw(g) {
          // フラミンゴと タイマー
          const x = K.W * 0.15, y = K.H * 0.55, s = Math.min(K.W, K.H) * 0.22;
          g.save(); g.translate(x, y); g.rotate(on ? Math.sin(K.t * 4) * 0.06 : 0); emo(g, '🦩', 0, 0, s); g.restore();
          const p = clamp(hold / goal, 0, 1);
          g.lineWidth = 16; g.strokeStyle = '#fff'; g.beginPath(); g.arc(x, y + s * 0.85, s * 0.35, 0, 7); g.stroke();
          g.strokeStyle = on ? '#F06595' : '#DEE2E6'; g.beginPath(); g.arc(x, y + s * 0.85, s * 0.35, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); g.stroke();
          g.fillStyle = '#C2255C'; g.font = '800 ' + Math.round(s * 0.2) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((Math.floor(hold * 10) / 10).toFixed(1), x, y + s * 0.85);
          g.fillStyle = '#862E9C'; g.font = '800 ' + Math.round(s * 0.16) + 'px sans-serif';
          g.fillText(seated ? 'ひこうき ✈️' : side + 'あし あげて', x, y - s * 0.75);
        }
      };
    }
  });

  /* ---------- 10. リズム たいこ ---------- */
  GAMES.push({
    id: 'taiko', name: 'リズム たいこ', e: '🥁', unit: 'こ', bgm: null, legs: false,
    desc: 'おとに あわせて みぎ・ひだりの たいこを ドン！', how: 'まるが たいこに きたら ドン！',
    perMin: [12, 22, 32],
    create(K) {
      const bpm = [84, 100, 120][K.diff], beat = 60 / bpm, FALL = beat * 3;
      const notes = []; let tb = 0, n = 0, prevIn = { l: false, r: false }, flash = { l: 0, r: 0 };
      const pattern = [['l'], ['r'], ['l'], ['r'], ['l', 'r'], [], ['r'], ['l']];
      const drums = B => {
        const sw = B ? B.sw : K.W * 0.12, sx = B ? B.sx : K.W / 2, sy = B ? B.sy : K.H * 0.4;
        const y = clamp(sy + sw * 1.0, K.H * 0.3, K.H * 0.82);
        return { l: { x: clamp(sx - sw * 1.25, sw, K.W - sw), y, r: sw * 0.55 }, r: { x: clamp(sx + sw * 1.25, sw, K.W - sw), y, r: sw * 0.55 } };
      };
      let D = drums(null);
      function don(side, B) {
        flash[side] = 0.2;
        tone(side === 'l' ? 140 : 180, 0, 0.22, 'sine', 0.35, 70); noise(0, 0.06, 0.12, 400);   // たいこの 音
        let bestI = -1, bestD = 9;
        notes.forEach((o, i) => { if (o.s === side && !o.done) { const d = Math.abs(o.at - K.t); if (d < bestD) { bestD = d; bestI = i; } } });
        const win = [0.42, 0.32, 0.24][K.diff];
        if (bestI >= 0 && bestD < win) { const o = notes[bestI]; o.done = true; K.add(1, D[side].x, D[side].y - D[side].r * 1.5); K.burst(D[side].x, D[side].y, side === 'l' ? ['#FF8787', '#fff'] : ['#74C0FC', '#fff'], 14); if (bestD < win * 0.4) K.stat('ぴったり'); }
      }
      return {
        avatarAlpha: 0.9,
        drawBg(g) { sky(g, K.W, K.H, '#FFF4E6', '#FFE8CC'); g.fillStyle = '#F4D3A1'; g.fillRect(0, K.H * 0.88, K.W, K.H * 0.12); },
        update(dt, B) {
          if (B && B.ok) D = drums(B);
          tb += dt;
          while (tb >= beat) {
            tb -= beat; n++;
            tone(n % 4 === 1 ? 880 : 660, 0, 0.05, 'square', 0.04);
            const step = pattern[n % pattern.length];
            (K.diff === 0 && n % 2 ? [] : step).forEach(s => notes.push({ s, at: K.t + FALL - tb, done: false }));
          }
          // たいこを たたいたか（てが 上から 入ったら）
          if (B && B.ok) ['l', 'r'].forEach(s => {
            const d = D[s];
            const inside = [B.lw, B.rw, B.li, B.ri].some(p => B.vis(p) && Math.hypot(p.x - d.x, p.y - d.y) < d.r * 1.15);
            if (inside && !prevIn[s]) don(s, B);
            prevIn[s] = inside;
          });
          for (let i = notes.length - 1; i >= 0; i--) if (notes[i].done || K.t - notes[i].at > 0.6) notes.splice(i, 1);
          flash.l = Math.max(0, flash.l - dt); flash.r = Math.max(0, flash.r - dt);
        },
        draw(g) {
          ['l', 'r'].forEach(s => {
            const d = D[s], col = s === 'l' ? '#FA5252' : '#228BE6';
            // レーン
            g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = d.r * 2; g.beginPath(); g.moveTo(d.x, 0); g.lineTo(d.x, d.y); g.stroke();
            // たいこ
            g.fillStyle = '#8B4513'; g.beginPath(); g.ellipse(d.x, d.y + d.r * 0.35, d.r * 1.05, d.r * 0.55, 0, 0, Math.PI); g.fill();
            g.fillStyle = flash[s] > 0 ? '#FFF3BF' : '#FFF9F0'; g.strokeStyle = col; g.lineWidth = 8; g.beginPath(); g.ellipse(d.x, d.y, d.r * 1.05, d.r * 0.6, 0, 0, 7); g.fill(); g.stroke();
            g.fillStyle = col; g.font = '800 ' + Math.round(d.r * 0.45) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s === 'l' ? 'ひだり' : 'みぎ', d.x, d.y + d.r * 1.25);
          });
          notes.forEach(o => {
            const d = D[o.s], k = 1 - (o.at - K.t) / FALL, y = -40 + (d.y + 40) * k;
            if (k < 0) return;
            g.fillStyle = o.s === 'l' ? '#FF8787' : '#74C0FC'; g.strokeStyle = '#fff'; g.lineWidth = 5;
            g.beginPath(); g.arc(d.x, y, d.r * 0.55, 0, 7); g.fill(); g.stroke();
          });
        }
      };
    }
  });
