  /* ============================================================
     ゲーム（K = 共通の 道具。play 画面が わたす）
     create(K) → { update(dt, B), draw(g), drawBg(g), avatarAlpha }
     ============================================================ */
  const angOf = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  const angDiff = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  function sky(g, W, H, top, bottom) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  function cloud(g, x, y, s, a) { g.fillStyle = 'rgba(255,255,255,' + (a || 0.9) + ')'; g.beginPath(); g.arc(x, y, s, 0, 7); g.arc(x + s * 0.9, y + s * 0.2, s * 0.75, 0, 7); g.arc(x - s * 0.9, y + s * 0.25, s * 0.7, 0, 7); g.arc(x + s * 0.2, y - s * 0.45, s * 0.7, 0, 7); g.fill(); }
  function grass(g, W, y, H, c1, c2) { g.fillStyle = c1; g.fillRect(0, y, W, H - y); g.fillStyle = c2; for (let x = 0; x < W; x += 26) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y - 12); g.lineTo(x + 16, y); g.fill(); } }
  function star(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  const CLOUDS = Array.from({ length: 6 }, () => ({ x: Math.random(), y: Math.random() * 0.4, s: 0.03 + Math.random() * 0.03, v: 0.006 + Math.random() * 0.01 }));
  function driftClouds(g, W, H, t, a) { CLOUDS.forEach(c => { const x = ((c.x + t * c.v) % 1.2 - 0.1) * W; cloud(g, x, c.y * H + H * 0.05, c.s * Math.min(W, H) * 1.6, a); }); }

  const GAMES = [];

  /* ---------- 1. ふうせん わり ---------- */
  GAMES.push({
    id: 'fusen', name: 'ふうせん わり', e: '🎈', unit: 'こ', bgm: 'happy', legs: false,
    desc: 'てを のばして ふうせんを パチン！', how: 'てで ふうせんに さわって わろう',
    perMin: [8, 18, 28],
    create(K) {
      const list = []; let spawn = 0;
      const COLS = ['#FF6B6B', '#4DABF7', '#FFD43B', '#69DB7C', '#B197FC', '#FFA94D', '#F783AC'];
      return {
        avatarAlpha: 1,
        drawBg(g) { sky(g, K.W, K.H, '#A5D8FF', '#E7F5FF'); driftClouds(g, K.W, K.H, K.t); grass(g, K.W, K.H * 0.9, K.H, '#8CE99A', '#69DB7C'); },
        update(dt, B) {
          spawn -= dt;
          if (B && B.ok && spawn <= 0 && list.length < 3 + K.diff) {
            spawn = [1.4, 1.0, 0.75][K.diff];
            const r = B.sw * [0.62, 0.52, 0.44][K.diff];
            const reach = B.sw * (K.seated ? 1.9 : 2.3);
            const x = clamp(B.sx + rnd(-reach, reach), r * 1.2, K.W - r * 1.2);
            list.push({ x, y: K.H + r, r, vy: -K.H * [0.09, 0.13, 0.18][K.diff], c: pick(COLS), gold: Math.random() < 0.1, ph: rnd(0, 6) });
          }
          const hands = B && B.ok ? [B.lw, B.rw, B.li, B.ri].concat(!K.seated && B.hasLegs ? [B.la, B.ra] : []).filter(p => B.vis(p)) : [];
          for (let i = list.length - 1; i >= 0; i--) {
            const b = list[i];
            b.y += b.vy * dt; b.x += Math.sin(K.t * 1.6 + b.ph) * 12 * dt;
            if (hands.some(p => Math.hypot(p.x - b.x, p.y - b.y) < b.r + B.sw * 0.12)) {
              list.splice(i, 1); K.sfx('pop'); K.burst(b.x, b.y, b.gold ? ['#FFD43B', '#FFF3BF', '#FAB005'] : [b.c, '#fff'], 18);
              K.add(b.gold ? 3 : 1, b.x, b.y);
              continue;
            }
            if (b.y < -b.r * 2.5) list.splice(i, 1);
          }
        },
        draw(g) {
          list.forEach(b => {
            g.strokeStyle = 'rgba(80,80,80,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x, b.y + b.r * 1.15);
            for (let k = 1; k <= 6; k++) g.lineTo(b.x + Math.sin(k + K.t * 3 + b.ph) * 5, b.y + b.r * 1.15 + k * b.r * 0.18); g.stroke();
            g.fillStyle = b.gold ? '#FAB005' : b.c; g.beginPath(); g.ellipse(b.x, b.y, b.r * 0.86, b.r, 0, 0, 7); g.fill();
            g.beginPath(); g.moveTo(b.x - b.r * 0.12, b.y + b.r * 1.15); g.lineTo(b.x + b.r * 0.12, b.y + b.r * 1.15); g.lineTo(b.x, b.y + b.r * 0.95); g.fill();
            g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(b.x - b.r * 0.32, b.y - b.r * 0.38, b.r * 0.16, b.r * 0.26, -0.5, 0, 7); g.fill();
            if (b.gold) star(g, b.x, b.y + b.r * 0.05, b.r * 0.42, '#FFF3BF');
          });
        }
      };
    }
  });

  /* ---------- 2. とりに なって とぼう ---------- */
  GAMES.push({
    id: 'tori', name: 'とりに なって とぼう', e: '🐦', unit: 'こ', bgm: 'calm', legs: false,
    desc: 'りょうてを パタパタ！ そらを とんで ほしを あつめよう', how: 'りょうてを うえから したへ パタパタ',
    perMin: [6, 12, 18],
    create(K) {
      const bird = { x: 0, y: 0, vy: 0, wing: 0 };
      const items = []; let spawn = 1.2, armed = false, scroll = 0, inited = false;
      const FRUITS = ['⭐', '🍎', '🍓', '🍒', '🌟', '🍇'];
      return {
        avatarAlpha: 0.32,
        drawBg(g) {
          sky(g, K.W, K.H, '#74C0FC', '#D0EBFF');
          driftClouds(g, K.W, K.H, K.t * 3, 0.85);
          g.fillStyle = '#B2F2BB'; g.beginPath(); g.moveTo(0, K.H);
          for (let x = 0; x <= K.W + 40; x += 40) g.lineTo(x, K.H * 0.86 - Math.sin((x + scroll * 0.5) / 160) * K.H * 0.05);
          g.lineTo(K.W, K.H); g.fill();
          grass(g, K.W, K.H * 0.93, K.H, '#69DB7C', '#51CF66');
        },
        update(dt, B) {
          if (!inited) { bird.x = K.W * 0.3; bird.y = K.H * 0.5; inited = true; }
          const G = K.H * [0.55, 0.8, 1.0][K.diff], floor = K.H * 0.86;
          // パタパタの けんしゅつ：てくびが かたより うえ → した
          if (B && B.ok) {
            const ws = [B.lw, B.rw].filter(p => B.vis(p));
            if (ws.length) {
              const a = (ws.reduce((s, p) => s + p.y, 0) / ws.length - B.sy) / B.sw;
              if (a < -0.1) armed = true;
              if (armed && a > 0.3) { armed = false; bird.vy = -K.H * [0.5, 0.55, 0.6][K.diff]; bird.wing = 1; K.sfx('flap'); K.stat('パタパタ'); }
            }
          }
          bird.vy += G * dt; bird.vy = Math.min(bird.vy, K.H * 0.35);
          bird.y += bird.vy * dt;
          if (bird.y > floor) { bird.y = floor; bird.vy = 0; }
          if (bird.y < K.H * 0.08) { bird.y = K.H * 0.08; bird.vy = Math.max(0, bird.vy); }
          bird.wing = Math.max(0, bird.wing - dt * 3);
          const sp = K.W * [0.14, 0.2, 0.26][K.diff];
          scroll += sp * dt;
          spawn -= dt;
          if (spawn <= 0) { spawn = rnd(1.2, 2.0); items.push({ x: K.W + 40, y: rnd(K.H * 0.15, K.H * 0.72), e: pick(FRUITS), ph: rnd(0, 6) }); }
          const R = Math.min(K.W, K.H) * 0.085;
          for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i]; it.x -= sp * dt;
            if (Math.hypot(it.x - bird.x, it.y - bird.y) < R * 1.25) { items.splice(i, 1); K.sfx('coin'); K.burst(it.x, it.y, ['#FFD43B', '#fff', '#FF8787'], 14); K.add(1, it.x, it.y); continue; }
            if (it.x < -60) items.splice(i, 1);
          }
        },
        draw(g) {
          const R = Math.min(K.W, K.H) * 0.085;
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = R * 1.4 + 'px ' + 'Apple Color Emoji, Segoe UI Emoji, sans-serif';
          items.forEach(it => g.fillText(it.e, it.x, it.y + Math.sin(K.t * 3 + it.ph) * 6));
          // とり
          const x = bird.x, y = bird.y, r = R, tilt = clamp(bird.vy / (K.H * 0.6), -0.5, 0.5);
          g.save(); g.translate(x, y); g.rotate(tilt);
          g.fillStyle = '#FFD43B'; g.beginPath(); g.ellipse(0, 0, r * 1.1, r * 0.9, 0, 0, 7); g.fill();
          g.fillStyle = '#FFF3BF'; g.beginPath(); g.ellipse(-r * 0.1, r * 0.3, r * 0.6, r * 0.45, 0, 0, 7); g.fill();
          const wa = bird.wing > 0 ? -1.1 * bird.wing + 0.4 : Math.sin(K.t * 6) * 0.25;
          g.save(); g.translate(-r * 0.15, -r * 0.05); g.rotate(wa); g.fillStyle = '#FAB005'; g.beginPath(); g.ellipse(-r * 0.5, 0, r * 0.7, r * 0.32, 0.3, 0, 7); g.fill(); g.restore();
          g.fillStyle = '#212529'; g.beginPath(); g.arc(r * 0.5, -r * 0.25, r * 0.12, 0, 7); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(r * 0.54, -r * 0.29, r * 0.04, 0, 7); g.fill();
          g.fillStyle = '#FF922B'; g.beginPath(); g.moveTo(r * 0.95, -r * 0.05); g.lineTo(r * 1.45, r * 0.08); g.lineTo(r * 0.95, r * 0.22); g.fill();
          g.fillStyle = 'rgba(255,135,170,.6)'; g.beginPath(); g.ellipse(r * 0.45, r * 0.08, r * 0.13, r * 0.08, 0, 0, 7); g.fill();
          g.restore();
        }
      };
    }
  });

  /* ---------- 3. カエル ジャンプ ---------- */
  GAMES.push({
    id: 'jump', name: 'ぴょんぴょん ジャンプ', e: '🐸', unit: 'かい', bgm: 'bounce', legs: true,
    desc: 'ジャンプで まるたを とびこえよう（すわって モードは バンザイ）', how: 'まるたが きたら ジャンプ！',
    perMin: [8, 14, 20],
    create(K) {
      const run = { y: 0, air: 0, dizzy: 0 };
      const obs = []; let next = 2.5, base = null, prevUp = false, cue = 0, step = 0;
      const AIR = [0.95, 0.8, 0.7][K.diff];
      function jump() { if (run.air > 0) return; run.air = AIR; K.sfx('jump'); K.stat('ジャンプ'); }
      return {
        avatarAlpha: 0.45,
        drawBg(g) {
          sky(g, K.W, K.H, '#99E9F2', '#E3FAFC'); driftClouds(g, K.W, K.H, K.t * 2);
          const gy = K.H * 0.8;
          g.fillStyle = '#8CE99A'; g.fillRect(0, gy, K.W, K.H - gy);
          g.fillStyle = '#C3FAE8'; for (let x = -((step * 60) % 80); x < K.W; x += 80) g.fillRect(x, gy + 12, 40, 6);
        },
        update(dt, B) {
          const gy = K.H * 0.8, sp = K.W * [0.26, 0.34, 0.44][K.diff];
          step += dt * (sp / K.W) * 6;
          // ジャンプの けんしゅつ
          if (B && B.ok) {
            if (K.seated) {
              const top = B.vis(B.nose) ? B.nose.y : B.sy - B.sw * 0.8;
              const up = B.vis(B.lw) && B.vis(B.rw) && B.lw.y < top && B.rw.y < top;
              if (up && !prevUp) jump(); prevUp = up;
            } else {
              const y = B.sy / B.sw;
              if (base == null) base = y;
              const rise = base - y;
              if (rise > [0.16, 0.2, 0.26][K.diff]) jump();
              if (Math.abs(rise) < 0.12 && run.air <= 0) base += (y - base) * Math.min(1, dt * 1.5);
              if (rise < -0.5) base = y;   // しゃがんだ・はなれた ときは もとに もどす
            }
          }
          if (run.air > 0) run.air = Math.max(0, run.air - dt);
          const p = 1 - run.air / AIR; run.y = run.air > 0 ? Math.sin(p * Math.PI) * K.H * 0.3 : 0;
          run.dizzy = Math.max(0, run.dizzy - dt);
          next -= dt;
          if (next <= 0) { next = K.diff === 0 ? rnd(2.6, 3.6) : K.diff === 1 ? rnd(1.9, 2.9) : rnd(1.4, 2.3); obs.push({ x: K.W + 60, k: pick(['log', 'rock', 'log', 'puddle']), hit: false, done: false }); }
          const rx = K.W * 0.22, w = K.H * 0.09;
          cue = 0;
          obs.forEach(o => {
            o.x -= sp * dt;
            const oh = o.k === 'puddle' ? K.H * 0.02 : K.H * 0.09;
            if (!o.done && Math.abs(o.x - rx) < w * 0.8 && run.y < oh * 0.9 && !o.hit) { o.hit = true; run.dizzy = 0.7; K.sfx('bonk'); K.msg('おしい！', null, 700); }
            if (!o.done && o.x < rx - w) { o.done = true; if (!o.hit) { K.add(1, rx, gy - K.H * 0.2); K.sfx('coin'); } }
            if (!o.done && o.x - rx < K.W * 0.28 && o.x > rx) cue = 1;
          });
          while (obs.length && obs[0].x < -100) obs.shift();
        },
        draw(g) {
          const gy = K.H * 0.8, rx = K.W * 0.22, s = K.H * 0.11;
          obs.forEach(o => {
            if (o.k === 'log') { g.fillStyle = '#A0522D'; g.fillRect(o.x - s * 0.5, gy - s * 0.75, s, s * 0.75); g.fillStyle = '#DEB887'; g.beginPath(); g.ellipse(o.x - s * 0.5, gy - s * 0.375, s * 0.16, s * 0.375, 0, 0, 7); g.fill(); g.strokeStyle = '#A0522D'; g.lineWidth = 2; g.beginPath(); g.ellipse(o.x - s * 0.5, gy - s * 0.375, s * 0.08, s * 0.2, 0, 0, 7); g.stroke(); }
            else if (o.k === 'rock') { g.fillStyle = '#868E96'; g.beginPath(); g.ellipse(o.x, gy - s * 0.32, s * 0.55, s * 0.42, 0, Math.PI, 0); g.lineTo(o.x + s * 0.55, gy); g.lineTo(o.x - s * 0.55, gy); g.fill(); g.fillStyle = '#ADB5BD'; g.beginPath(); g.ellipse(o.x - s * 0.15, gy - s * 0.5, s * 0.15, s * 0.08, -0.3, 0, 7); g.fill(); }
            else { g.fillStyle = '#74C0FC'; g.beginPath(); g.ellipse(o.x, gy + 4, s * 0.7, s * 0.14, 0, 0, 7); g.fill(); }
          });
          // じぶんの キャラ（まるい からだ）
          const ch = K.chara, y = gy - run.y, sq = run.air > 0 ? 1.08 : 1 + Math.sin(step * 2) * 0.04;
          g.save(); g.translate(rx, y);
          if (run.dizzy > 0) g.rotate(Math.sin(K.t * 30) * 0.15);
          g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(0, run.y + 2, s * 0.5, s * 0.1, 0, 0, 7); g.fill();
          g.fillStyle = ch.body; g.strokeStyle = ch.dark; g.lineWidth = 3;
          g.beginPath(); g.ellipse(0, -s * 0.55 * sq, s * 0.55, s * 0.55 * sq, 0, 0, 7); g.fill(); g.stroke();
          g.fillStyle = ch.dark; [-1, 1].forEach(k => { g.beginPath(); g.ellipse(k * s * 0.28, -s * 0.03, s * 0.18, s * 0.09, 0, 0, 7); g.fill(); });
          g.fillStyle = '#212529'; [-1, 1].forEach(k => { g.beginPath(); g.arc(k * s * 0.18 + s * 0.12, -s * 0.7, s * 0.07, 0, 7); g.fill(); });
          g.strokeStyle = '#343A40'; g.lineWidth = 3; g.beginPath();
          if (run.dizzy > 0) { g.arc(s * 0.12, -s * 0.38, s * 0.1, Math.PI * 1.1, Math.PI * 1.9); } else g.arc(s * 0.12, -s * 0.5, s * 0.16, 0.2 * Math.PI, 0.8 * Math.PI);
          g.stroke();
          g.restore();
          if (cue && run.air <= 0) { g.fillStyle = '#E8590C'; g.font = '800 ' + Math.round(K.H * 0.07) + 'px sans-serif'; g.textAlign = 'center'; g.fillText(K.seated ? 'バンザイ！' : 'ジャンプ！', rx, gy - K.H * 0.3 + Math.sin(K.t * 10) * 6); }
        }
      };
    }
  });

  /* ---------- 4. だるまさんが ころんだ ---------- */
  GAMES.push({
    id: 'daruma', name: 'だるまさんが ころんだ', e: '🙈', unit: 'かい', bgm: null, legs: false,
    desc: 'おんがくで うごいて、「ころんだ！」で ピタッと とまろう', how: 'うごいて → ピタッ！',
    perMin: [3, 5, 6],
    create(K) {
      let ph = 'go', tm = rnd(3.5, 5.5), motion = 0, prev = null, acc = 0, n = 0, face = 0, result = '', rate = 1;
      const KEYS = ['nose', 'ls', 'rs', 'le', 're', 'lw', 'rw', 'lh', 'rh'];
      const TH = [0.5, 0.35, 0.24][K.diff], STOP = [2.2, 2.8, 3.6][K.diff];
      K.bgm(true, 'happy'); K.msg('うごいて！', 'おんがくに あわせて', 1500);
      function setPh(p) {
        ph = p;
        if (p === 'go') { tm = rnd(3, 5.5); K.bgm(true, 'happy'); K.msg('うごいて！', null, 1000); }
        if (p === 'call') { K.bgm(false); rate = pick([0.75, 1, 1, 1.3, 1.6]); tm = 2.3 / rate + 0.2; K.say('だるまさんが ころんだ！', rate); }
        if (p === 'stop') { tm = STOP; acc = 0; n = 0; K.sfx('turn'); }
        if (p === 'judge') tm = 1.6;
      }
      return {
        avatarAlpha: 1,
        drawBg(g) {
          sky(g, K.W, K.H, '#FFE8CC', '#FFF9DB');
          g.fillStyle = '#FFD8A8'; g.fillRect(0, K.H * 0.82, K.W, K.H * 0.18);
          g.fillStyle = '#C0EB75'; [0.08, 0.92].forEach(x => { g.beginPath(); g.arc(K.W * x, K.H * 0.55, K.H * 0.16, 0, 7); g.fill(); g.fillStyle = '#A0522D'; g.fillRect(K.W * x - 10, K.H * 0.6, 20, K.H * 0.22); g.fillStyle = '#C0EB75'; });
        },
        update(dt, B) {
          // うごきの 大きさ（かたはば／びょう）
          let m = 0;
          if (B && B.ok) {
            const cur = KEYS.map(k => B[k] && B.vis(B[k]) ? { x: B[k].x, y: B[k].y } : null);
            if (prev && dt > 0) { let s = 0, c = 0; cur.forEach((p, i) => { if (p && prev[i]) { s += Math.hypot(p.x - prev[i].x, p.y - prev[i].y); c++; } }); m = c ? s / c / B.sw / dt : 0; }
            prev = cur;
          } else prev = null;
          motion += (m - motion) * Math.min(1, dt * 6);
          face += ((ph === 'stop' || ph === 'judge' ? 1 : 0) - face) * Math.min(1, dt * 10);
          tm -= dt;
          if (ph === 'go') { if (tm <= 0) setPh('call'); }
          else if (ph === 'call') { if (tm <= 0) setPh('stop'); }
          else if (ph === 'stop') {
            if (STOP - tm > 0.45) { acc += motion; n++; }
            if (tm <= 0) {
              const avg = n ? acc / n : 9;
              K.stat('ラウンド');
              if (avg < TH && B && B.ok) { result = 'ok'; K.sfx('good'); K.add(1, K.W / 2, K.H * 0.3); K.msg('ピタッ！', pick(PRAISE), 1400); K.burst(K.W / 2, K.H * 0.35, ['#FFD43B', '#69DB7C', '#4DABF7'], 30); }
              else { result = 'ng'; K.msg('うごいちゃった〜', 'つぎは ピタッ！', 1400); }
              K.statAvg('とまる ちから', clamp(1 - avg / (TH * 2), 0, 1));
              setPh('judge');
            }
          } else if (ph === 'judge') { if (tm <= 0) setPh('go'); }
        },
        draw(g) {
          // だるまさん（右上）
          const r = Math.min(K.W, K.H) * 0.13, x = K.W - r * 1.6, y = r * 1.5;
          g.save(); g.translate(x, y);
          const sx = Math.cos(face * Math.PI); g.scale(Math.abs(sx) < 0.08 ? 0.08 : Math.abs(sx), 1);
          g.fillStyle = '#E03131'; g.beginPath(); g.ellipse(0, r * 0.15, r, r * 1.05, 0, 0, 7); g.fill();
          if (face > 0.5) {
            g.fillStyle = '#FFF4E6'; g.beginPath(); g.ellipse(0, -r * 0.1, r * 0.62, r * 0.5, 0, 0, 7); g.fill();
            g.fillStyle = '#212529'; [-1, 1].forEach(k => { g.beginPath(); g.arc(k * r * 0.24, -r * 0.15, r * 0.11, 0, 7); g.fill(); });
            g.strokeStyle = '#212529'; g.lineWidth = r * 0.05; [-1, 1].forEach(k => { g.beginPath(); g.moveTo(k * r * 0.12, -r * 0.38); g.lineTo(k * r * 0.4, -r * 0.33); g.stroke(); });
            g.fillStyle = '#E03131'; g.beginPath(); g.ellipse(0, r * 0.13, r * 0.12, r * 0.07, 0, 0, 7); g.fill();
          } else { g.strokeStyle = '#FFD43B'; g.lineWidth = r * 0.07; g.beginPath(); g.ellipse(0, r * 0.15, r * 0.86, r * 0.9, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); g.beginPath(); g.ellipse(0, -r * 0.35, r * 0.55, r * 0.22, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(0, r * 0.35, r * 0.28, 0, 7); g.fill(); g.fillStyle = '#E03131'; g.font = '800 ' + r * 0.32 + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('福', 0, r * 0.37); }
          g.restore();
          // うごき メーター
          const mw = Math.min(K.W * 0.5, 420), mx = (K.W - mw) / 2, my = K.H - 60;
          g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.roundRect ? g.roundRect(mx - 10, my - 10, mw + 20, 40, 20) : g.rect(mx - 10, my - 10, mw + 20, 40); g.fill();
          const v = clamp(motion / (TH * 4), 0, 1);
          g.fillStyle = ph === 'stop' ? (motion < TH ? '#40C057' : '#FA5252') : '#FAB005';
          g.fillRect(mx, my, mw * v, 20);
          g.fillStyle = '#495057'; g.font = '700 16px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
          g.fillText(ph === 'stop' ? '🧊 とまって！' : ph === 'call' ? '👂 きいて…' : '💃 うごいて！', mx, my - 26);
        }
      };
    }
  });

  /* ---------- 5. まねっこ ポーズ ---------- */
  // 角度は 画面の 向き（0＝→、90＝↓、-90＝↑、180＝←）。画面の 左の うで＝その子の 左手（かがみ）
  const POSES = [
    { n: 'バンザイ', e: '🙌', L: [-110, -100], R: [-70, -80] },
    { n: 'ひこうき', e: '✈️', L: [180, 180], R: [0, 0] },
    { n: 'みぎてを あげて', e: '🙋', R: [-90, -90], L: [95, 95], loose: 'L' },
    { n: 'ひだりてを あげて', e: '🙋', L: [-90, -90], R: [85, 85], loose: 'R' },
    { n: 'ちからこぶ', e: '💪', L: [180, -90], R: [0, -90] },
    { n: 'ななめ', e: '↗️', L: [135, 135], R: [-45, -45] },
    { n: 'はんたい ななめ', e: '↖️', L: [-135, -135], R: [45, 45] },
    { n: 'あたまに て', e: '🙆', L: [-150, -20], R: [-30, -160], custom: B => { const top = { x: B.nose.x, y: B.nose.y - B.sw * 0.55 }; const d = Math.max(dist(B.lw, top), dist(B.rw, top)) / B.sw; return clamp(1.4 - d, 0, 1); } },
    { n: 'まえで パチン', e: '👏', L: [70, 10], R: [110, 170], custom: B => { const d = dist(B.lw, B.rw) / B.sw; const yok = B.lw.y > B.sy - B.sw * 0.4; return yok ? clamp(1.25 - d, 0, 1) : 0; } },
    { n: 'かたあし', e: '🦩', L: [150, 150], R: [30, 30], legs: true, custom: B => { if (!B.hasLegs) return 0; const d = Math.abs(B.la.y - B.ra.y) / B.sw; return clamp((d - 0.15) / 0.35, 0, 1); } }
  ];
  function poseScore(P, B) {
    if (P.custom) return (B.vis(B.lw) && B.vis(B.rw)) ? P.custom(B) : 0;
    let s = 0, c = 0;
    const seg = (a, b, t, loose) => { if (!B.vis(a) || !B.vis(b)) { c++; return; } const d = angDiff(angOf(a, b), t); s += clamp(1 - (d - (loose ? 35 : 15)) / 45, 0, 1); c++; };
    seg(B.ls, B.le, P.L[0], P.loose === 'L'); seg(B.le, B.lw, P.L[1], P.loose === 'L');
    seg(B.rs, B.re, P.R[0], P.loose === 'R'); seg(B.re, B.rw, P.R[1], P.loose === 'R');
    return c ? s / c : 0;
  }
  function drawPoseFig(g, P, x, y, s, col) {
    const sh = [{ x: x - s * 0.5, y }, { x: x + s * 0.5, y }];
    g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = s * 0.22;
    g.beginPath(); g.moveTo(sh[0].x, sh[0].y); g.lineTo(sh[1].x, sh[1].y); g.lineTo(x + s * 0.35, y + s * 1.5); g.lineTo(x - s * 0.35, y + s * 1.5); g.closePath(); g.fillStyle = col; g.fill();
    const arm = (o, a1, a2) => { const r1 = a1 * Math.PI / 180, r2 = a2 * Math.PI / 180; const e = { x: o.x + Math.cos(r1) * s * 0.8, y: o.y + Math.sin(r1) * s * 0.8 }; const w = { x: e.x + Math.cos(r2) * s * 0.75, y: e.y + Math.sin(r2) * s * 0.75 }; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(e.x, e.y); g.lineTo(w.x, w.y); g.stroke(); };
    arm(sh[0], P.L[0], P.L[1]); arm(sh[1], P.R[0], P.R[1]);
    if (P.legs) { g.beginPath(); g.moveTo(x - s * 0.25, y + s * 1.5); g.lineTo(x - s * 0.3, y + s * 2.6); g.moveTo(x + s * 0.25, y + s * 1.5); g.lineTo(x + s * 0.7, y + s * 1.9); g.lineTo(x + s * 0.4, y + s * 2.3); g.stroke(); }
    else { g.beginPath(); g.moveTo(x - s * 0.25, y + s * 1.5); g.lineTo(x - s * 0.3, y + s * 2.6); g.moveTo(x + s * 0.25, y + s * 1.5); g.lineTo(x + s * 0.3, y + s * 2.6); g.stroke(); }
    g.beginPath(); g.arc(x, y - s * 0.55, s * 0.42, 0, 7); g.fill();
  }
  GAMES.push({
    id: 'maneko', name: 'まねっこ ポーズ', e: '🤸', unit: 'ポーズ', bgm: 'calm', legs: false,
    desc: 'おてほんと おなじ ポーズを してみよう', how: 'おてほんと おなじ かたちに なろう',
    perMin: [4, 7, 10],
    create(K) {
      const list = POSES.filter(p => !(p.legs && K.seated));
      let cur = null, hold = 0, left = 0, score = 0, done = 0, last = null, bag = [];
      const NEED = [0.6, 0.72, 0.82][K.diff], HOLD = [0.7, 1.0, 1.5][K.diff];
      function next() {
        if (!bag.length) bag = list.slice().sort(() => Math.random() - 0.5);
        cur = bag.pop(); if (cur === last && bag.length) { bag.unshift(cur); cur = bag.pop(); }
        last = cur; hold = 0; left = 10; done = 0; K.say(cur.n);
      }
      next();
      return {
        avatarAlpha: 1,
        get pose() { return cur; },
        drawBg(g) { sky(g, K.W, K.H, '#E5DBFF', '#F8F0FC'); g.fillStyle = '#D0BFFF'; g.fillRect(0, K.H * 0.88, K.W, K.H * 0.12); },
        update(dt, B) {
          if (done > 0) { done -= dt; if (done <= 0) next(); return; }
          left -= dt;
          score = B && B.ok ? poseScore(cur, B) : 0;
          if (score >= NEED) hold += dt; else hold = Math.max(0, hold - dt * 2);
          if (hold >= HOLD) { K.sfx('good'); K.add(1, K.W / 2, K.H * 0.4); K.msg(pick(PRAISE), cur.n + ' できた！', 1100); K.burst(K.W / 2, K.H * 0.4, ['#B197FC', '#FFD43B', '#63E6BE'], 26); done = 1.2; }
          else if (left <= 0) { K.msg('つぎ いくよ', null, 900); done = 0.9; }
        },
        draw(g) {
          // おてほん カード
          const cw = Math.min(K.W * 0.26, 300), ch = cw * 1.25, x0 = 18, y0 = 70;
          g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect ? g.roundRect(x0, y0, cw, ch, 26) : g.rect(x0, y0, cw, ch); g.fill();
          g.strokeStyle = '#B197FC'; g.lineWidth = 5; g.stroke();
          g.fillStyle = '#5F3DC4'; g.font = '800 ' + Math.round(cw * 0.12) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(cur.n, x0 + cw / 2, y0 + cw * 0.12);
          drawPoseFig(g, cur, x0 + cw / 2, y0 + ch * 0.38, cw * 0.17, '#7950F2');
          // できぐあい
          const p = clamp(hold / HOLD, 0, 1), cx = x0 + cw / 2, cy = y0 + ch + 50;
          g.lineWidth = 12; g.strokeStyle = '#E9ECEF'; g.beginPath(); g.arc(cx, cy, 34, 0, 7); g.stroke();
          g.strokeStyle = score >= NEED ? '#40C057' : '#FAB005'; g.beginPath(); g.arc(cx, cy, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (done > 0 ? 1 : p)); g.stroke();
          g.fillStyle = '#495057'; g.font = '700 20px sans-serif'; g.fillText(Math.ceil(Math.max(0, left)), cx, cy + 1);
        }
      };
    }
  });
