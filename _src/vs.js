  /* ============================================================
     ふたりで あそぶ（⚔️ たいせん・🤝 きょうりょく）
     ・画面を まんなかで 2つに わけ、それぞれの 人の まえで 同じ あそびを する
     ・「ふたりの ふうせん」だけは 1つの 画面を ふたりで つかう（きんの ふうせんは 2人で いっしょに タッチ）
     ・むずかしさは 1人ずつ えらべる（ハンデ）
     ============================================================ */
  const PCOL = [
    { n: 'あか', e: '🔴', c: '#FA5252', d: '#C92A2A', bg: '#FFF5F5' },
    { n: 'あお', e: '🔵', c: '#339AF0', d: '#1864AB', bg: '#E7F5FF' }
  ];
  // 画面の 半分でも あそべる もの（リズム たいこは 2人の 音が まざるので はずす）
  const VS_IDS = ['fusen', 'keeper', 'daruma', 'maneko', 'mado', 'tori', 'nazoru', 'balance', 'jump'];
  const DIFF_N = ['やさしい', 'ふつう', 'むずかしい'];
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // その 人の ゲームの 中だけ、おなじ たねの 乱数に する（ふうせんの 出かたなどが ふたりで そろう）
  function withRand(r, fn) { const o = Math.random; Math.random = r; try { return fn(); } finally { Math.random = o; } }

  /* ---------- ふたりの ふうせん（1つの 画面を ふたりで） ---------- */
  const FUTARI = {
    id: 'futari', name: 'ふたりの ふうせん', e: '🎈', unit: 'こ', bgm: 'happy', legs: false, shared: true,
    desc: 'じぶんの いろの ふうせんを わろう。きんいろは ふたりで いっしょに タッチ！', how: 'じぶんの いろ・しろは はやいもの がち・きんは いっしょに！',
    perMin: [8, 18, 28],
    create(K) {
      const list = []; const spawn = [0.5, 1.0]; let wspawn = 3, gspawn = 7;
      const handsOf = B => B && B.ok ? [B.lw, B.rw, B.li, B.ri].filter(p => B.vis(p)) : [];
      return {
        avatarAlpha: 1,
        drawBg(g) { sky(g, K.W, K.H, '#A5D8FF', '#E7F5FF'); driftClouds(g, K.W, K.H, K.t); grass(g, K.W, K.H * 0.9, K.H, '#8CE99A', '#69DB7C'); },
        update(dt, Bs) {
          // じぶんの いろ（その人の まわりに 出る。大きさ・はやさは その人の むずかしさ）
          Bs.forEach((B, i) => {
            spawn[i] -= dt;
            if (!B || !B.ok || spawn[i] > 0 || list.filter(b => b.who === i).length >= 2 + K.diffs[i]) return;
            const d = K.diffs[i]; spawn[i] = [1.5, 1.1, 0.85][d];
            const r = B.sw * [0.6, 0.5, 0.42][d], reach = B.sw * 1.8;
            list.push({ who: i, x: clamp(B.sx + rnd(-reach, reach), r * 1.2, K.W - r * 1.2), y: K.H + r, r, vy: -K.H * [0.09, 0.13, 0.17][d], ph: rnd(0, 6) });
          });
          const both = Bs[0] && Bs[0].ok && Bs[1] && Bs[1].ok;
          // しろ：ふたりの あいだに 出る。はやく さわった ほうの もの
          wspawn -= dt;
          if (both && wspawn <= 0) { wspawn = rnd(2.5, 4); const r = Math.min(Bs[0].sw, Bs[1].sw) * 0.5; list.push({ who: -1, x: clamp((Bs[0].sx + Bs[1].sx) / 2 + rnd(-40, 40), r, K.W - r), y: K.H + r, r, vy: -K.H * 0.12, ph: rnd(0, 6) }); }
          // きん：ふたりで いっしょに さわると われる（いっしょに やる 経験）
          gspawn -= dt;
          if (both && gspawn <= 0 && !list.some(b => b.gold)) {
            gspawn = rnd(8, 12); const r = Math.max(Bs[0].sw, Bs[1].sw) * 0.75;
            list.push({ gold: true, who: -1, x: (Bs[0].sx + Bs[1].sx) / 2, y: K.H + r, r, vy: -K.H * 0.05, ph: 0, touch: [-9, -9] });
            K.say('きんの ふうせん！ ふたりで いっしょに タッチ！');
          }
          for (let i = list.length - 1; i >= 0; i--) {
            const b = list[i];
            b.y += b.vy * dt; b.x += Math.sin(K.t * 1.6 + b.ph) * 12 * dt;
            if (b.gold && b.y < K.H * 0.42) b.vy = 0;   // きんは まんなかで まつ
            if (b.gold) b.life = (b.life || 0) + dt;
            const near = (B, p) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + B.sw * 0.12;
            const hit = Bs.map(B => B && B.ok && handsOf(B).some(p => near(B, p)));
            if (b.gold) {
              hit.forEach((x, k) => { if (x) b.touch[k] = K.t; });
              if (K.t - b.touch[0] < 0.7 && K.t - b.touch[1] < 0.7) {
                list.splice(i, 1); K.sfx('good'); K.burst(b.x, b.y, ['#FFD43B', '#FFF3BF', '#FAB005', '#fff'], 40);
                K.add(3, b.x - b.r * 0.6, b.y, 0); K.add(3, b.x + b.r * 0.6, b.y, 1); K.msg('ナイス コンビ！', 'ふたりで +3', 1500); K.stat('いっしょに タッチ');
                continue;
              }
              if (b.life > 9) { list.splice(i, 1); continue; }
            } else {
              const k = b.who >= 0 ? (hit[b.who] ? b.who : -1) : hit.indexOf(true);
              if (k >= 0) { list.splice(i, 1); K.sfx('pop'); K.burst(b.x, b.y, [b.who >= 0 ? PCOL[b.who].c : '#fff', '#fff', PCOL[k].c], 16); K.add(b.who >= 0 ? 1 : 2, b.x, b.y, k); continue; }
            }
            if (b.y < -b.r * 2.5) list.splice(i, 1);
          }
        },
        draw(g) {
          list.forEach(b => {
            const col = b.gold ? '#FAB005' : b.who >= 0 ? PCOL[b.who].c : '#F8F9FA';
            g.strokeStyle = 'rgba(80,80,80,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x, b.y + b.r * 1.15);
            for (let k = 1; k <= 6; k++) g.lineTo(b.x + Math.sin(k + K.t * 3 + b.ph) * 5, b.y + b.r * 1.15 + k * b.r * 0.18); g.stroke();
            g.fillStyle = col; g.beginPath(); g.ellipse(b.x, b.y, b.r * 0.86, b.r, 0, 0, 7); g.fill();
            if (b.who < 0 && !b.gold) { g.strokeStyle = '#ADB5BD'; g.lineWidth = 3; g.stroke(); }
            g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(b.x - b.r * 0.32, b.y - b.r * 0.38, b.r * 0.16, b.r * 0.26, -0.5, 0, 7); g.fill();
            if (b.gold) {
              star(g, b.x, b.y, b.r * 0.4, '#FFF3BF');
              // どちらが さわったか（左＝あか・右＝あお）
              [0, 1].forEach(k => { const on = K.t - b.touch[k] < 0.7; g.fillStyle = on ? PCOL[k].c : 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(b.x + (k ? 1 : -1) * b.r * 0.55, b.y + b.r * 0.55, b.r * 0.2, 0, 7); g.fill(); });
            } else if (b.who >= 0) { g.fillStyle = '#fff'; g.font = '900 ' + Math.round(b.r * 0.55) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(PCOL[b.who].n, b.x, b.y); }
          });
        }
      };
    }
  };
  const vsGames = () => [FUTARI].concat(VS_IDS.map(id => GAMES.find(x => x.id === id)).filter(Boolean));

  /* ---------- ホームの 入り口 ---------- */
  function vsCard() {
    if (!st.vsOn) return null;
    return h('button', { class: 'gcard circ vs', type: 'button', onclick: () => { A(); go(renderVsHome); } },
      h('span', { class: 'emo' }, '⚔️'), h('span', null, h('span', { class: 'nm' }, 'ふたりで あそぶ'), h('small', null, 'たいせん・きょうりょく。iPad の まえに ふたり ならんで')));
  }

  /* ---------- ふたりで：えらぶ 画面 ---------- */
  function renderVsHome() {
    const scr = h('section', { class: 'screen home vshome' });
    const draw = () => {
      scr.innerHTML = '';
      const modeBtn = (v, e, t, s) => h('button', { type: 'button', class: 'vmode' + (st.vsMode === v ? ' on' : ''), onclick: () => { st.vsMode = v; saveSt(); sfx('pop'); say(t); draw(); } }, h('span', { class: 'emo' }, e), h('b', null, t), h('small', null, s));
      const panel = i => {
        const P = PCOL[i];
        const charas = h('div', { class: 'vchar' }, CHARAS.map(c => {
          const cv = h('canvas', { width: 96, height: 96 }); const g = cv.getContext('2d'); g.translate(0, 18); drawAvatar(g, demoBody(96, 96, 0), c);
          return h('button', { type: 'button', class: 'chara' + (st.vsChara[i] === c.id ? ' on' : ''), style: st.vsChara[i] === c.id ? 'border-color:' + P.c : '', 'aria-label': c.name, onclick: () => { st.vsChara[i] = c.id; saveSt(); sfx('pop'); draw(); } }, cv);
        }));
        const diff = h('div', { class: 'seg' }, [0, 1, 2].map(d => h('button', { type: 'button', class: st.vsDiff[i] === d ? 'on' : '', style: st.vsDiff[i] === d ? 'background:' + P.c : '', onclick: () => { st.vsDiff[i] = d; saveSt(); draw(); } }, DIFF_N[d])));
        return h('div', { class: 'vpanel', style: 'border-color:' + P.c + ';background:' + P.bg },
          h('div', { class: 'vph', style: 'color:' + P.d }, P.e + ' ' + P.n, h('small', null, i ? '（がめんの みぎに たつ ひと）' : '（がめんの ひだりに たつ ひと）')),
          charas, h('div', { class: 'vdiff' }, h('span', null, 'むずかしさ'), diff));
      };
      scr.append(
        h('h1', null, h('span', { class: 'emo' }, '⚔️'), ' ふたりで あそぼ'),
        h('div', { class: 'vmodes' }, modeBtn('battle', '⚔️', 'たいせん', 'どっちが たくさん できるかな'), modeBtn('coop', '🤝', 'きょうりょく', 'ふたりの ごうけいで めざせ ゴール')),
        h('div', { class: 'vpanels' }, panel(0), panel(1)),
        h('p', { class: 'help', style: 'margin:0;text-align:center' }, 'むずかしさを 1人ずつ かえると、ちがう 力の 子どうしでも いい しょうぶに なります（ハンデ）'),
        h('div', { class: 'games' }, vsGames().map(gm => h('button', { class: 'gcard' + (gm.shared ? ' new' : ''), type: 'button', onclick: () => { A(); go(renderVs, { gm }); } },
          h('span', { class: 'emo' }, gm.e), h('span', null, h('span', { class: 'nm' }, gm.name), h('small', null, gm.shared ? gm.desc : gm.desc))))),
        h('button', { class: 'big-btn blue', type: 'button', style: 'min-height:64px;font-size:22px', onclick: () => go(renderHome) }, '🏠 ひとりで あそぶ に もどる'));
    };
    draw();
    main.appendChild(scr);
  }

  /* ---------- ふたりで：あそぶ ---------- */
  function renderVs(arg) {
    const gm = arg.gm, TIME = st.time, coop = st.vsMode === 'coop';
    const diffs = st.vsDiff.slice(), seed = (Math.random() * 1e9) | 0;
    document.body.classList.add('playing');
    const cv = h('canvas', { class: 'game' });
    const quit = h('button', { class: 'quit', type: 'button' }, h('i'), h('span', null, '✕ おわる'));
    const timerBar = h('i', { style: 'width:100%' });
    const halves = [0, 1].map(i => {
      const sc = h('div', { class: 'vscore', style: 'border-color:' + PCOL[i].c }, h('span', { class: 'emo' }, PCOL[i].e), h('span', null, '0'));
      const msg = h('div', { class: 'msg' }); msg.hidden = true;
      return { el: h('div', { class: 'vhalf' + (i ? ' r' : '') }, sc, msg), sc, msg, msgT: null };
    });
    const total = h('div', { class: 'vtotal', hidden: !coop }, h('span', null, '🤝 0'), h('div', { class: 'bar' }, h('i')));
    const cmsg = h('div', { class: 'msg' }); cmsg.hidden = true;
    const checks = h('div', { class: 'vchecks' });
    const guide = h('div', { class: 'guide' }, h('div', { class: 't' }, ''), checks,
      h('button', { class: 'big-btn go', type: 'button', style: 'min-height:60px;min-width:220px;font-size:23px', onclick: () => startCount() }, '▶ はじめる'));
    const loading = h('div', { class: 'loading' }, h('div', null, h('span', { class: 'emo' }, '📷'), h('span', { class: 'lt' }, 'カメラを ひらいています…')));
    const stage = h('div', { class: 'stage vs' + (gm.shared ? ' shared' : '') }, cv, halves[0].el, halves[1].el, h('div', { class: 'hud' }, quit), total, cmsg, guide, h('div', { class: 'timer' }, timerBar), loading);
    main.appendChild(h('section', { class: 'screen' }, stage));
    const g = cv.getContext('2d');
    let qt = null; const qc = () => { clearTimeout(qt); quit.classList.remove('pressing'); };
    quit.addEventListener('pointerdown', e => { e.preventDefault(); quit.classList.add('pressing'); qt = setTimeout(() => { qc(); finish(true); }, 1500); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => quit.addEventListener(ev, qc));

    const goal = Math.max(3, Math.round((gm.perMin[diffs[0]] + gm.perMin[diffs[1]]) * TIME / 60 * 0.75));
    const scores = [0, 0];
    total.firstChild.textContent = '🤝 0 / ' + goal;
    function showScore(i) {
      const s = halves[i].sc; s.lastChild.textContent = scores[i]; s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
      if (coop) { const t = scores[0] + scores[1]; total.firstChild.textContent = '🤝 ' + t + ' / ' + goal; total.querySelector('i').style.width = clamp(t / goal * 100, 0, 100) + '%'; if (t >= goal && !total.classList.contains('done')) { total.classList.add('done'); sfx('good'); say('ゴール！ ふたりで やったね！'); } }
    }
    function showMsg(o, text, sub, ms) { o.msg.innerHTML = ''; o.msg.append(text, sub ? h('small', null, sub) : ''); o.msg.classList.remove('pop'); void o.msg.offsetWidth; o.msg.classList.add('pop'); o.msg.hidden = false; clearTimeout(o.msgT); if (ms) o.msgT = setTimeout(() => { o.msg.hidden = true; }, ms); }
    const shared = {};
    // 1人ぶんの 道具（K）。shared の ゲームは 1つの K を ふたりで つかう
    function makeK(i, W) {
      const parts = [], floats = [], o = i < 0 ? { msg: cmsg, msgT: null } : halves[i];
      const K = {
        W: 0, H: 0, t: 0, diff: i < 0 ? 1 : diffs[i], diffs, seated: st.seated, look: st.look, chara: charaOf(st.vsChara[Math.max(0, i)]),
        score: 0, stats: {}, avgs: {}, parts, floats, shared, lead: i === 0, coop, vsDiff: gm.id === 'daruma' ? Math.round((diffs[0] + diffs[1]) / 2) : null,
        add(n, x, y, who) { const k = i < 0 ? who : i; if (k == null || k < 0) return; scores[k] += n; K.score = scores[k]; floats.push({ x, y, t: 0, s: '+' + n, c: PCOL[k].c }); showScore(k); },
        setScore(n) { if (i < 0 || n === scores[i]) return; scores[i] = n; K.score = n; showScore(i); },
        float(s, x, y) { floats.push({ x, y, t: 0, s }); },
        sfx, say: i > 0 ? () => {} : say,   // こえは 1人ぶんだけ（2人分 かさなると ききとれない）
        msg(text, sub, ms) { showMsg(o, text, sub, ms); },
        burst(x, y, cols, n) { n = st.calm ? Math.ceil((n || 16) / 3) : (n || 16); for (let k = 0; k < n; k++) { const a = rnd(0, 7), v = rnd(120, 420); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, life: rnd(0.5, 0.9), c: pick(cols), r: rnd(4, 9) }); } },
        stat(k) { K.stats[k] = (K.stats[k] || 0) + 1; },
        statAvg(k, v) { const a = K.avgs[k] = K.avgs[k] || { s: 0, n: 0 }; a.s += v; a.n++; },
        bgm(on, tune) { if (i > 0) return; if (on) { BGM.stop(); BGM.start(tune); } else BGM.stop(); }
      };
      return K;
    }
    const pl = gm.shared ? [{ K: makeK(-1), rand: mulberry(seed) }] : [0, 1].map(i => ({ K: makeK(i), rand: mulberry(seed), i }));
    let state = 'boot', okT = 0, cnt = 0, cntT = 0, left = TIME, last = 0, raf = 0, ended = false;
    const Bs = [null, null];

    function ready() {
      const needLegs = gm.legs && !st.seated;
      guide.firstChild.textContent = '👫 ふたりとも ' + (st.seated ? 'かたと てが' : needLegs ? 'あたまから あしまで' : 'あたまと てが') + ' うつるように ならんでね';
      checks.innerHTML = '';
      let all = true;
      [0, 1].forEach(i => {
        const B = Bs[i], items = [['あたま', B && B.vis(B.nose)], ['かた', B && B.ok], ['て', B && B.hasHands]].concat(needLegs ? [['あし', B && B.hasLegs]] : []);
        if (!items.every(x => x[1])) all = false;
        checks.append(h('div', { class: 'vrow', style: 'border-color:' + PCOL[i].c }, h('b', { style: 'color:' + PCOL[i].d }, PCOL[i].e + ' ' + PCOL[i].n), items.map(([t, ok]) => h('span', { class: ok ? 'ok' : '' }, (ok ? '✅ ' : '⬜ ') + t))));
      });
      return all;
    }
    function startCount() { if (state !== 'ready') return; state = 'count'; cnt = 3; cntT = 0; guide.hidden = true; sfx('beep'); showMsg({ msg: cmsg }, '3', null, 0); }
    function startGame() {
      state = 'run'; left = TIME;
      pl.forEach(p => { p.game = withRand(p.rand, () => gm.create(p.K)); });
      showMsg({ msg: cmsg }, coop ? 'ふたりで がんばろう！' : 'よーい スタート！', gm.how, 1800); sfx('go'); say(coop ? 'ふたりで がんばろう！ スタート！' : 'よーい、スタート！');
      if (gm.bgm) BGM.start(gm.bgm);
      window.__karada.cur = { pl, gm, scores };
    }
    function finish(quitEarly) {
      if (ended) return; ended = true;
      BGM.stop(); cancelAnimationFrame(raf);
      const dur = Math.round(TIME - Math.max(0, left));
      if (quitEarly && dur < 5) { go(renderVsHome); return; }
      logPush({ t: Date.now(), g: gm.id, score: scores[0] + scores[1], dur, diff: diffs[0], seated: st.seated, vs: { mode: st.vsMode, s: scores.slice(), d: diffs.slice() }, stats: gm.shared ? pl[0].K.stats : {}, avgs: {} });
      go(renderVsResult, { gm, scores: scores.slice(), coop, goal, quitEarly });
    }

    function drawBody(gg, B, i, alpha) { if (!B || st.look === 'cam') return; drawAvatar(gg, B, charaOf(st.vsChara[i]), alpha); if (B.vis(B.nose)) { gg.fillStyle = PCOL[i].c; gg.font = '900 ' + Math.round(B.sw * 0.32) + 'px sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.strokeStyle = '#fff'; gg.lineWidth = 5; const y = B.nose.y - B.sw * 1.35; gg.strokeText(PCOL[i].n, B.nose.x, y); gg.fillText(PCOL[i].n, B.nose.x, y); } }
    function drawFx(gg, K, dt) {
      const P = K.parts, F = K.floats;
      for (let k = P.length - 1; k >= 0; k--) { const p = P[k]; p.t += dt; if (p.t > p.life) { P.splice(k, 1); continue; } p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; gg.globalAlpha = 1 - p.t / p.life; gg.fillStyle = p.c; gg.beginPath(); gg.arc(p.x, p.y, p.r, 0, 7); gg.fill(); }
      gg.globalAlpha = 1;
      for (let k = F.length - 1; k >= 0; k--) { const f = F[k]; f.t += dt; if (f.t > 0.9) { F.splice(k, 1); continue; } gg.globalAlpha = 1 - f.t / 0.9; gg.fillStyle = f.c || '#F76707'; gg.strokeStyle = '#fff'; gg.lineWidth = 6; gg.font = '900 ' + Math.round(Math.min(K.W, K.H) * 0.08) + 'px sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.strokeText(f.s, f.x, f.y - f.t * 80); gg.fillText(f.s, f.x, f.y - f.t * 80); }
      gg.globalAlpha = 1;
    }
    // カメラの 中の 2人を 左・右に わける（画面の 左に いる 人＝あか）
    function assign(lms, W, H) {
      const c = (lms || []).slice(0, 2).map(l => ({ l, x: 1 - (l[11].x + l[12].x) / 2 }));   // かがみ うつしの 画面での よこ位置
      c.sort((a, b) => a.x - b.x);
      let L = null, R = null;
      if (c.length === 2) { L = c[0].l; R = c[1].l; } else if (c.length === 1) { if (c[0].x < 0.5) L = c[0].l; else R = c[0].l; }
      Bs[0] = readBody(L, W, H, 0); Bs[1] = readBody(R, W, H, 1);
    }
    const shift = (B, dx, W, H) => B ? mkBody(B.pts.map(p => ({ x: p.x + dx, y: p.y, v: p.v })), W, H) : null;

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const d = Math.min(2, window.devicePixelRatio || 1), r = stage.getBoundingClientRect();
      const W = Math.round(r.width), H = Math.round(r.height), hw = W / 2;
      if (cv.width !== W * d || cv.height !== H * d) { cv.width = W * d; cv.height = H * d; }
      g.setTransform(d, 0, 0, d, 0, 0);
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      const lms = readPoses();
      if (lms !== undefined) assign(lms, W, H);
      g.clearRect(0, 0, W, H);
      const scene = st.look === 'chara';
      if (gm.shared) {
        const p = pl[0], K = p.K; K.W = W; K.H = H; K.t += dt;
        if (scene) { if (p.game && p.game.drawBg) p.game.drawBg(g); else { sky(g, W, H, '#C3FAE8', '#E6FCF5'); driftClouds(g, W, H, K.t); } } else { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, W, H); }
        Bs.forEach((B, i) => drawBody(g, B, i, 1));
        if (state === 'run') withRand(p.rand, () => p.game.update(dt, Bs));
        if (p.game) p.game.draw(g, Bs);
        drawFx(g, K, dt);
      } else {
        pl.forEach(p => {
          const i = p.i, K = p.K, ox = i * hw; K.W = hw; K.H = H; K.t += dt;
          const B = shift(Bs[i], -ox, hw, H);
          g.save(); g.beginPath(); g.rect(ox, 0, hw, H); g.clip(); g.translate(ox, 0);
          if (scene) { if (p.game && p.game.drawBg) p.game.drawBg(g); else { sky(g, hw, H, i ? '#D0EBFF' : '#FFE3E3', '#F8F9FA'); driftClouds(g, hw, H, K.t); } } else { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, hw, H); }
          drawBody(g, B, i, p.game ? (scene ? p.game.avatarAlpha : 0.85) : 1);
          if (state === 'run') withRand(p.rand, () => p.game.update(dt, B && B.ok ? B : null));
          if (p.game) p.game.draw(g, B);
          drawFx(g, K, dt);
          if (state === 'run' && !(B && B.ok) && Math.floor(K.t * 2) % 2 === 0) { g.fillStyle = 'rgba(0,0,0,.5)'; g.font = '700 20px sans-serif'; g.textAlign = 'center'; g.fillText('🙋 ' + PCOL[i].n + ' が みえないよ', hw / 2, H - 40); }
          g.restore();
        });
        // まんなかの せん と 2人の いろの わく
        g.fillStyle = '#fff'; g.fillRect(hw - 3, 0, 6, H);
        [0, 1].forEach(i => { g.strokeStyle = PCOL[i].c; g.lineWidth = 8; g.strokeRect(i * hw + 4, 4, hw - 8, H - 8); });
      }
      if (state === 'ready') { const ok = ready(); okT = ok ? okT + dt : 0; if (okT > 1.2) startCount(); }
      else if (state === 'count') { cntT += dt; if (cntT >= 0.8) { cntT = 0; cnt--; if (cnt > 0) { sfx('beep'); showMsg({ msg: cmsg }, String(cnt), null, 0); } else { cmsg.hidden = true; startGame(); } } }
      else if (state === 'run') { left -= dt; timerBar.style.width = clamp(left / TIME * 100, 0, 100) + '%'; if (left <= 0) { sfx('whistle'); finish(false); } }
    }

    (async () => {
      try { await timeout(startCam(), 20000, 'camtimeout'); }
      catch (e) {
        loading.innerHTML = ''; loading.append(h('div', null, h('span', { class: 'emo' }, '🙈'), 'カメラを ひらけませんでした。', h('small', { style: 'display:block;font-size:14px;opacity:.75;margin-top:6px' }, String(e && (e.name + ' ' + e.message) || e)),
          h('div', { style: 'display:flex;gap:10px;justify-content:center;margin-top:14px' }, h('button', { class: 'pill', type: 'button', onclick: () => go(renderVs, arg) }, '🔄 もう いちど'), h('button', { class: 'pill', type: 'button', onclick: () => go(renderVsHome) }, '🏠 もどる'))));
        return;
      }
      if (!stage.isConnected) return;
      video.className = 'camvideo'; stage.insertBefore(video, stage.firstChild); video.play().catch(() => {});
      const tick = setInterval(() => { const el = loading.querySelector('.lt'); if (el) el.textContent = 'よみとりの じゅんび：' + (V.step || '…'); }, 300);
      try { await timeout(loadVision(), 120000, 'visiontimeout'); await setPoses(2); }
      catch (e) { clearInterval(tick); loading.innerHTML = ''; loading.append(h('div', null, h('span', { class: 'emo' }, '🙈'), 'よみとりの じゅんびが できませんでした。', h('button', { class: 'pill', type: 'button', style: 'margin-top:14px', onclick: () => go(renderVs, arg) }, '🔄 もう いちど'))); return; }
      clearInterval(tick);
      if (!stage.isConnected) return;
      loading.hidden = true; state = 'ready'; keepAwake(); V.stillSince = performance.now();
      say(gm.name + '。' + (coop ? 'きょうりょく' : 'たいせん') + '。あかは ひだり、あおは みぎに ならんでね');
    })();
    raf = requestAnimationFrame(frame);
    leave = () => { ended = true; cancelAnimationFrame(raf); BGM.stop(); halves.forEach(o => clearTimeout(o.msgT)); stopCam(); readBody(null, 0, 0, 0); readBody(null, 0, 0, 1); };
  }

  /* ---------- ふたりで：けっか ---------- */
  function renderVsResult(o) {
    const { gm, scores, coop, goal, quitEarly } = o, t = scores[0] + scores[1];
    const box = i => h('div', { class: 'vres' + (!coop && scores[i] > scores[1 - i] ? ' win' : ''), style: 'border-color:' + PCOL[i].c + ';background:' + PCOL[i].bg },
      !coop && scores[i] > scores[1 - i] ? h('div', { class: 'crown emo' }, '👑') : null,
      h('div', { style: 'color:' + PCOL[i].d + ';font-size:24px' }, PCOL[i].e + ' ' + PCOL[i].n),
      h('div', { class: 'num', style: 'color:' + PCOL[i].d }, scores[i], h('small', null, ' ' + gm.unit)));
    let title, voice;
    if (coop) {
      const stars = t >= goal ? 3 : t >= goal * 0.6 ? 2 : 1;
      title = t >= goal ? 'ゴール！ ふたりで やったね！' : 'ふたりで ' + t + gm.unit + '！';
      voice = 'ふたりで ' + t + gm.unit + '。' + (t >= goal ? 'ゴール！ ナイス チームワーク！' : pick(PRAISE));
      main.appendChild(h('section', { class: 'screen result' },
        h('div', { class: 'big emo' }, '🤝'), h('h2', null, title),
        h('div', { class: 'num' }, t, h('small', null, ' / ' + goal + ' ' + gm.unit)), starRow(stars),
        h('div', { class: 'vresrow' }, box(0), box(1)), acts()));
    } else {
      const w = scores[0] === scores[1] ? -1 : scores[0] > scores[1] ? 0 : 1;
      title = w < 0 ? 'ひきわけ！' : PCOL[w].n + ' の かち！';
      // まけた 子にも かならず ことばを（つぎも やりたく なるように）
      voice = PCOL[0].n + ' ' + scores[0] + '、' + PCOL[1].n + ' ' + scores[1] + '。' + (w < 0 ? 'ひきわけ！ ふたりとも すごい！' : PCOL[w].n + 'の かち！ ' + PCOL[1 - w].n + 'も よく がんばったね！');
      main.appendChild(h('section', { class: 'screen result' },
        h('div', { class: 'big emo' }, w < 0 ? '🤝' : '🏆'), h('h2', null, quitEarly ? 'おしまい！' : title),
        h('div', { class: 'vresrow' }, box(0), h('div', { class: 'vsmark' }, 'VS'), box(1)),
        w >= 0 ? h('div', { class: 'sub', style: 'font-size:20px' }, PCOL[1 - w].e + ' ' + PCOL[1 - w].n + ' も よく がんばったね！') : h('div', { class: 'sub', style: 'font-size:20px' }, 'ふたりとも すごい！'),
        acts()));
    }
    function acts() {
      return h('div', { class: 'acts' },
        h('button', { class: 'big-btn go', type: 'button', onclick: () => go(renderVs, { gm }) }, '🔁 もういちど'),
        h('button', { class: 'big-btn or', type: 'button', onclick: () => go(renderVsHome) }, '⚔️ ほかの あそび'),
        h('button', { class: 'big-btn blue', type: 'button', onclick: () => go(renderHome) }, '🏠 ホーム'));
    }
    setTimeout(() => { if (!st.calm) FX.big(); else sfx('good'); say(voice); }, 300);
  }
