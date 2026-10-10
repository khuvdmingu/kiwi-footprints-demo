// sound.js — v5 소리 엔진. 전부 Web Audio 로 합성한다 (샘플 파일 0개)
//
//  구조: 소리 하나 → (좌우 위치) → 버스(음악·환경음·효과음) → 마스터 → 압축기 → 스피커
//                                  └→ 잔향(직접 만든 2.6초 충격 응답) ┘
//  · 환경음: 좌우로 따로 출렁이는 파도 두 줄기, 비, 바람(좌우로 흔들림), 밤 귀뚜라미
//  · 음악: music.js — 시간대·날씨에 따라 바뀌는 느린 생성 음악
//  · 발자국 음악: 키위가 글씨 획에 찍는 발자국마다 지금 화음 안의 음 하나. 화면 위쪽일수록 높고, 키위가 있는 쪽에서 들린다
//  · 효과음: 타자(칼림바), 부리 톡(나무), 키위 울음(휘파람, 키위마다 높이·위치가 다르다), 다 쓰면 키위 합창, 파도, 구름 '푹'
//  믹서 값(소리 켜기·음악·환경음·효과음·발자국 음악)은 기기에 기억한다.
//  브라우저는 사용자 동작 안에서만 소리를 열 수 있어서 unlock() 을 그때 부른다. 탭을 숨기면 멈춘다.

import { Music } from './music.js?v=v15.2.0';

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const MIX_KEY = 'kiwi-footprints.mix';
const DEFAULT_MIX = { on: true, music: 0.55, amb: 0.8, sfx: 0.85, steps: true, stepPack: 'music', nature: 'none', song: 'auto' };
// v15.2 고르면 "대신" 나온다 (사용자: 덧대면 거슬린다) — 발자국: 'music'(발자국 음악, 기본) 대신 고른 소리 하나 · 곡: 시간 따라 음악 대신 그 곡 · 자연 배경: 기본(밤 귀뚜라미) 대신, 파도는 절반   // v14 발자국 소리 · 자연 배경 (물에서 떠내려온 소라로 얻는다)

