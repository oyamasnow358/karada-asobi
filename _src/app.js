  /* ============================================================
     小さな道具
     ============================================================ */
  const $ = s => document.querySelector(s);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) Object.keys(props).forEach(k => {
      const v = props[k]; if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k === 'style') el.style.cssText = v; else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) { list.forEach(c => { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) add(c); else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); }); })(Array.prototype.slice.call(arguments, 2));
    return el;
  }
  const PRAISE = ['すごい！', 'やったね！', 'かっこいい！', 'いいね！', 'えらい！', 'じょうず！', 'ばっちり！', 'ナイス！', 'さすが！', 'できたね！', 'すてき！', 'てんさい！', 'さいこう！', 'がんばったね！', 'おみごと！', 'きまった！'];

  /* ============================================================
     せってい
     ============================================================ */
  const ST_KEY = 'mieel-karada-st';
  const DEF = { seated: false, time: 60, diff: 1, look: 'chara', sound: true, bgm: true, voice: true, chara: 'kuma', lr: false, calm: false, vsOn: false, vsMode: 'battle', vsDiff: [1, 1], vsChara: ['kuma', 'usagi'], circuit: ['fusen', 'tori', 'maneko', 'daruma'], ctime: 60 };
  const st = Object.assign({}, DEF);
  try { Object.assign(st, JSON.parse(localStorage.getItem(ST_KEY) || '{}')); } catch (e) { /* 無視 */ }
  const saveSt = () => { try { localStorage.setItem(ST_KEY, JSON.stringify(st)); } catch (e) { /* 無視 */ } };
  FX.sound = () => st.sound;

  /* ============================================================
     音（効果音・BGM）と こえ
     ============================================================ */
  let ac = null;
  function A() { try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch (e) { return null; } }
  function tone(f, t0, dur, type, vol, f2) {
    const a = A(); if (!a) return;
    const t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    if (!st.sound) return;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((vol || 0.2) * (st.calm ? 0.45 : 1), t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t0, dur, vol, hp) {
    const a = A(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    if (!st.sound) return;
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp || 800; g.gain.value = (vol || 0.3) * (st.calm ? 0.45 : 1);
    s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + t0);
  }
  const SFX = {
    pop() { noise(0, 0.12, 0.35, 1200); tone(900, 0, 0.12, 'triangle', 0.15, 300); },
    coin() { tone(988, 0, 0.09, 'square', 0.08); tone(1319, 0.08, 0.22, 'square', 0.08); },
    jump() { tone(300, 0, 0.25, 'triangle', 0.18, 700); },
    bonk() { tone(160, 0, 0.25, 'square', 0.12, 80); },
    flap() { noise(0, 0.08, 0.12, 2500); },
    good() { tone(659, 0, 0.12, 'triangle', 0.18); tone(880, 0.1, 0.12, 'triangle', 0.18); tone(1175, 0.2, 0.3, 'triangle', 0.18); },
    beep() { tone(660, 0, 0.15, 'sine', 0.2); },
    go() { tone(1047, 0, 0.45, 'sine', 0.25); },
    whistle() { tone(1800, 0, 0.35, 'sine', 0.12, 2100); },
    turn() { tone(520, 0, 0.12, 'square', 0.1); tone(390, 0.12, 0.25, 'square', 0.1); }
  };
  const sfx = name => { if (st.sound && SFX[name]) SFX[name](); };
  // BGM（ペンタトニックの かんたんな ループ）
  const BGM = {
    on: false, timer: null, step: 0, next: 0,
    tunes: {
      happy: { bpm: 132, mel: [0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 9, 12, 9, 7, 4, -1], bass: [0, -5, -3, -5] },
      calm: { bpm: 100, mel: [4, -1, 7, -1, 9, 7, 4, -1, 2, -1, 4, 2, 0, -1, -1, -1], bass: [0, -3, -5, -3] },
      bounce: { bpm: 150, mel: [0, 0, 7, -1, 4, 4, 9, -1, 7, 4, 2, 4, 0, -1, 7, -1], bass: [0, 0, -5, -5] }
    },
    start(name) {
      if (!st.bgm || this.on) return; const a = A(); if (!a) return;
      this.on = true; this.cur = this.tunes[name || 'happy']; this.step = 0; this.next = a.currentTime + 0.1;
      const tick = () => {
        if (!this.on) return;
        const T = this.cur, spb = 60 / T.bpm / 2;
        while (this.next < a.currentTime + 0.25) {
          const m = T.mel[this.step % T.mel.length];
          const at = this.next - a.currentTime;
          if (m >= 0) tone(523.25 * Math.pow(2, m / 12), at, spb * 0.9, 'triangle', 0.045);
          if (this.step % 4 === 0) tone(130.8 * Math.pow(2, T.bass[(this.step / 4) % T.bass.length] / 12), at, spb * 3, 'sine', 0.06);
          this.step++; this.next += spb;
        }
        this.timer = setTimeout(tick, 60);
      };
      tick();
    },
    stop() { this.on = false; clearTimeout(this.timer); }
  };
  const canSpeak = 'speechSynthesis' in window;
  let jaVoice = null;
  function loadVoice() { if (!canSpeak) return; const v = speechSynthesis.getVoices().filter(x => /^ja/i.test(x.lang)); jaVoice = v.find(x => /Kyoko|O-ren|Otoya|Hattori/i.test(x.name)) || v[0] || null; }
  function say(t, rate) { if (!canSpeak || !st.voice || !t) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(jaSay(t)); u.lang = 'ja-JP'; u.rate = rate || 1.0; u.pitch = 1.15; if (jaVoice) u.voice = jaVoice; speechSynthesis.speak(u); } catch (e) { /* 無視 */ } }

  /* ============================================================
     カメラ と からだの 読みとり（MediaPipe Pose）
     ============================================================ */
  const video = $('#video');
  const timeout = (pr, ms, name) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error(name)), ms))]);
  const V = { ready: false, loading: null, pose: null, stream: null, step: '', lastVT: -1, lastT: 0, np: 1, nextAt: 0, cost: 0, n: 0, errN: 0, stillSince: 0 };
  function loadVision() {
    if (V.ready) return Promise.resolve();
    if (V.loading) return V.loading;
    V.loading = (async () => {
      V.step = 'ぶひん（1/2）';
      const mp = await import(new URL('vendor/vision_bundle.js', location.href).href);
      const fs = await mp.FilesetResolver.forVisionTasks(new URL('vendor/wasm', location.href).href);
      const mk = async delegate => {
        V.step = 'からだの モデル（2/2）' + (delegate === 'CPU' ? '・CPU' : '');
        V.pose = await mp.PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: new URL('vendor/models/pose_landmarker_lite.task', location.href).href, delegate }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
      };
      if (V.forceCPU) { await mk('CPU'); V.delegate = 'CPU'; V.ready = true; V.np = 1; return; }
      try { await timeout(mk('GPU'), 25000, 'gpu-timeout'); V.delegate = 'GPU'; } catch (e) { console.warn(e); V.gpuErr = String(e && e.message || e); await mk('CPU'); V.delegate = 'CPU'; }
      V.ready = true; V.np = 1;
    })();
    V.loading.catch(() => { V.loading = null; });
    return V.loading;
  }
  async function startCam() {
    if (V.stream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocam');
    V.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } });
    video.srcObject = V.stream;
    await timeout(video.play(), 5000, 'play').catch(() => {});
  }
  // よみとる 人数（ふたりで あそぶ ときは 2）
  async function setPoses(n) { if (!V.pose || V.np === n) return; try { await V.pose.setOptions({ numPoses: n }); V.np = n; } catch (e) { console.warn(e); } }
  // からだを よむ。iPad が かたまらないように、よみとりに つかうのは 時間の 半分まで。
  // カメラが 止まったら ひらきなおし、よみとりが こわれたら つくりなおす。あたらしい データが ない ときは undefined
  function readPoses() {
    if (!V.ready || video.readyState < 2 || !video.videoWidth) return undefined;
    const now = performance.now();
    if (video.currentTime === V.lastVT) { if (V.stream && V.stillSince && now - V.stillSince > 3000) restartCam(); return undefined; }
    V.stillSince = now;
    if (now < V.nextAt) return undefined;
    V.lastVT = video.currentTime;
    let t = now; if (t <= V.lastT) t = V.lastT + 1; V.lastT = t;
    try {
      const res = V.pose.detectForVideo(video, t), c = performance.now() - now;
      V.n++; V.errN = 0; if (V.n > 5) V.cost = V.cost ? V.cost * 0.8 + c * 0.2 : c;
      V.nextAt = now + Math.max(28, V.cost * 2);
      return res.landmarks || [];
    } catch (e) { console.warn(e); V.nextAt = now + 200; if (++V.errN >= 10) rebuildVision(); return undefined; }
  }
  function rebuildVision() {
    if (V.rebuilding) return; V.rebuilding = true; V.rebuilds = (V.rebuilds || 0) + 1;
    if (V.delegate === 'GPU' && V.rebuilds >= 2) V.forceCPU = true;
    const want = V.np;
    try { V.pose && V.pose.close(); } catch (e) { /* 無視 */ }
    V.ready = false; V.loading = null; V.pose = null; V.errN = 0; V.n = 0; V.cost = 0;
    loadVision().then(() => setPoses(want)).catch(e => console.warn(e)).finally(() => { V.rebuilding = false; });
  }
  async function restartCam() {
    if (V.restarting) return; V.restarting = true;
    try { if (V.stream) V.stream.getTracks().forEach(t => t.stop()); V.stream = null; await timeout(startCam(), 10000, 'camtimeout'); video.play().catch(() => {}); } catch (e) { console.warn('camera restart', e); }
    V.stillSince = performance.now(); V.restarting = false;
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && V.stream) { V.stillSince = performance.now(); video.play().catch(() => {}); } });
  function stopCam() { V.stillSince = 0; if (V.stream) { V.stream.getTracks().forEach(t => t.stop()); V.stream = null; } video.srcObject = null; video.className = ''; document.body.appendChild(video); releaseWake(); }
  let wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* 無視 */ } }
  function releaseWake() { try { if (wake) wake.release(); } catch (e) { /* 無視 */ } wake = null; }

  // カメラの 点 → 画面の 点（かがみ・画面いっぱい）。なめらかに する
  const LM = { nose: 0, leye: 2, reye: 5, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, li: 19, ri: 20, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 };
  let prevPts = null; const prevs = [null, null];
  function readBody(lms, W, H, slot) {
    slot = slot || 0;
    if (!lms) { prevs[slot] = null; if (!slot) prevPts = null; return null; }
    const pp = prevs[slot];
    const VW = video.videoWidth || 16, VH = video.videoHeight || 9;
    const sc = Math.max(W / VW, H / VH), ox = (W - VW * sc) / 2, oy = (H - VH * sc) / 2;
    const pts = lms.map((l, i) => {
      const p = { x: W - (ox + l.x * VW * sc), y: oy + l.y * VH * sc, v: l.visibility == null ? 1 : l.visibility };
      const q = pp && pp[i];
      if (q && q.v > 0.3 && p.v > 0.3) { const k = 0.55; p.x = q.x + (p.x - q.x) * k; p.y = q.y + (p.y - q.y) * k; }
      return p;
    });
    prevs[slot] = pts; if (!slot) prevPts = pts;
    return mkBody(pts, W, H);
  }
  function mkBody(pts, W, H) {
    const B = { pts, W, H };
    Object.keys(LM).forEach(k => { B[k] = pts[LM[k]]; });
    const vis = p => p && p.v > 0.5;
    B.vis = vis;
    B.ok = vis(B.ls) && vis(B.rs);
    B.sw = Math.max(20, dist(B.ls, B.rs));
    B.hasHands = vis(B.lw) && vis(B.rw);
    B.hasHips = vis(B.lh) && vis(B.rh);
    B.hasLegs = vis(B.la) && vis(B.ra) && B.la.y < H * 1.02 && B.ra.y < H * 1.02;
    B.sx = (B.ls.x + B.rs.x) / 2; B.sy = (B.ls.y + B.rs.y) / 2;   // かたの まんなか
    return B;
  }

  /* ============================================================
     キャラクター（子どもの うごきに あわせて うごく）
     ============================================================ */
  const CHARAS = [
    { id: 'kuma', name: 'くま', body: '#B5835A', dark: '#8A5A36', face: '#C99A6B', muzzle: '#F1D9B8', ear: 'round' },
    { id: 'usagi', name: 'うさぎ', body: '#F8F0F5', dark: '#E3C8D8', face: '#FFFFFF', muzzle: '#FFE3EC', ear: 'long' },
    { id: 'neko', name: 'ねこ', body: '#FFA94D', dark: '#E8590C', face: '#FFB86B', muzzle: '#FFF0DB', ear: 'tri' },
    { id: 'robo', name: 'ロボ', body: '#74C0FC', dark: '#1C7ED6', face: '#D0EBFF', muzzle: null, ear: 'ant' },
    { id: 'kaeru', name: 'かえる', body: '#69DB7C', dark: '#2F9E44', face: '#8CE99A', muzzle: '#EBFBEE', ear: 'frog' }
  ];
  const charaOf = id => CHARAS.find(c => c.id === id) || CHARAS[0];
  function drawAvatar(g, B, ch, alpha) {
    if (!B || !B.ok) return;
    const vis = B.vis, sw = B.sw, lw = sw * 0.3;
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.lineCap = 'round'; g.lineJoin = 'round';
    // こし（見えない ときは かたから 下に）
    const lh = vis(B.lh) ? B.lh : { x: B.ls.x - sw * 0.05, y: B.ls.y + sw * 1.5 }, rh = vis(B.rh) ? B.rh : { x: B.rs.x + sw * 0.05, y: B.rs.y + sw * 1.5 };
    const limb = (a, b, c, col) => { if (!vis(a) || !vis(b)) return; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); if (vis(c)) g.lineTo(c.x, c.y); g.stroke(); };
    // あし
    limb(lh, B.lk, B.la, ch.dark); limb(rh, B.rk, B.ra, ch.dark);
    [B.la, B.ra].forEach(p => { if (vis(p) && vis(B.lk)) { g.fillStyle = ch.dark; g.beginPath(); g.ellipse(p.x, p.y + lw * 0.2, lw * 0.75, lw * 0.5, 0, 0, 7); g.fill(); } });
    // どう
    g.fillStyle = ch.body; g.strokeStyle = ch.dark; g.lineWidth = sw * 0.05;
    g.beginPath(); g.moveTo(B.ls.x, B.ls.y - lw * 0.2); g.lineTo(B.rs.x, B.rs.y - lw * 0.2); g.lineTo(rh.x + lw * 0.2, rh.y); g.lineTo(lh.x - lw * 0.2, lh.y); g.closePath(); g.fill(); g.stroke();
    if (ch.muzzle) { g.fillStyle = ch.muzzle; g.beginPath(); g.ellipse((B.sx + (lh.x + rh.x) / 2) / 2, (B.sy + (lh.y + rh.y) / 2) / 2 + sw * 0.1, sw * 0.33, sw * 0.45, 0, 0, 7); g.fill(); }
    // うで
    limb(B.ls, B.le, B.lw, ch.body); limb(B.rs, B.re, B.rw, ch.body);
    [B.lw, B.rw].forEach(p => { if (vis(p)) { g.fillStyle = ch.face; g.strokeStyle = ch.dark; g.lineWidth = sw * 0.04; g.beginPath(); g.arc(p.x, p.y, lw * 0.72, 0, 7); g.fill(); g.stroke(); } });
    // あたま
    const r = sw * 0.6;
    let hx = B.sx, hy = B.sy - sw * 0.75, ang = 0;
    if (vis(B.nose)) { hx = B.nose.x; hy = B.nose.y - sw * 0.08; }
    if (vis(B.leye) && vis(B.reye)) ang = Math.atan2(B.reye.y - B.leye.y, B.reye.x - B.leye.x);
    if (Math.abs(ang) > Math.PI / 2) ang = ang - Math.sign(ang) * Math.PI;
    g.translate(hx, hy); g.rotate(ang);
    g.fillStyle = ch.face; g.strokeStyle = ch.dark; g.lineWidth = sw * 0.05;
    if (ch.ear === 'round') [-1, 1].forEach(s => { g.beginPath(); g.arc(s * r * 0.72, -r * 0.72, r * 0.32, 0, 7); g.fill(); g.stroke(); g.fillStyle = ch.muzzle; g.beginPath(); g.arc(s * r * 0.72, -r * 0.72, r * 0.16, 0, 7); g.fill(); g.fillStyle = ch.face; });
    if (ch.ear === 'long') [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * r * 0.38, -r * 1.25, r * 0.22, r * 0.62, s * 0.15, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#FFC9DE'; g.beginPath(); g.ellipse(s * r * 0.38, -r * 1.22, r * 0.1, r * 0.45, s * 0.15, 0, 7); g.fill(); g.fillStyle = ch.face; });
    if (ch.ear === 'tri') [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * r * 0.25, -r * 0.85); g.lineTo(s * r * 0.85, -r * 1.25); g.lineTo(s * r * 0.92, -r * 0.4); g.closePath(); g.fill(); g.stroke(); });
    if (ch.ear === 'ant') { g.strokeStyle = ch.dark; g.beginPath(); g.moveTo(0, -r); g.lineTo(0, -r * 1.45); g.stroke(); g.fillStyle = '#FF6B6B'; g.beginPath(); g.arc(0, -r * 1.5, r * 0.14, 0, 7); g.fill(); g.fillStyle = ch.face; }
    if (ch.ear === 'frog') [-1, 1].forEach(s => { g.beginPath(); g.arc(s * r * 0.48, -r * 0.78, r * 0.32, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * r * 0.48, -r * 0.8, r * 0.2, 0, 7); g.fill(); g.fillStyle = '#212529'; g.beginPath(); g.arc(s * r * 0.48, -r * 0.8, r * 0.1, 0, 7); g.fill(); g.fillStyle = ch.face; });
    g.beginPath();
    if (ch.ear === 'ant') { const k = r * 0.25; g.moveTo(-r + k, -r); g.arcTo(r, -r, r, r, k); g.arcTo(r, r, -r, r, k); g.arcTo(-r, r, -r, -r, k); g.arcTo(-r, -r, r, -r, k); g.closePath(); }
    else g.arc(0, 0, r, 0, 7);
    g.fill(); g.stroke();
    if (ch.muzzle && ch.ear !== 'frog') { g.fillStyle = ch.muzzle; g.beginPath(); g.ellipse(0, r * 0.32, r * 0.42, r * 0.32, 0, 0, 7); g.fill(); }
    // かお
    g.fillStyle = '#212529';
    if (ch.ear !== 'frog') [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * r * 0.33, -r * 0.08, r * 0.09, r * 0.13, 0, 0, 7); g.fill(); });
    g.fillStyle = '#fff'; if (ch.ear !== 'frog') [-1, 1].forEach(s => { g.beginPath(); g.arc(s * r * 0.31, -r * 0.13, r * 0.035, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(255,135,170,.55)'; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * r * 0.58, r * 0.22, r * 0.14, r * 0.09, 0, 0, 7); g.fill(); });
    if (ch.ear === 'kuma' || ch.ear === 'round' || ch.ear === 'tri') { g.fillStyle = '#343A40'; g.beginPath(); g.ellipse(0, r * 0.18, r * 0.09, r * 0.06, 0, 0, 7); g.fill(); }
    g.strokeStyle = '#343A40'; g.lineWidth = sw * 0.035; g.beginPath(); g.arc(0, r * 0.26, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.restore();
  }
  // ホームの えらぶ ボタン用（ポーズを つくって かく）
  function demoBody(W, H, wave) {
    const sw = W * 0.26, cx = W / 2, sy = H * 0.52;
    const P = (x, y) => ({ x: cx + x * sw, y: sy + y * sw, v: 1 });
    const pts = []; for (let i = 0; i < 33; i++) pts.push({ x: cx, y: sy, v: 0 });
    const set = (i, p) => { pts[i] = p; };
    set(0, P(0, -0.85)); set(2, P(-0.2, -0.95)); set(5, P(0.2, -0.95));
    set(11, P(-0.5, 0)); set(12, P(0.5, 0)); set(13, P(-0.85, 0.35)); set(14, P(0.85, -0.3 - wave * 0.2)); set(15, P(-0.95, 0.8)); set(16, P(1.0, -0.8 - wave * 0.3));
    set(23, P(-0.35, 1.4)); set(24, P(0.35, 1.4));
    const B = { pts, W, H }; Object.keys(LM).forEach(k => { B[k] = pts[LM[k]]; });
    B.vis = p => p && p.v > 0.5; B.ok = true; B.sw = sw; B.sx = cx; B.sy = sy;
    return B;
  }

  /* ============================================================
     きろく
     ============================================================ */
  const LOG_KEY = 'mieel-karada-log';
  const logAll = () => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; } };
  function logPush(r) { try { const a = logAll(); a.push(r); while (a.length > 2000) a.shift(); localStorage.setItem(LOG_KEY, JSON.stringify(a)); } catch (e) { /* 無視 */ } }
  const bestOf = id => logAll().filter(x => x.g === id && x.seated === st.seated && !x.vs).reduce((m, x) => Math.max(m, x.score), 0);
