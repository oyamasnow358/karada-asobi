  /* ============================================================
     画面
     ============================================================ */
  const main = $('#main');
  let leave = null;
  function go(fn, arg) {
    if (leave) { try { leave(); } catch (e) { /* 無視 */ } leave = null; }
    document.body.classList.remove('playing');
    main.innerHTML = '';
    fn(arg);
  }

  /* ---------- ホーム ---------- */
  function renderHome() {
    const who = h('div', { class: 'who' }, h('span', null, 'だれに なる？'));
    CHARAS.forEach(c => {
      const cv = h('canvas', { width: 124, height: 124 });
      const b = h('button', { class: 'chara' + (st.chara === c.id ? ' on' : ''), type: 'button', 'aria-label': c.name, onclick: () => { st.chara = c.id; saveSt(); sfx('pop'); say(c.name); who.querySelectorAll('.chara').forEach(x => x.classList.remove('on')); b.classList.add('on'); } }, cv);
      const g = cv.getContext('2d'); g.translate(0, 22); drawAvatar(g, demoBody(124, 124, 0), c);
      who.appendChild(b);
    });
    const scr = h('section', { class: 'screen home' },
      h('h1', null, h('span', { class: 'emo' }, '🤸'), ' からだで あそぼ'),
      who,
      h('div', { class: 'games' }, GAMES.map(gm => {
        const best = bestOf(gm.id);
        return h('button', { class: 'gcard' + (gm.legs && !st.seated ? ' stand' : ''), type: 'button', onclick: () => { A(); go(renderPlay, gm); } },
          h('span', { class: 'emo' }, gm.e), h('span', null, h('span', { class: 'nm' }, gm.name), h('small', null, gm.desc)),
          best ? h('span', { class: 'best' }, '🏆 ' + best) : null);
      })),
      h('p', { class: 'help', style: 'margin:0;text-align:center' }, st.seated ? '🪑 すわって モード（⚙️ ながおしで かえられます）' : 'iPad を ななめ前に おいて、からだ ぜんぶが うつる ところで あそぼう'));
    main.appendChild(scr);
  }

  /* ---------- あそぶ ---------- */
  function renderPlay(gm) {
    document.body.classList.add('playing');
    const cv = h('canvas', { class: 'game' });
    const scoreEl = h('div', { class: 'score' }, h('span', { class: 'emo' }, gm.e), h('span', null, '0'));
    const quit = h('button', { class: 'quit', type: 'button' }, h('i'), h('span', null, '✕ おわる'));
    const timerBar = h('i', { style: 'width:100%' });
    const msgEl = h('div', { class: 'msg' });
    const checks = h('div', { class: 'checks' });
    const guide = h('div', { class: 'guide' }, h('div', { class: 't' }, ''), checks,
      h('button', { class: 'big-btn go', type: 'button', style: 'min-height:64px;min-width:220px;font-size:24px', onclick: () => startCount() }, '▶ はじめる'));
    const loading = h('div', { class: 'loading' }, h('div', null, h('span', { class: 'emo' }, '📷'), h('span', { class: 'lt' }, 'カメラを ひらいています…')));
    const stage = h('div', { class: 'stage' }, cv, h('div', { class: 'hud' }, quit, scoreEl), msgEl, guide, h('div', { class: 'timer' }, timerBar), loading);
    main.appendChild(h('section', { class: 'screen' }, stage));
    const g = cv.getContext('2d');
    const layer = document.createElement('canvas');

    // おわる（1.5びょう ながおし）
    let qt = null; const qc = () => { clearTimeout(qt); quit.classList.remove('pressing'); };
    quit.addEventListener('pointerdown', e => { e.preventDefault(); quit.classList.add('pressing'); qt = setTimeout(() => { qc(); finish(true); }, 1500); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => quit.addEventListener(ev, qc));

    // ---- 共通の 道具（K） ----
    const parts = [], floats = [];
    let msgT = null;
    const K = {
      W: 0, H: 0, t: 0, diff: st.diff, seated: st.seated, look: st.look, chara: charaOf(st.chara),
      score: 0, stats: {}, avgs: {},
      add(n, x, y) { K.score += n; scoreEl.lastChild.textContent = K.score; scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump'); floats.push({ x, y, t: 0, s: '+' + n }); },
      sfx, say,
      msg(text, sub, ms) { msgEl.innerHTML = ''; msgEl.append(text, sub ? h('small', null, sub) : ''); msgEl.classList.remove('pop'); void msgEl.offsetWidth; msgEl.classList.add('pop'); msgEl.hidden = false; clearTimeout(msgT); if (ms) msgT = setTimeout(() => { msgEl.hidden = true; }, ms); },
      burst(x, y, cols, n) { for (let i = 0; i < (n || 16); i++) { const a = rnd(0, 7), v = rnd(120, 420); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, life: rnd(0.5, 0.9), c: pick(cols), r: rnd(4, 9) }); } },
      stat(k) { K.stats[k] = (K.stats[k] || 0) + 1; },
      statAvg(k, v) { const a = K.avgs[k] = K.avgs[k] || { s: 0, n: 0 }; a.s += v; a.n++; },
      bgm(on, tune) { if (on) { BGM.stop(); BGM.start(tune); } else BGM.stop(); }
    };
    msgEl.hidden = true;

    let state = 'boot', game = null, B = null, okT = 0, cnt = 0, cntT = 0, left = st.time, last = 0, raf = 0, ended = false;
    function setGuide() {
      const needLegs = gm.legs && !st.seated;
      guide.firstChild.textContent = st.seated ? '🪑 かたと てが うつるように すわってね' : needLegs ? '🧍 あたまから あしまで うつるように はなれてね' : '🧍 あたまと てが うつるように はなれてね';
      const items = [['あたま', B && B.vis(B.nose)], ['かた', B && B.ok], ['て', B && B.hasHands]].concat(needLegs ? [['あし', B && B.hasLegs]] : []);
      checks.innerHTML = ''; items.forEach(([t, ok]) => checks.append(h('span', { class: ok ? 'ok' : '' }, (ok ? '✅ ' : '⬜ ') + t)));
      return items.every(x => x[1]);
    }
    function startCount() { if (state !== 'ready') return; state = 'count'; cnt = 3; cntT = 0; guide.hidden = true; sfx('beep'); K.msg('3', null, 0); }
    function startGame() {
      state = 'run'; game = gm.create(K); left = st.time; window.__karada.cur = { K, game, gm };
      K.msg('スタート！', gm.how, 1600); sfx('go'); say('スタート！');
      if (gm.bgm) BGM.start(gm.bgm);
    }
    function finish(quitEarly) {
      if (ended) return; ended = true;
      BGM.stop(); cancelAnimationFrame(raf);
      const dur = Math.round(st.time - Math.max(0, left));
      if (quitEarly && dur < 5) { go(renderHome); return; }
      const rec = { t: Date.now(), g: gm.id, score: K.score, dur, diff: st.diff, seated: st.seated, stats: K.stats, avgs: Object.fromEntries(Object.entries(K.avgs).map(([k, v]) => [k, Math.round(v.s / v.n * 100)])) };
      logPush(rec);
      go(renderResult, { gm, rec, quitEarly });
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const d = Math.min(2, window.devicePixelRatio || 1), r = stage.getBoundingClientRect();
      const W = Math.round(r.width), H = Math.round(r.height);
      if (cv.width !== W * d || cv.height !== H * d) { cv.width = W * d; cv.height = H * d; }
      g.setTransform(d, 0, 0, d, 0, 0);
      K.W = W; K.H = H;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; K.t += dt;
      // からだ
      if (V.ready && video.readyState >= 2 && video.videoWidth && video.currentTime !== V.lastVT) {
        V.lastVT = video.currentTime;
        let t = performance.now(); if (t <= V.lastT) t = V.lastT + 1; V.lastT = t;
        try { const res = V.pose.detectForVideo(video, t); B = readBody(res.landmarks && res.landmarks[0], W, H); } catch (e) { console.warn(e); }
      }
      // かく
      g.clearRect(0, 0, W, H);
      const scene = st.look === 'chara';
      if (scene) { if (game && game.drawBg) game.drawBg(g); else { sky(g, W, H, '#C3FAE8', '#E6FCF5'); driftClouds(g, W, H, K.t); } }
      else { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, W, H); }
      if (st.look !== 'cam' && B) {
        const al = game ? (scene ? game.avatarAlpha : 0.85) : 1;
        if (al >= 1) drawAvatar(g, B, K.chara, 1);
        else {   // うすく する ときは 1まいの 絵に してから かさねる（かさなりが こく ならない）
          if (layer.width !== cv.width || layer.height !== cv.height) { layer.width = cv.width; layer.height = cv.height; }
          const lg = layer.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, layer.width, layer.height); lg.setTransform(d, 0, 0, d, 0, 0);
          drawAvatar(lg, B, K.chara, 1);
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = al; g.drawImage(layer, 0, 0); g.restore();
        }
      }
      if (state === 'ready') {
        const ok = setGuide();
        okT = ok ? okT + dt : 0;
        if (okT > 1.2) startCount();
      } else if (state === 'count') {
        cntT += dt;
        if (cntT >= 0.8) { cntT = 0; cnt--; if (cnt > 0) { sfx('beep'); K.msg(String(cnt), null, 0); } else { msgEl.hidden = true; startGame(); } }
      } else if (state === 'run') {
        game.update(dt, B);
        left -= dt; timerBar.style.width = clamp(left / st.time * 100, 0, 100) + '%';
        if (left <= 0) { sfx('whistle'); finish(false); return; }
      }
      if (game) game.draw(g);
      // つぶつぶ・+1
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; } p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t += dt; if (f.t > 0.9) { floats.splice(i, 1); continue; } g.globalAlpha = 1 - f.t / 0.9; g.fillStyle = '#F76707'; g.strokeStyle = '#fff'; g.lineWidth = 6; g.font = '900 ' + Math.round(Math.min(W, H) * 0.07) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(f.s, f.x, f.y - f.t * 80); g.fillText(f.s, f.x, f.y - f.t * 80); }
      g.globalAlpha = 1;
      if (state !== 'boot' && !(B && B.ok) && state === 'run' && Math.floor(K.t * 2) % 2 === 0) { g.fillStyle = 'rgba(0,0,0,.45)'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; g.fillText('🙋 からだが みえないよ', W / 2, H - 40); }
    }

    // カメラ → よみとり → じゅんび
    (async () => {
      try { await timeout(startCam(), 20000, 'camtimeout'); }
      catch (e) {
        const m = String(e && (e.name + ' ' + e.message) || e);
        loading.innerHTML = ''; loading.append(h('div', null, h('span', { class: 'emo' }, '🙈'),
          /NotAllowed|Permission|Security/i.test(m) ? 'カメラを つかう ことが ゆるされていません。' : /nocam/.test(m) ? 'この 画面では カメラが つかえません（Safari で ひらいてください）。' : 'カメラを ひらけませんでした。',
          h('small', { style: 'display:block;font-size:14px;opacity:.75;margin-top:6px' }, /NotAllowed|Permission/i.test(m) ? 'iPad の「設定」→「アプリ」→「Safari」→「カメラ」を「確認」か「許可」に して、ひらきなおしてください。' : m),
          h('div', { style: 'display:flex;gap:10px;justify-content:center;margin-top:14px' }, h('button', { class: 'pill', type: 'button', onclick: () => go(renderPlay, gm) }, '🔄 もう いちど'), h('button', { class: 'pill', type: 'button', onclick: () => go(renderHome) }, '🏠 もどる'))));
        return;
      }
      if (!stage.isConnected) return;
      video.className = 'camvideo'; stage.insertBefore(video, stage.firstChild); video.play().catch(() => {});
      loading.querySelector('.lt').textContent = 'からだの よみとりを じゅんび ちゅう…';
      const tick = setInterval(() => { const el = loading.querySelector('.lt'); if (el) el.textContent = 'よみとりの じゅんび：' + (V.step || '…'); }, 300);
      try { await timeout(loadVision(), 120000, 'visiontimeout'); }
      catch (e) { clearInterval(tick); loading.innerHTML = ''; loading.append(h('div', null, h('span', { class: 'emo' }, '🙈'), 'よみとりの じゅんびが できませんでした。', h('small', { style: 'display:block;font-size:14px;opacity:.75;margin-top:6px' }, (V.step || '') + ' / ' + (e && e.message)), h('button', { class: 'pill', type: 'button', style: 'margin-top:14px', onclick: () => go(renderPlay, gm) }, '🔄 もう いちど'))); return; }
      clearInterval(tick);
      if (!stage.isConnected) return;
      loading.hidden = true; state = 'ready'; keepAwake();
      say(gm.name + '。' + (st.seated ? 'かたと てが うつるように すわってね' : 'からだが うつるように はなれてね'));
    })();
    raf = requestAnimationFrame(frame);
    leave = () => { ended = true; cancelAnimationFrame(raf); BGM.stop(); clearTimeout(msgT); stopCam(); prevPts = null; };
  }

  /* ---------- けっか ---------- */
  function renderResult(o) {
    const { gm, rec, quitEarly } = o;
    const rate = rec.dur > 0 ? rec.score / (rec.dur / 60) : 0;
    const th = gm.perMin.map(x => x * [0.7, 1, 1.3][rec.diff]);
    const stars = rec.score <= 0 ? 1 : rate >= th[2] ? 3 : rate >= th[1] ? 2 : 1;
    const best = logAll().filter(x => x.g === gm.id && x.seated === rec.seated && x.t !== rec.t).reduce((m, x) => Math.max(m, x.score), 0);
    const newBest = rec.score > 0 && rec.score > best;
    // 子どもの 画面には「できた こと」だけ 出す（％などは 先生用の きろくへ）
    const extra = Object.entries(rec.stats || {}).filter(([k]) => k !== 'ラウンド').map(([k, v]) => k + ' ' + v + 'かい').join('　');
    const p = rec.score > 0 ? pick(PRAISE) : 'がんばったね！';
    main.appendChild(h('section', { class: 'screen result' },
      h('div', { class: 'big emo' }, gm.e),
      h('h2', null, quitEarly ? 'おしまい！' : p),
      h('div', { class: 'num' }, rec.score, h('small', null, ' ' + gm.unit)),
      h('div', { class: 'stars' }, [0, 1, 2].map(i => h('span', { class: 'emo', style: 'animation-delay:' + (0.3 + i * 0.25) + 's;' + (i < stars ? '' : 'filter:grayscale(1);opacity:.35') }, '⭐'))),
      newBest ? h('div', { style: 'font-size:22px;color:var(--or)' }, '🏆 じこ ベスト こうしん！') : null,
      extra ? h('div', { class: 'sub' }, extra) : null,
      h('div', { class: 'acts' },
        h('button', { class: 'big-btn go', type: 'button', onclick: () => go(renderPlay, gm) }, '🔁 もういちど'),
        h('button', { class: 'big-btn blue', type: 'button', onclick: () => go(renderHome) }, '🏠 ほかの あそび'))));
    setTimeout(() => { FX.big(); say((quitEarly ? 'おしまい。' : p) + rec.score + gm.unit + '。' + (newBest ? 'じこベスト こうしん！' : '')); }, 300);
  }

  /* ============================================================
     先生用
     ============================================================ */
  let tTab = 'set';
  function openTeacher() { if (canSpeak) speechSynthesis.cancel(); renderTeacher(); $('#teacher').classList.add('open'); }
  function closeTeacher() { $('#teacher').classList.remove('open'); if (!document.body.classList.contains('playing')) go(renderHome); }
  $('#tClose').addEventListener('click', closeTeacher);
  $('#teacher').addEventListener('click', e => { if (e.target.id === 'teacher') closeTeacher(); });
  function renderTeacher() {
    const tabs = $('#tTabs'); tabs.innerHTML = '';
    [['set', '🛠️ せってい'], ['log', '📊 きろく'], ['help', '❓ つかいかた']].forEach(([k, t]) => tabs.append(h('button', { type: 'button', class: tTab === k ? 'on' : '', onclick: () => { tTab = k; renderTeacher(); } }, t)));
    const b = $('#tBody'); b.innerHTML = '';
    if (tTab === 'set') {
      const seg = (label, key, opts, help) => h('div', { class: 'row' }, h('span', { class: 'lb' }, label), h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', { type: 'button', class: st[key] === v ? 'on' : '', onclick: () => { st[key] = v; saveSt(); renderTeacher(); } }, t))), help ? h('small', null, help) : null);
      b.append(
        seg('すわって モード', 'seated', [[false, '🧍 たって'], [true, '🪑 すわって']], 'すわって：あしを つかわない（ジャンプは バンザイで とぶ・かたあし ポーズは でない）'),
        seg('あそぶ じかん', 'time', [[30, '30びょう'], [60, '1ぷん'], [90, '1ぷん30'], [120, '2ふん'], [180, '3ぷん']]),
        seg('むずかしさ', 'diff', [[0, 'やさしい'], [1, 'ふつう'], [2, 'むずかしい']], 'ふうせんの 大きさ・はやさ、ジャンプの 高さ、とまる きびしさ などが かわります'),
        seg('みため', 'look', [['chara', '🐻 キャラ'], ['both', '📷＋🐻 りょうほう'], ['cam', '📷 カメラ']], '「キャラ」は カメラの 映像を 出さないので、映像が 気になる 子や 写りたくない 子にも'),
        seg('こうかおん', 'sound', [[true, 'ならす'], [false, 'ならさない']]),
        seg('BGM', 'bgm', [[true, 'ながす'], [false, 'ながさない']], '音が にがてな 子には「ながさない」'),
        seg('こえ', 'voice', [[true, 'よみあげる'], [false, 'よまない']]));
    } else if (tTab === 'log') {
      const a = logAll().slice().reverse();
      const name = id => (GAMES.find(x => x.id === id) || { name: id }).name;
      b.append(a.length ? h('table', { class: 'log' }, h('tr', null, ['日時', 'あそび', 'けっか', 'じかん', 'ようす'].map(t => h('th', null, t))),
        a.slice(0, 80).map(x => h('tr', null, h('td', null, new Date(x.t).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })), h('td', null, name(x.g) + (x.seated ? '🪑' : '')), h('td', null, x.score), h('td', null, x.dur + 'びょう'),
          h('td', null, Object.entries(x.stats || {}).map(([k, v]) => k + v).concat(Object.entries(x.avgs || {}).map(([k, v]) => k + v + '%')).join(' '))))) : h('p', { class: 'help' }, 'まだ きろくが ありません'),
        h('div', { class: 'row' },
          h('button', { class: 'pill', type: 'button', onclick: () => { const csv = '﻿日時,あそび,けっか,じかん(秒),むずかしさ,すわって,ようす\n' + logAll().map(x => [new Date(x.t).toLocaleString('ja-JP'), name(x.g), x.score, x.dur, ['やさしい', 'ふつう', 'むずかしい'][x.diff], x.seated ? 'はい' : '', Object.entries(x.stats || {}).map(([k, v]) => k + v).concat(Object.entries(x.avgs || {}).map(([k, v]) => k + v + '%')).join(' ')].join(',')).join('\n'); const el = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'からだであそぼ_きろく.csv' }); document.body.appendChild(el); el.click(); setTimeout(() => el.remove(), 500); } }, '📄 CSV で かきだす'),
          h('button', { class: 'pill danger', type: 'button', onclick: () => { if (confirm('きろくを ぜんぶ けしますか？')) { localStorage.removeItem(LOG_KEY); renderTeacher(); } } }, '🗑️ けす')),
        h('p', { class: 'help', style: 'margin:0' }, '「とまる ちから」は だるまさんで どれだけ ピタッと とまれたか（100%＝まったく うごかない）。きろくは この iPad の 中だけに あります。'));
    } else {
      b.innerHTML = `<div class="help" style="font-size:16px;color:var(--ink);line-height:1.8">
      <b>おきかた</b><br>iPad を スタンドに たてて、子どもの ななめ前 1.5〜2.5m（すわって モードは 1〜1.5m）。画面に あたま・かた・て（ジャンプは あしも）が うつれば 自動で はじまります。<br><br>
      <b>あそびと ねらい</b><br>
      🎈 ふうせん わり … 手を のばす・からだの 正中線を こえる・目と手の 協応<br>
      🐦 とりに なって とぼう … 両手を 同時に うごかす（両側協調）・リズム・肩まわり<br>
      🐸 ぴょんぴょん ジャンプ … タイミングを あわせて とぶ・全身の 協調（すわって モードは バンザイ）<br>
      🔴 だるまさんが ころんだ … うごく↔とまるの きりかえ（抑制の コントロール）・きく 力<br>
      🤸 まねっこ ポーズ … ボディイメージ・左右の 理解・姿勢を たもつ<br><br>
      <b>こまった とき</b><br>・「からだが みえないよ」→ もう すこし はなれる／明るい 場所で<br>・ジャンプが はんのう しない →「むずかしさ」を「やさしい」に<br>・映像が 気になる →「みため」を「キャラ」に<br><br>
      <b>プライバシー</b><br>カメラの 映像は 保存も 送信も しません。iPad の 中で からだの 点だけを つかいます。</div>`;
    }
  }
  (function () {
    const g = $('#gear'); let t = null; const c = () => { clearTimeout(t); g.classList.remove('pressing'); };
    g.addEventListener('pointerdown', e => { e.preventDefault(); g.classList.add('pressing'); t = setTimeout(() => { c(); openTeacher(); }, 1500); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => g.addEventListener(ev, c));
    g.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => { if (e.shiftKey && (e.key === 'S' || e.key === 's')) openTeacher(); if (e.key === 'Escape') closeTeacher(); });
  })();
  function makeTouchIcon() { try { const c = document.createElement('canvas'); c.width = c.height = 180; const g = c.getContext('2d'); g.fillStyle = '#8CE99A'; g.fillRect(0, 0, 180, 180); g.font = '118px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🤸', 90, 98); $('#touchIcon').href = c.toDataURL(); } catch (e) { /* 無視 */ } }

  /* ============================================================
     はじまり
     ============================================================ */
  if (canSpeak) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }
  document.addEventListener('pointerdown', function unlock() { A(); if (canSpeak) { try { const u = new SpeechSynthesisUtterance(''); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* 無視 */ } } }, { once: true });
  makeTouchIcon();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  go(renderHome);
  setTimeout(() => loadVision().catch(() => {}), 1200);
  window.__karada = { V, st, GAMES, readBody, get prev() { return prevPts; } };