export class Sound {
  constructor({ enabled = true } = {}) {
    let mix = null;
    try { mix = JSON.parse(localStorage.getItem(MIX_KEY) || 'null'); } catch (e) { /* 저장소 없음 */ }
    this.mix = { ...DEFAULT_MIX, ...(mix || {}) };
    // 예전 저장값 이어받기: 발자국 음악 켬/끔(steps) + 모래 → 'music' / 'sand'
    if (mix && !mix.v152) { if (!mix.stepPack || mix.stepPack === 'sand') this.mix.stepPack = mix.steps === false ? 'sand' : 'music'; }
    this.mix.v152 = true;
    if (!enabled) this.mix.on = false;
    this.ctx = null;
    this.idx = 3;
    this.last = {};
    this.stage = { W: 1, top: 0, bottom: 1 };
    this.music = new Music(this);
    this.music.setSong(this.mix.song === 'auto' ? null : this.mix.song);   // v15 고른 곡
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend(); else if (this.mix.on) this.ctx.resume();
      });
    }
  }

  get on() { return this.mix.on; }
  get root() { return this.music.key; }

  saveMix() { try { localStorage.setItem(MIX_KEY, JSON.stringify(this.mix)); } catch (e) { /* 무시 */ } }
  setOn(v) {
    this.mix.on = v; this.saveMix();
    if (!this.ctx) { if (v) this.unlock(); return; }
    if (v) this.ctx.resume(); else this.ctx.suspend();
  }
  setMix(part) {
    Object.assign(this.mix, part); this.saveMix();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const b of ['music', 'amb', 'sfx']) this.bus[b].gain.setTargetAtTime(this.mix[b], t, 0.1);
  }

  unlock() {
    if (!this.mix.on) return;
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = (this.ctx = new C());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    comp.connect(ctx.destination);
    this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(comp);
    this.bus = {};
    for (const b of ['music', 'amb', 'sfx']) { const g = ctx.createGain(); g.gain.value = this.mix[b]; g.connect(this.master); this.bus[b] = g; }
    // 잔향: 양쪽 채널에 따로 감쇠하는 잡음으로 충격 응답을 만든다
    this.verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb.buffer = ir;
    const vg = ctx.createGain(); vg.gain.value = 0.5;
    this.verb.connect(vg); vg.connect(this.master);

    // 잡음 버퍼
    const n3 = ctx.sampleRate * 3;
    this.brown = ctx.createBuffer(1, n3, ctx.sampleRate);
    const d = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n3; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    this.white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const w = this.white.getChannelData(0);
    for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;

    // 파도: 왼쪽·오른쪽 두 줄기가 서로 다른 박자로 밀려왔다 빠진다
    this.sea = [];
    for (const [pan, rate, off] of [[-0.75, 0.11, 0], [0.75, 0.085, 1.3]]) {
      const src = this.loop(this.brown, off);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      const g = ctx.createGain(); g.gain.value = 0;
      const swell = ctx.createGain(); swell.gain.value = 0.6;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = rate; lg.gain.value = 0.4;
      lfo.connect(lg); lg.connect(swell.gain); lfo.start(ctx.currentTime + off);
      src.connect(f); f.connect(g); g.connect(swell);
      this.route(swell, 'amb', pan, 0.15);
      this.sea.push({ f, g });
    }
    // 비
    const rain = this.loop(this.white);
    const rh = ctx.createBiquadFilter(); rh.type = 'highpass'; rh.frequency.value = 1400;
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 6500;
    this.rainG = ctx.createGain(); this.rainG.gain.value = 0;
    rain.connect(rh); rh.connect(rl); rl.connect(this.rainG);
    this.route(this.rainG, 'amb', 0, 0.2);
    // 바람: 대역 통과 중심이 오르내리고, 좌우로 천천히 흔들린다
    const wind = this.loop(this.brown, 0.7);
    this.windF = ctx.createBiquadFilter(); this.windF.type = 'bandpass'; this.windF.frequency.value = 500; this.windF.Q.value = 0.9;
    const wl = ctx.createOscillator(), wlg = ctx.createGain(); wl.frequency.value = 0.13; wlg.gain.value = 260;
    wl.connect(wlg); wlg.connect(this.windF.frequency); wl.start();
    this.windG = ctx.createGain(); this.windG.gain.value = 0;
    wind.connect(this.windF); this.windF.connect(this.windG);
    const wp = ctx.createStereoPanner(), pl = ctx.createOscillator(), plg = ctx.createGain();
    pl.frequency.value = 0.07; plg.gain.value = 0.7; pl.connect(plg); plg.connect(wp.pan); pl.start();
    this.windG.connect(wp); wp.connect(this.bus.amb);
  }

  loop(buffer, offset = 0) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer; s.loop = true; s.start(0, offset);
    return s;
  }

  // 소리 하나를 좌우 위치 → 버스(+ 잔향)로 보낸다
  route(node, bus = 'sfx', pan = 0, rev = 0.25) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p); p.connect(this.bus[bus]);
    if (rev > 0) { const s = this.ctx.createGain(); s.gain.value = rev; p.connect(s); s.connect(this.verb); }
  }

  gap(name, sec) {
    const t = this.ctx.currentTime;
    if (this.last[name] && t - this.last[name] < sec) return false;
    this.last[name] = t;
    return true;
  }
  ready() { return this.mix.on && this.ctx && this.ctx.state === 'running'; }

  // ── 매 프레임 ──
  // 화면 정보: 발자국 음높이(글 상자 위→아래)와 좌우 위치에 쓴다
  setStage(W, top, bottom) { this.stage = { W, top, bottom }; }
  update({ high = 0, rain = 0, wind = 0, night = 0, hour = 12, weather = 'clear' } = {}) {
    this.music.setMood(hour, weather);
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const duck = this.mix.nature !== 'none' ? 0.5 : 1;   // 자연 배경을 고르면 파도는 절반 (고른 소리가 앞으로)
    for (const s of this.sea) { s.g.gain.setTargetAtTime((0.14 + high * 0.24) * duck, t, 0.25); s.f.frequency.setTargetAtTime(330 + high * 900, t, 0.25); }
    this.rainG.gain.setTargetAtTime(rain * 0.16, t, 0.5);
    this.windG.gain.setTargetAtTime(wind * 0.55, t, 0.5);
    // 밤 귀뚜라미: 여기저기서 짧은 찌르르 세 번
    if (this.mix.nature === 'none' && night > 0.5 && rain < 0.3 && this.gap('cricket', 0.5 + Math.random() * 1.2)) {
      const f = 4100 + Math.random() * 500, pan = Math.random() * 2 - 1;
      for (let i = 0; i < 3; i++) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), w = t + i * 0.07;
        o.frequency.value = f;
        g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(0.014 * night, w + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, w + 0.05);
        o.connect(g); this.route(g, 'amb', pan, 0.3); o.start(w); o.stop(w + 0.06);
      }
    }
    if (this.mix.nature !== 'none') { if (this.mix.nature === 'fire' && !this.bed) this.setNature('fire'); this.natureTick(night); }
    this.music.tick();
  }
  // (예전 이름 호환)
  sea(high) { this.lastHigh = high; }
  ambience() {}

  // ── 음색 ──
  // 칼림바: 맑은 퉁김
  pluck(midi, vel = 0.22, when = 0, decay = 1.4, pan = 0, bus = 'sfx', rev = 0.22) {
    if (!this.ready()) return;
    const ctx = this.ctx, t = ctx.currentTime + when, f = hz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    g.connect(lp); this.route(lp, bus, pan, rev);
    for (const [mul, amp, type] of [[1, 1, 'sine'], [2.003, 0.22, 'triangle'], [4.2, 0.05, 'sine']]) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.value = f * mul; og.gain.value = amp;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + decay + 0.05);
    }
  }
  // 오르골·종: 높은 배음이 먼저 사라지는 맑은 소리 (when = 절대 시각)
  bell(midi, vel, at, pan = 0, bus = 'sfx') {
    if (!this.ctx) return;
    const ctx = this.ctx, f = hz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
    this.route(g, bus, pan, 0.5);
    for (const [mul, amp, dec] of [[1, 1, 2.2], [3.0, 0.25, 0.6], [5.4, 0.08, 0.25]]) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = f * mul;
      og.gain.setValueAtTime(amp, at); og.gain.exponentialRampToValueAtTime(0.0001, at + dec);
      o.connect(og); og.connect(g);
      o.start(at); o.stop(at + dec + 0.05);
    }
  }
  // 나무 톡: 짧은 사인 + 잡음
  wood(midi, vel = 0.1, pan = 0) {
    if (!this.ready()) return;
    const ctx = this.ctx, t = ctx.currentTime, f = hz(midi);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); this.route(g, 'sfx', pan, 0.18); o.start(t); o.stop(t + 0.14);
    this.noise(0.025, 2600, 2, vel * 0.5, 0, 'bandpass', pan);
  }
  noise(dur, freq, q, vel, when = 0, type = 'bandpass', pan = 0, bus = 'sfx') {
    const ctx = this.ctx, t = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = this.white;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); this.route(g, bus, pan, 0.08);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  panOf(x) { return ((x / this.stage.W) * 2 - 1) * 0.8; }

  // ── 타자 ──
  scaleNote(i) {   // 지금 화음의 음들을 위로 쌓은 사다리에서 i 번째
    const ch = this.music.chord().map(n => ((n - this.root) % 12 + 12) % 12).sort((a, b) => a - b);
    const oct = Math.floor(i / ch.length), k = ((i % ch.length) + ch.length) % ch.length;
    return this.root + ch[k] + 12 * oct;
  }
  newRoot() { this.idx = 3; }
  key() {
    this.idx = Math.max(0, Math.min(9, this.idx + [-2, -1, 1, 1, 2][Math.floor(Math.random() * 5)]));
    this.pluck(this.scaleNote(this.idx) + 12, 0.16);
  }
  space() { this.pluck(this.root - 12, 0.22, 0, 1.8); }
  del() { this.pluck(this.root + 36, 0.07, 0, 0.35); }
  commit() { [0, 1, 2, 3].forEach((s, i) => this.pluck(this.scaleNote(4 + s) + 12, 0.14, i * 0.08, 1.6)); this.newRoot(); }
  focus() { if (this.ready() && this.gap('focus', 0.6)) this.pluck(this.root + 28, 0.05, 0, 0.6); }

  // ── 발자국 음악 ──
  // 글씨 획 위 발자국 하나 → 화음 안의 음. 위쪽일수록 높다. 너무 촘촘하면 건너뛴다. 소리가 났으면 true
  step(x, y) {
    if (!this.ready()) return false;
    const pk = this.mix.stepPack || 'music';
    if (pk !== 'music') {   // 고른 발자국 소리가 발자국 음악을 대신한다 (겹치지 않게)
      if (this.gap('tex', 0.09)) { if (pk === 'sand') this.noise(0.04, 900 + Math.random() * 700, 1.2, 0.06, 0, 'bandpass', this.panOf(x)); else this.stepTex(pk, x); }
      return false;
    }
    if (!this.gap('step', 0.11)) return false;
    const { top, bottom } = this.stage;
    const k = 1 - Math.max(0, Math.min(1, (y - top) / Math.max(1, bottom - top)));
    const n = this.scaleNote(Math.round(k * 7) + 3);
    this.pluck(n, 0.085, 0, 1.1, this.panOf(x), 'sfx', 0.35);
    return true;
  }
  pat() {}

  // ── v14 발자국 소리 (질감) ── 전부 잡음·발진기 합성, 녹음 없음
  //  v15.1: 발자국 음악(칼림바)·파도에 묻혀 "바꿔도 안 바뀐다"(사용자) → 2.5배 키우고, 글씨가 아닌 걸음에도 작게 낸다(walkStep)
  stepTex(pk, x, k = 1) {
    const p = this.panOf(x), R = Math.random, v = 2.5 * k;
    if (pk === 'snow') {          // 뽀드득: 눌리는 눈 결정이 잘게 여러 번 바스러진다
      for (let i = 0; i < 4; i++) this.noise(0.022, 1700 + R() * 2300, 1.6, 0.12 * v * (1 - i * 0.15), i * 0.017 + R() * 0.006, 'bandpass', p);
      this.noise(0.07, 420, 0.8, 0.06 * v, 0, 'lowpass', p);
    } else if (pk === 'leaves') { // 바스락: 마른 잎이 높은 소리로 여러 번 부서진다
      for (let i = 0; i < 6; i++) this.noise(0.025 + R() * 0.03, 3000 + R() * 4000, 1.4, 0.022 * v, R() * 0.13, 'highpass', p);
    } else if (pk === 'gravel') { // 자박: 작은 돌끼리 딸깍 + 낮은 눌림
      for (let i = 0; i < 4; i++) this.noise(0.014, 2400 + R() * 3600, 3.5, 0.16 * v, R() * 0.05, 'bandpass', p);
      this.noise(0.05, 260, 1, 0.07 * v, 0, 'lowpass', p);
    } else if (pk === 'splash') { // 찰박: 물 한 방울 떨어지는 소리(내려가는 음) + 물 튀는 잡음
      const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(760 + R() * 200, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.07);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g); this.route(g, 'sfx', p, 0.2); o.start(t); o.stop(t + 0.1);
      this.noise(0.12, 1300, 0.7, 0.025 * v, 0.01, 'bandpass', p);
    }
  }
  // 글씨가 아닌 걸음(서성이기·오가기): 고른 발자국 소리를 작게 (모래는 조용히)
  walkStep(x) {
    const pk = this.mix.stepPack;
    if (!this.ready() || !pk || pk === 'sand' || pk === 'music' || !this.gap('walk', 0.16)) return;
    this.stepTex(pk, x, 0.45);
  }
  // v15 곡 고르기 ('auto' = 시간 따라)
  setSong(id) { this.mix.song = id; this.saveMix(); this.music.setSong(id === 'auto' ? null : id); }
  // 들어 보기: 발자국 네 번
  previewStep(pk) {
    if (!this.ready()) return;
    for (let i = 0; i < 4; i++) setTimeout(() => (pk === 'music' ? this.pluck(this.scaleNote(4 + i * 2), 0.085, 0, 1.1, 0, 'sfx', 0.35) : pk === 'sand' ? this.noise(0.04, 900 + Math.random() * 700, 1.2, 0.06, 0, 'bandpass', 0) : this.stepTex(pk, this.stage.W * (0.4 + i * 0.07))), i * 260);
  }

  // ── v14 자연 배경 ── 한 번에 하나. 바탕 소리(모닥불)는 노드를 만들고, 나머지는 매 프레임 가끔 소리를 낸다
  setNature(pk) {
    this.mix.nature = pk; this.saveMix();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const k of ['bird', 'crk', 'pop', 'frog', 'chime']) this.last[k] = 0;   // 고르자마자 첫 소리가 나게
    if (this.bed) { const b = this.bed; b.g.gain.setTargetAtTime(0, t, 0.4); setTimeout(() => { try { b.src.stop(); } catch (e) { /* 이미 멈춤 */ } }, 2500); this.bed = null; }
    if (pk === 'fire') {          // 모닥불 바탕: 낮게 웅웅거리는 불길
      const src = this.loop(this.brown, Math.random() * 2), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'lowpass'; f.frequency.value = 320; g.gain.value = 0;
      src.connect(f); f.connect(g); this.route(g, 'amb', 0.1, 0.1);
      g.gain.setTargetAtTime(0.32, t, 0.3);
      this.bed = { src, g };
    }
  }
  natureTick(night) {
    const pk = this.mix.nature, R = Math.random, ctx = this.ctx, t = ctx.currentTime;
    if (pk === 'birds') {         // 숲 새: 두 음 휘파람 · 떨림 · 내려가는 울음 (밤에는 거의 잔다)
      if (!this.gap('bird', 0.6 + R() * 2)) return;
      const vel = 0.1 * (1 - night * 0.8), pan = R() * 1.6 - 0.8, kind = Math.floor(R() * 3);
      const tone = (f0, f1, at, dur, v = vel) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g); this.route(g, 'amb', pan, 0.35); o.start(at); o.stop(at + dur + 0.02);
      };
      const b = 2600 + R() * 1400;
      if (kind === 0) { tone(b, b * 1.12, t, 0.13); tone(b * 1.25, b * 1.05, t + 0.17, 0.16); }
      else if (kind === 1) { const n = 6 + Math.floor(R() * 5); for (let i = 0; i < n; i++) tone(b * 1.3, b * 1.22, t + i * 0.055, 0.04, vel * 0.8); }
      else tone(b * 1.5, b * 0.95, t, 0.28);
    } else if (pk === 'fire') {   // 타닥: 짧고 높은 딱 소리가 불규칙하게, 가끔 큰 톡
      if (this.gap('crk', R() * 0.28)) this.noise(0.006 + R() * 0.012, 2500 + R() * 3500, 1, 0.07 + R() * 0.1, 0, 'highpass', R() * 0.4 - 0.2, 'amb');
      if (this.gap('pop', 2.5 + R() * 6)) this.noise(0.035, 700 + R() * 300, 2, 0.16, 0, 'bandpass', R() * 0.4 - 0.2, 'amb');
    } else if (pk === 'frogs') {  // 개굴: 낮은 톱니 소리를 짧게 끊어 여러 번 (밤에 더 많이)
      if (!this.gap('frog', (0.5 + R() * 1.6) / (0.6 + night * 0.8))) return;
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), pan = R() * 1.8 - 0.9;
      o.type = 'sawtooth'; o.frequency.value = 130 + R() * 140; lp.type = 'lowpass'; lp.frequency.value = 900;
      const n = 3 + Math.floor(R() * 4), v = 0.07 + R() * 0.04;
      g.gain.setValueAtTime(0, t);
      for (let i = 0; i < n; i++) { const w = t + i * 0.034; g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(v, w + 0.008); g.gain.linearRampToValueAtTime(0, w + 0.026); }
      o.connect(lp); lp.connect(g); this.route(g, 'amb', pan, 0.25); o.start(t); o.stop(t + n * 0.034 + 0.05);
    } else if (pk === 'chime') {  // 풍경: 처마 끝 쇠 막대 종이 바람에 몇 개씩 부딪힌다 (지금 곡의 화음 음으로, 바람 불면 잦게)
      if (!this.gap('chime', 0.7 + R() * 2.6)) return;
      const ch = this.music.chord(), n = 1 + Math.floor(R() * 3), pan = R() * 1.2 - 0.6;
      for (let i = 0; i < n; i++) {
        const at = t + i * (0.08 + R() * 0.25), f = 440 * Math.pow(2, (ch[Math.floor(R() * ch.length)] + 24 + (R() < 0.3 ? 12 : 0) - 69) / 12), g = ctx.createGain();
        g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.045, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + 4);
        this.route(g, 'amb', pan + (R() - 0.5) * 0.3, 0.55);
        for (const [mul, amp, dec] of [[1, 1, 4], [2.76, 0.35, 1.6], [5.4, 0.15, 0.7], [8.93, 0.06, 0.3]]) {   // 쇠막대의 어긋난 배음
          const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f * mul;
          og.gain.setValueAtTime(amp, at); og.gain.exponentialRampToValueAtTime(0.0001, at + dec);
          o.connect(og); og.connect(g); o.start(at); o.stop(at + dec + 0.05);
        }
      }
    }
  }

  peck(x = this.stage.W / 2) {
    if (!this.ready() || !this.gap('peck', 0.05)) return;
    this.wood(this.scaleNote(8) + 12, 0.09, this.panOf(x));
  }

  // "키-위": 올라가는 가는 휘파람. x 로 좌우, 키위마다 조금 다른 높이
  call(when = 0, x = this.stage.W / 2, base = 1350 + Math.random() * 250) {
    if (!this.ready() || !this.gap('call', 2.2)) return;
    this.whistle(when, x, base, 2 + (Math.random() < 0.5));
  }
  whistle(when, x, base, n, vel = 0.04) {
    const ctx = this.ctx;
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + when + i * 0.46;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.9, t + 0.36);
      lfo.frequency.value = 22; lg.gain.value = 18;
      lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.05);
      g.gain.setValueAtTime(vel, t + 0.26);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g); this.route(g, 'sfx', this.panOf(x), 0.3);
      o.start(t); o.stop(t + 0.42); lfo.start(t); lfo.stop(t + 0.42);
    }
  }

  // 다 썼을 때: 키위마다 자기 자리에서 화음 한 음씩 짹 — 합창 + 오르골 아르페지오
  chorus(xs = []) {
    if (!this.ready()) return;
    const t0 = this.ctx.currentTime;
    xs.slice(0, 8).forEach((x, i) => {
      const n = this.scaleNote(5 + (i % 5)) + 12;
      this.whistle(0.15 + i * 0.09, x, hz(n), 1, 0.03);
    });
    [0, 1, 2, 3, 4, 5].forEach(i => this.bell(this.scaleNote(4 + i) + 12, 0.08, t0 + i * 0.09, (i - 2.5) * 0.25));
  }
  jingle() { this.chorus(); }

  // 갈매기 (v7): 멀리서 짧게 내려가는 "꺄-" 두세 번
  gull(x = this.stage.W / 2) {
    if (!this.ready() || !this.gap('gull', 4)) return;
    const ctx = this.ctx, n = 2 + (Math.random() < 0.5);
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + i * (0.28 + Math.random() * 0.08), f0 = 1500 + Math.random() * 300;
      const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.22);
      bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      o.connect(bp); bp.connect(g); this.route(g, 'amb', this.panOf(x), 0.45);
      o.start(t); o.stop(t + 0.28);
    }
  }

  // v10 떠내려온 것: 물가에 닿으면 맑은 종 두 번, 열면 반짝이는 아르페지오
  arrive(x) {
    if (!this.ready() || !this.gap('arrive', 2)) return;
    const t = this.ctx.currentTime, p = this.panOf(x);
    this.bell(this.scaleNote(7) + 12, 0.06, t, p);
    this.bell(this.scaleNote(9) + 12, 0.05, t + 0.18, p);
  }
  found(x) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime, p = this.panOf(x);
    this.noise(0.25, 2400, 1.2, 0.06, 0, 'bandpass', p);
    [0, 2, 4, 7, 9].forEach((d, i) => this.bell(this.scaleNote(4 + d) + 12, 0.07, t + 0.05 + i * 0.07, p));
  }

  alert() {
    if (!this.ready() || !this.gap('alert', 0.5)) return;
    this.pluck(this.root + 24, 0.11, 0, 0.25);
    this.pluck(this.root + 31, 0.13, 0.09, 0.4);
  }
  poof(x) {
    if (!this.ready()) return;
    this.noise(0.35, 700, 0.6, 0.18, 0, 'lowpass', x != null ? this.panOf(x) : 0);
    this.pluck(this.scaleNote(7) + 12, 0.06, 0.02, 0.7, x != null ? this.panOf(x) : 0, 'sfx', 0.5);
  }
  wave() {
    if (!this.ready()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [pan, delay] of [[-0.6, 0], [0.6, 0.18]]) {
      const s = ctx.createBufferSource(); s.buffer = this.brown;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(250, t + delay);
      f.frequency.exponentialRampToValueAtTime(1800, t + delay + 1.3);
      f.frequency.exponentialRampToValueAtTime(380, t + delay + 3.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(0.38, t + delay + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 3.8);
      s.connect(f); f.connect(g); this.route(g, 'amb', pan, 0.2);
      s.start(t + delay, Math.random()); s.stop(t + delay + 3.9);
    }
  }
}
