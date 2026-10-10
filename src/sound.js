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

import { Music } from './music.js?v=v13.0.0';

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const MIX_KEY = 'kiwi-footprints.mix';
const DEFAULT_MIX = { on: true, music: 0.55, amb: 0.8, sfx: 0.85, steps: true };

export class Sound {
  constructor({ enabled = true } = {}) {
    let mix = null;
    try { mix = JSON.parse(localStorage.getItem(MIX_KEY) || 'null'); } catch (e) { /* 저장소 없음 */ }
    this.mix = { ...DEFAULT_MIX, ...(mix || {}) };
    if (!enabled) this.mix.on = false;
    this.ctx = null;
    this.idx = 3;
    this.last = {};
    this.stage = { W: 1, top: 0, bottom: 1 };
    this.music = new Music(this);
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
    for (const s of this.sea) { s.g.gain.setTargetAtTime(0.14 + high * 0.24, t, 0.25); s.f.frequency.setTargetAtTime(330 + high * 900, t, 0.25); }
    this.rainG.gain.setTargetAtTime(rain * 0.16, t, 0.5);
    this.windG.gain.setTargetAtTime(wind * 0.55, t, 0.5);
    // 밤 귀뚜라미: 여기저기서 짧은 찌르르 세 번
    if (night > 0.5 && rain < 0.3 && this.gap('cricket', 0.5 + Math.random() * 1.2)) {
      const f = 4100 + Math.random() * 500, pan = Math.random() * 2 - 1;
      for (let i = 0; i < 3; i++) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), w = t + i * 0.07;
        o.frequency.value = f;
        g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(0.014 * night, w + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, w + 0.05);
        o.connect(g); this.route(g, 'amb', pan, 0.3); o.start(w); o.stop(w + 0.06);
      }
    }
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
    if (!this.mix.steps) { if (this.gap('pat', 0.08)) this.noise(0.04, 900 + Math.random() * 700, 1.2, 0.04, 0, 'bandpass', this.panOf(x)); return false; }
    if (!this.gap('step', 0.11)) return false;
    const { top, bottom } = this.stage;
    const k = 1 - Math.max(0, Math.min(1, (y - top) / Math.max(1, bottom - top)));
    const n = this.scaleNote(Math.round(k * 7) + 3);
    this.pluck(n, 0.085, 0, 1.1, this.panOf(x), 'sfx', 0.35);
    return true;
  }
  pat() {}

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
