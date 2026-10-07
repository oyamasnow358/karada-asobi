  /* ============================================================
     おいわいの 演出（クラッカー・はなび・かみふぶき）  FX
     FX.small(el)  … 1つ できたとき（ボタンから はじける）
     FX.big()      … ぜんぶ できたとき（クラッカー → はなび → かみふぶき）
     ============================================================ */
  const FX = (function () {
    let cv = null, cx = null, parts = [], raf = 0, last = 0;
    const COLS = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA', '#F783AC', '#38D9A9', '#FFFFFF'];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const calm = () => document.body.classList.contains('calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    function ensure() {
      if (cv) return;
      cv = document.createElement('canvas');
      cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:44';
      document.body.appendChild(cv);
      cx = cv.getContext('2d');
      const fit = () => { const d = Math.min(window.devicePixelRatio || 1, 2); cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); };
      fit(); window.addEventListener('resize', fit);
    }
    function loop(t) {
      const dt = Math.min(40, t - (last || t)); last = t;
      cx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life || p.y > innerHeight + 60) { if (p.onEnd) p.onEnd(p); parts.splice(i, 1); continue; }
        p.vy += (p.g || 0) * dt; p.vx *= p.drag || 1; p.vy *= p.drag || 1;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.vr || 0) * dt;
        const a = p.fade ? Math.max(0, 1 - p.age / p.life) : 1;
        cx.globalAlpha = a;
        if (p.k === 'paper') {   // ひらひら まう かみ
          const w = Math.cos(p.age / 120 + p.ph);
          cx.save(); cx.translate(p.x + Math.sin(p.age / 300 + p.ph) * 6, p.y); cx.rotate(p.rot); cx.scale(1, w);
          cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); cx.restore();
        } else if (p.k === 'ribbon') {  // くるくる リボン
          cx.strokeStyle = p.c; cx.lineWidth = 3; cx.beginPath();
          for (let j = 0; j < 6; j++) { const yy = p.y - j * 5, xx = p.x + Math.sin(p.age / 90 + j * .9 + p.ph) * 6; j ? cx.lineTo(xx, yy) : cx.moveTo(xx, yy); }
          cx.stroke();
        } else if (p.k === 'spark') {   // はなびの ひかり
          cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.s * (1 - p.age / p.life * .6), 0, 7); cx.fill();
        } else if (p.k === 'rocket') {
          cx.fillStyle = '#FFF3BF'; cx.beginPath(); cx.arc(p.x, p.y, 4, 0, 7); cx.fill();
          cx.globalAlpha = .5; cx.fillStyle = '#FFD43B'; cx.beginPath(); cx.arc(p.x, p.y + 10, 3, 0, 7); cx.fill();
        } else if (p.k === 'emoji') {
          cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.font = p.s + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
          cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(p.t, 0, 0); cx.restore();
        } else if (p.k === 'ring') {
          cx.strokeStyle = p.c; cx.lineWidth = 6 * (1 - p.age / p.life); cx.beginPath(); cx.arc(p.x, p.y, p.s + p.age * 0.35, 0, 7); cx.stroke();
        }
      }
      cx.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(loop) : 0;
      if (!raf) cx.clearRect(0, 0, innerWidth, innerHeight);
    }
    function go() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    const P = o => { parts.push(Object.assign({ age: 0, rot: 0, ph: Math.random() * 6 }, o)); };
    function burst(x, y, n, speed, kinds) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = rnd(speed * .4, speed);
        const k = kinds[i % kinds.length];
        if (k === 'paper') P({ k: 'paper', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .2, g: .0009, drag: .985, vr: rnd(-.01, .01), s: rnd(8, 14), c: COLS[i % COLS.length], life: 2600 });
        else P({ k: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .0003, drag: .975, s: rnd(2.5, 4.5), c: COLS[i % 8], life: 900, fade: true });
      }
      go();
    }
    /* ---- 音 ---- */
    let ac = null;
    function A() { try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch (e) { return null; } }
    function noise(dur, vol, f0, f1, delay) {
      const a = A(); if (!a || !FX.sound()) return;
      const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
      const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + (delay || 0);
      s.buffer = b; fl.type = 'bandpass'; fl.Q.value = 0.8; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.value = vol * FX.volume(); s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(t);
    }
    function popSound(delay) { noise(0.25, 1.4, 2200, 500, delay); }
    function boomSound(delay) { noise(0.9, 0.9, 700, 90, delay); }
    function whistle(delay) {
      const a = A(); if (!a || !FX.sound()) return;
      const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
      o.type = 'sine'; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(1800, t + .6);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.06 * FX.volume(), t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + .65);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .7);
    }
    function clap(delay, dur) { for (let i = 0; i < dur * 14; i++) noise(0.06, rnd(.3, .7), rnd(900, 2200), 0, delay + i / 14 + rnd(0, .05)); }

    // クラッカー（がめんの したの すみから）
    function cracker(side, delay) {
      setTimeout(() => {
        const x = side < 0 ? 40 : innerWidth - 40, y = innerHeight - 40, dir = side < 0 ? 1 : -1;
        P({ k: 'emoji', t: '🎉', x: x, y: y, s: 90, rot: side < 0 ? 0 : -1.4, life: 1100, fade: true });
        for (let i = 0; i < 90; i++) {
          const a = -Math.PI / 2 + dir * rnd(.15, .85), v = rnd(.7, 1.45);
          P({ k: i % 5 ? 'paper' : 'ribbon', x: x, y: y - 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .0011, drag: .986, vr: rnd(-.012, .012), s: rnd(9, 15), c: COLS[i % COLS.length], life: 3600 });
        }
        popSound(0); go();
      }, delay);
    }
    function firework(x, y, delay) {
      setTimeout(() => {
        P({ k: 'rocket', x: x, y: innerHeight, vx: 0, vy: -(innerHeight - y) / 600, life: 600, onEnd: p => { burst(p.x, p.y, 70, .45, ['spark', 'spark', 'spark', 'paper']); P({ k: 'ring', x: p.x, y: p.y, s: 10, c: '#FFE066', life: 500, fade: true }); boomSound(0); } });
        whistle(0); go();
      }, delay);
    }
    return {
      sound: () => true, volume: () => 1,
      small(el, opt) {
        if (calm() || !el) return;
        ensure();
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const v = (opt && opt.variant) != null ? opt.variant : Math.floor(Math.random() * 5);
        if (v === 0) burst(x, y, 40, .6, ['paper']);
        else if (v === 1) { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; P({ k: 'emoji', t: '⭐', x: x, y: y, vx: Math.cos(a) * .35, vy: Math.sin(a) * .35, g: .0004, s: 34, vr: .01, life: 900, fade: true }); } go(); }
        else if (v === 2) { for (let i = 0; i < 8; i++) P({ k: 'emoji', t: pick2(['💖', '💗', '💕']), x: x + rnd(-40, 40), y: y, vx: rnd(-.08, .08), vy: rnd(-.45, -.25), s: rnd(28, 44), life: 1300, fade: true }); go(); }
        else if (v === 3) { P({ k: 'ring', x: x, y: y, s: r.width * .3, c: '#FFD43B', life: 600, fade: true }); P({ k: 'ring', x: x, y: y, s: r.width * .2, c: '#69DB7C', life: 700, fade: true }); burst(x, y, 30, .5, ['spark']); }
        else { for (let i = 0; i < 12; i++) P({ k: 'emoji', t: pick2(['✨', '🌟', '🎵', '🍀']), x: x, y: y, vx: rnd(-.5, .5), vy: rnd(-.7, -.3), g: .0012, s: rnd(26, 40), vr: rnd(-.01, .01), life: 1200, fade: true }); go(); }
      },
      big() {
        if (calm()) return;
        ensure();
        cracker(-1, 0); cracker(1, 180);
        const W = innerWidth, H = innerHeight;
        firework(W * .25, H * .25, 700); firework(W * .72, H * .2, 1100); firework(W * .5, H * .32, 1500); firework(W * .35, H * .18, 1900);
        setTimeout(() => { for (let i = 0; i < 120; i++) P({ k: i % 6 ? 'paper' : 'ribbon', x: rnd(0, W), y: rnd(-H * .6, -10), vx: rnd(-.05, .05), vy: rnd(.08, .22), g: .00004, vr: rnd(-.01, .01), s: rnd(9, 15), c: COLS[i % COLS.length], life: 6000 }); go(); }, 1200);
        clap(0.4, 2.2);
      }
    };
    function pick2(a) { return a[Math.floor(Math.random() * a.length)]; }
  })();

  // ほめことば（いろいろ）
  const PRAISE_MORE = ['すごい！', 'やったね！', 'かっこいい！', 'いいね！', 'その ちょうし！', 'えらい！', 'じょうず！', 'ばっちり！', 'ナイス！', 'さすが！',
    'できたね！', 'すてき！', 'てんさい！', 'グッド！', 'パーフェクト！', 'きまった！', 'いい かんじ！', 'がんばったね！', 'さいこう！', 'ピカピカ！',
    'すばらしい！', 'まえより じょうず！', 'おみごと！', 'どんどん いこう！', 'かがやいてる！'];
  const PRAISE_COLORS = ['#F76707', '#E64980', '#1C7ED6', '#2F9E44', '#7048E8', '#F59F00', '#0CA678'];
