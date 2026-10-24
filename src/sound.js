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

import { Music } from './music.js?v=v29.4.9';
import { STOCK_PLACES } from './maps-stock.js?v=v29.4.9';

// v16 아이템 소리·곡은 오픈소스 녹음 — 목록·출처는 카탈로그 한 곳 (src/tracks/index.js). assets/audio/ 에서 처음 고를 때 받는다
//  STEP_SAMPLES: 0.5초 칸마다 한 걸음 · NATURE_LOOPS: 끝과 처음을 겹쳐 이음매 없이 도는 고리 · SONG_TRACKS: 곡 고리
import { STEP_SAMPLES, NATURE_LOOPS, SONG_TRACKS, FX_SAMPLES, NATURAL_STEPS, KIWI_VOICES, TRACK } from './tracks/index.js?v=v29.4.9';
export { STEP_SAMPLES, NATURE_LOOPS, SONG_TRACKS, NATURAL_STEPS };
const AUDIO = 'assets/audio/';
// 곡·자연 배경 고리는 풀어 두면 한 곡에 수십 MB(48kHz 기준 최대 약 96MiB)라, 고리 자리마다 지금 것 + 바로 전 것만 들고 있는다 (2026-10-19)
//  · 재생 중·줄어드는 중·받는 중인 고리는 지우지 않는다 · 짧은 효과음·발자국 녹음은 계속 둔다
//  · 못 받은 파일은 기록하지 않고 RETRY_MS 뒤 다시 받는다 (그 사이엔 걸음마다 다시 요청하지 않는다) · 인터넷이 돌아오면 바로 다시
const LOOP_FILES = new Set([...Object.values(SONG_TRACKS), ...Object.values(NATURE_LOOPS)]);
const LOOP_KEEP = 2, RETRY_MS = 15000, FADE_MS = 3000;
// v28.14 항해 소리 — 같은 쓰임으로 Claude(stock/sound)·Codex(stock/audio/2026-10-21-hq)가 따로 만든 녹음을 무작위로 (사용자 2026-10-24 "둘 다 랜덤하게")
//  a = Claude 쪽 · b = Codex 쪽. 효과음 −22 · 배 물소리 −26 LUFS 근처로 맞춤. 환경 소리라 amb 묶음으로 낸다(집중 중 '사건 소리만 끔'에도 들린다)
export const VOY_FX = {
  whale: ['voy-whale-a.mp3', 'voy-whale-b.mp3'],   // 고래 숨 뿜기
  sail: ['voy-sail-a.mp3', 'voy-sail-b.mp3'],      // 출항 — 돛이 바람을 받음 / 돛과 밧줄
  reel: ['voy-reel-a.mp3', 'voy-reel-b.mp3'],      // 낚싯줄에 걸린 것 — 릴 감기 / 찰박
};
export const VOY_BED = ['voy-boat-a.mp3', 'voy-boat-b.mp3'];   // 항해 중 배 물소리 고리 (나무배 삐걱 + 찰랑 / 잔물결)

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const MIX_KEY = 'kiwi-footprints.mix';
const DEFAULT_MIX = { on: true, music: 0.55, amb: 0.8, sfx: 0.85, steps: true, stepPack: 'music', nature: 'none', song: 'auto', voice: 'inst', natStep: 'place', findPack: 'base' };
// v18.7 키위 소리 두 갈래 (사용자 2026-10-17): voice 'inst' = 악기 소리(발자국 음악·바닥별 악기·나무 콕, 지금까지 그대로)
//  · 'natural' = 자연스러운 소리(녹음 — 걷기·종종걸음·콕). natStep 'place' 면 장소를 따라 바뀐다
//  v18.8 (사용자 2026-10-18 "기본도 남기고, 다른 소리는 아이템 모으듯이"): 기본은 그대로, 녹음·악기·반짝 녹음은 소라로 모은다
//   stepPack 에 악기 소리 id(KIWI_VOICES — 칼림바·마림바·뽁…)도 온다 · findPack 'base'(합성 종) / 'sparkle'(녹음)
//   ownNat = 모은 자연 녹음(main.js 가 넣는다) — 「장소 따라」인데 그 장소 녹음을 아직 못 모았으면 기본 소리
export const PLACE_SOUND = {
  beach: { step: 'sand', peck: 'peck-sand' }, nz: { step: 'mud', peck: 'peck-mud' }, snow: { step: 'snowwalk', peck: 'peck-crunch' },
  fall: { step: 'dryleaves', peck: 'peck-crunch' }, zen: { step: 'zengravel', peck: 'peck-sand' },
  cherry: { step: 'sand', peck: 'peck-sand' }, oasis: { step: 'sand', peck: 'peck-sand' },
};
// v28.22 재고 새 장소 (maps-stock.js step: sand · mud · zengravel)
for (const p of STOCK_PLACES) PLACE_SOUND[p.id] = { step: p.step, peck: p.step === 'mud' ? 'peck-mud' : 'peck-sand' };
const PECK_OF = { sand: 'peck-sand', zengravel: 'peck-sand', gravel: 'peck-sand', mud: 'peck-mud', snowwalk: 'peck-crunch', snow: 'peck-crunch', dryleaves: 'peck-crunch', leaves: 'peck-crunch' };
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
    this.place = 'beach';
    this.ownNat = null;     // 모은 자연 녹음 id 묶음 (null = 전부)   // 지금 장소 (main.js 가 바꾼다) — 「장소 따라」 자연 소리용
    this.music = new Music(this);
    this.music.setSong(this.mix.song === 'auto' || SONG_TRACKS[this.mix.song] ? null : this.mix.song);   // v15 고른 곡
    this.music.silent = !!SONG_TRACKS[this.mix.song];   // v16 녹음 곡이면 생성 음악은 쉰다
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend(); else if (this.mix.on) this.ctx.resume();
      });
    }
    if (typeof globalThis.addEventListener === 'function') globalThis.addEventListener('online', () => this.retryLoops());   // 오프라인에서 못 받은 곡·소리 (2026-10-19)
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
    this.master = ctx.createGain(); this.master.gain.value = this.hush === 'all' ? 0 : 0.9; this.master.connect(comp);
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

    // v18.7 한 번 치는 녹음(콕·반짝·줍기, 다 합쳐 150KB)은 미리 받아 둔다 — 첫 콕부터 녹음으로
    for (const f of Object.values(FX_SAMPLES)) this.loadBuf(f);

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
  // v20.1 집중 중 소리: null 그대로 · 'events' 사건 소리(발자국 음·콕·울음·합창·종 — sfx 묶음)만 끔 · 'all' 전부 끔
  //  잔향 보내기가 묶음을 거치지 않아서 묶음 크기를 0 으로 두는 대신 여기서 아예 잇지 않는다
  setHush(m) {
    this.hush = m || null;
    if (this.master) this.master.gain.setTargetAtTime(this.hush === 'all' ? 0 : 0.9, this.ctx.currentTime, 0.4);
  }
  route(node, bus = 'sfx', pan = 0, rev = 0.25) {
    if (this.hush && bus === 'sfx') return;
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
    // 크기 없는 창(높이 0)에선 파도 높이가 0/0 = NaN 이 되어 setTargetAtTime 이 던진다 (2026-10-19) — 숫자가 아니면 0
    const fin = v => (Number.isFinite(v) ? v : 0);
    high = fin(high); rain = fin(rain); wind = fin(wind);
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
    if (!this.loopsOn) { this.loopsOn = true; if (NATURE_LOOPS[this.mix.nature]) this.setNature(this.mix.nature); if (SONG_TRACKS[this.mix.song]) this.setSong(this.mix.song); }
    if (this.mix.nature !== 'none') this.natureTick(night);
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
    if (this.onVoyage) return false;
    if (!this.ready()) return false;
    if (this.natural) {   // v18.7 자연스러운 소리: 글씨 획 위 발자국도 녹음 한 걸음 (음 없음, ♪ 안 띄움)
      if (this.gap('step', 0.11)) this.stepTex(this.natPack(), x, 1.25);
      return false;
    }
    const pk = this.mix.stepPack || 'music';
    if (pk === 'sand') {     // 모래: 음 없이 조용한 톡
      if (this.gap('tex', 0.09)) this.noise(0.04, 900 + Math.random() * 700, 1.2, 0.06, 0, 'bandpass', this.panOf(x));
      return false;
    }
    if (!this.gap('step', 0.11)) return false;
    const { top, bottom } = this.stage;
    const k = 1 - Math.max(0, Math.min(1, (y - top) / Math.max(1, bottom - top)));
    const n = this.scaleNote(Math.round(k * 7) + 3), pan = this.panOf(x);
    if (pk === 'music') { this.pluck(n, 0.085, 0, 1.1, pan, 'sfx', 0.35); return true; }
    if (KIWI_VOICES[pk]) { if (!this.voice(pk, n, x)) this.pluck(n, 0.085, 0, 1.1, pan, 'sfx', 0.35); return true; }   // v18.8 모은 악기 소리 (못 받았으면 칼림바)
    // v16.1 발자국 소리도 음악처럼: 같은 규칙(화음 안, 위쪽 획일수록 높은 음)으로 바닥에 어울리는 악기가 울리고, 녹음 질감은 밑에 작게
    this.stepVoice(pk, n, pan);
    if (pk !== 'splash' && this.gap('tex', 0.09)) this.stepTex(pk, x, 0.55);
    return true;
  }
  pat() {}
  // 바닥마다 다른 악기 (음 n 은 지금 화음 안의 음)
  //  눈 = 얼음 종(맑은 사인 + 어긋난 배음, 길게) · 낙엽 = 나무 마림바(둥글고 짧게 + 나무 톡) · 자갈 = 돌 실로폰(단단하고 아주 짧게) · 물웅덩이 = 물방울(위에서 그 음으로 떨어진다)
  stepVoice(pk, n, pan) {
    const ctx = this.ctx, t = ctx.currentTime;
    const tone = (midi, parts, vel, rev, glide = 0) => {
      const f = 440 * Math.pow(2, (midi - 69) / 12), g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(...parts.map(p => p[2])) + 0.05);
      this.route(g, 'sfx', pan, rev);
      for (const [mul, amp, dec, type = 'sine'] of parts) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type;
        if (glide) { o.frequency.setValueAtTime(f * mul * glide, t); o.frequency.exponentialRampToValueAtTime(f * mul, t + 0.045); } else o.frequency.value = f * mul;
        og.gain.setValueAtTime(amp, t); og.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        o.connect(og); og.connect(g); o.start(t); o.stop(t + dec + 0.05);
      }
    };
    if (pk === 'snow') tone(n + 12, [[1, 1, 1.3], [2.76, 0.32, 0.5], [5.4, 0.12, 0.18]], 0.085, 0.45);
    else if (pk === 'leaves') { tone(n, [[1, 1, 0.42], [4, 0.28, 0.07], [9.8, 0.06, 0.025]], 0.15, 0.25); this.noise(0.02, 2200, 1.5, 0.02, 0, 'bandpass', pan); }
    else if (pk === 'gravel') tone(n + 12, [[1, 1, 0.22, 'triangle'], [2.9, 0.35, 0.09], [6.2, 0.1, 0.04]], 0.12, 0.18);
    else if (pk === 'splash') tone(n + 12, [[1, 1, 0.28], [2, 0.15, 0.1]], 0.12, 0.35, 1.6);
  }

  // ── v14 발자국 소리 (질감) ── 전부 잡음·발진기 합성, 녹음 없음
  //  v15.1: 발자국 음악(칼림바)·파도에 묻혀 "바꿔도 안 바뀐다"(사용자) → 2.5배 키우고, 글씨가 아닌 걸음에도 작게 낸다(walkStep)
  // 녹음 파일 읽기 (한 번만, 다 읽으면 this.got[file] 에 바로 쓸 수 있게)
  loadBuf(file) {
    this.bufs ||= {}; this.got ||= {}; this.failAt ||= {};
    if (!this.bufs[file] && this.ctx) {
      if (Date.now() - (this.failAt[file] ?? -Infinity) < RETRY_MS) return Promise.resolve(null);   // 방금 못 받았다: 잠깐 쉬었다 다시
      // audioBase: 게임 밖 페이지(작업장 듣기 페이지)는 다른 경로에서 연다 · 못 읽으면 조용히 null (2026-10-18)
      //  늦게 온 응답은 그사이 지워졌거나 바뀐 자리를 되살리지 않는다 (this.bufs[file] === p 일 때만 기록)
      const p = this.bufs[file] = fetch((this.audioBase || AUDIO) + file).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(a => this.ctx.decodeAudioData(a))
        .then(b => { if (this.bufs[file] === p) { this.got[file] = b; delete this.failAt[file]; } return b; })
        .catch(() => { if (this.bufs[file] === p) { delete this.bufs[file]; this.failAt[file] = Date.now(); } return null; });
    }
    return this.bufs[file] || Promise.resolve(null);
  }
  // 고리 자리(track·bed)마다 최근 LOOP_KEEP 개만 기억한다 — A→B→A 는 다시 받지 않고 바로 이어진다
  useLoop(slot, file) {
    if (!file) return;
    this.recent ||= {};
    const list = (this.recent[slot] ||= []).filter(f => f !== file);
    list.push(file);
    this.recent[slot] = list.slice(-LOOP_KEEP);
  }
  // 최근 것·재생 중·줄어드는 중이 아닌 곡·배경 고리를 놓아준다 (다음에 고르면 다시 받아 푼다)
  trimLoops() {
    if (!this.bufs) return;
    const keep = new Set(this.fading ? this.fading.keys() : []);
    for (const list of Object.values(this.recent || {})) for (const f of list) keep.add(f);
    for (const s of ['track', 'bed']) if (this[s]) keep.add(this[s].file);
    for (const f of Object.keys(this.bufs)) if (LOOP_FILES.has(f) && !keep.has(f)) { delete this.bufs[f]; delete this.got[f]; }
  }
  // 인터넷이 돌아오면: 못 받았던 소리를 바로 다시 받을 수 있게 하고, 듣고 싶던 고리를 다시 건다
  retryLoops() {
    this.failAt = {};
    for (const slot of ['track', 'bed']) {
      const f = this.want?.[slot], args = this.loopArgs?.[slot];
      if (f && args && !(this[slot] && this[slot].file === f)) this.playLoop(slot, f, ...args);
    }
  }
  // 발자국 소리: 녹음에서 자른 한 걸음(0.5초 칸 중 하나)을 높낮이를 조금씩 바꿔 낸다
  stepTex(pk, x, k = 1) {
    const p = this.panOf(x), R = Math.random, file = STEP_SAMPLES[pk];
    if (file) {
      const b = this.got && this.got[file];
      if (!b) { this.loadBuf(file); return; }
      const ctx = this.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b; src.playbackRate.value = 0.9 + R() * 0.2;
      g.gain.value = 0.14 * k;
      src.connect(g); this.route(g, 'sfx', p, 0.12);
      src.start(t, Math.floor(R() * Math.floor(b.duration / 0.5)) * 0.5, 0.45);
      return;
    }
    if (pk === 'splash') {        // 찰박: 물 한 방울 떨어지는 소리(내려가는 음) + 물 튀는 잡음 — CC0 녹음을 찾을 때까지 합성
      const v = 2.5 * k, ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(760 + R() * 200, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.07);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g); this.route(g, 'sfx', p, 0.2); o.start(t); o.stop(t + 0.1);
      this.noise(0.12, 1300, 0.7, 0.025 * v, 0.01, 'bandpass', p);
    }
  }
  // 글씨가 아닌 걸음(서성이기·오가기): 고른 발자국 소리를 작게 (모래는 조용히)
  get natural() { return this.mix.voice === 'natural' && !!this.natPack(); }
  // 자연스러운 소리에서 지금 쓰는 발자국 녹음 (장소 따라 / 직접 고른 것)
  natPack() {
    const n = this.mix.natStep, own = id => !this.ownNat || this.ownNat.has(id);
    if (n && n !== 'place' && STEP_SAMPLES[n]) return own(n) ? n : null;
    const p = (PLACE_SOUND[this.place] || PLACE_SOUND.beach).step;
    return own(p) ? p : null;   // 그 장소 녹음을 아직 못 모았으면 기본 소리
  }
  // v18.8 악기 소리 한 번: 음이 있는 악기는 화음의 음 n 으로 높낮이를 옮기고, 없는 것은 조금씩만 바꾼다
  voice(id, n, x, vel = 1) {
    const v = KIWI_VOICES[id];
    if (!v) return false;
    // 같은 음이름은 두고 옥타브만 접어 샘플 음 ±8반음 안에서 울린다 (너무 늘리면 찍찍·웅웅 소리가 된다)
    let d = n + 12 * (v.oct || 0) - v.midi;
    while (d > 8) d -= 12;
    while (d < -8) d += 12;
    const rate = v.pitched ? Math.pow(2, d / 12) : 0.9 + Math.random() * 0.25;
    return this.fx(id, x, 0.5 * vel, rate);
  }
  // 한 번 치는 녹음 (콕·반짝·줍기). 아직 못 받았으면 받기 시작하고 false — 부르는 쪽이 합성 소리로 대신한다
  fx(id, x, vel = 0.5, rate = 1, fade = 0) {
    const file = FX_SAMPLES[id], b = file && this.got && this.got[file];
    if (!b) { if (file) this.loadBuf(file); return false; }
    const ctx = this.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; src.playbackRate.value = rate;
    g.gain.setValueAtTime(vel, t);
    if (fade) { g.gain.setValueAtTime(vel, t + fade); g.gain.exponentialRampToValueAtTime(0.0001, t + fade + 1.2); }
    src.connect(g); this.route(g, 'sfx', x == null ? 0 : this.panOf(x), 0.15);
    src.start(t); if (fade) src.stop(t + fade + 1.3);
    return true;
  }
  // v28.14 항해 소리 한 번: 받아 둔 판 중 무작위 (아직 하나도 못 받았으면 받기 시작하고 false)
  voyFx(kind, vel = 0.6, rnd = Math.random) {
    const list = VOY_FX[kind];
    if (!list || !this.ctx) return false;
    for (const f of list) this.loadBuf(f);
    const ready = list.filter(f => this.got?.[f]);
    if (!ready.length) return false;
    const ctx = this.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = this.got[ready[Math.floor(rnd() * ready.length)]];
    g.gain.value = vel;
    src.connect(g); this.route(g, 'amb', 0, 0.2); src.start(t);
    return true;
  }
  voyLoad() { if (this.ctx) for (const f of Object.values(VOY_FX).flat()) this.loadBuf(f); }
  // 배 물소리 고리: 항해마다 두 판 중 하나, 내리면 끔
  voyBed(on, rnd = Math.random) { this.playLoop('boat', on ? VOY_BED[Math.floor(rnd() * VOY_BED.length)] : null, 'amb', 0.55); }
  walkStep(x, flee = false) {
    if (this.onVoyage) return;
    if (this.natural) {   // v18.7 걷기는 고른 바닥, 도망칠 때는 동물 종종걸음
      if (!this.ready() || !this.gap('walk', flee ? 0.1 : 0.15)) return;
      this.stepTex(flee ? 'scurry' : this.natPack(), x, flee ? 0.9 : 0.75);
      return;
    }
    const pk = this.mix.stepPack;
    if (KIWI_VOICES[pk]) { if (KIWI_VOICES[pk].walk && this.ready() && this.gap('walk', 0.16)) this.voice(pk, this.scaleNote(5), x, 0.4); return; }   // 뽁·톡은 어슬렁 걸음에도 작게, 음 있는 악기는 글씨에서만
    if (!this.ready() || !pk || pk === 'sand' || pk === 'music' || !this.gap('walk', 0.16)) return;
    this.stepTex(pk, x, 0.45);
  }
  // v15 곡 고르기 ('auto' = 시간 따라)
  setSong(id) {
    this.mix.song = id; this.saveMix();
    const file = SONG_TRACKS[id];
    this.music.silent = !!file;               // 녹음 곡이 흐르는 동안 생성 음악은 쉰다 (화음 진행은 계속 — 발자국 음악용)
    this.music.setSong(file || id === 'auto' ? null : id);
    this.playLoop('track', file, 'music', TRACK[`song:${id}`]?.level ?? 0.36);   // 생성 음악과 비슷한 크기로 (곡마다 카탈로그 level)
  }
  // 고리 하나(배경 소리 bed · 곡 track): 바꾸면 이전 것은 천천히 줄이고 새 것은 천천히 키운다
  playLoop(slot, file, bus, level) {
    this.want ||= {}; this.want[slot] = file || null;
    if (file) { (this.loopArgs ||= {})[slot] = [bus, level]; this.useLoop(slot, file); }
    if (!this.ctx) return;
    const t = this.ctx.currentTime, old = this[slot];
    if (old && old.file !== file) {
      old.g.gain.setTargetAtTime(0, t, 0.5);
      const fading = (this.fading ||= new Map());
      fading.set(old.file, (fading.get(old.file) || 0) + 1);   // 줄어드는 동안은 그 버퍼를 놓지 않는다
      setTimeout(() => {
        try { old.src.stop(); } catch (e) { /* 이미 멈춤 */ }
        const n = fading.get(old.file) - 1;
        if (n > 0) fading.set(old.file, n); else fading.delete(old.file);
        this.trimLoops();
      }, FADE_MS);
      this[slot] = null;
    }
    this.trimLoops();
    if (!file || (this[slot] && this[slot].file === file)) return;
    this.loadBuf(file).then(b => {
      if (!b || this.want[slot] !== file || (this[slot] && this[slot].file === file)) return;
      const ctx = this.ctx, src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b; src.loop = true; g.gain.value = 0;
      src.connect(g); this.route(g, bus, 0, 0.05); src.start();
      g.gain.setTargetAtTime(level, ctx.currentTime, 0.6);
      this[slot] = { src, g, file };
    });
  }
  // 들어 보기: 발자국 네 번
  previewStep(pk) {
    if (!this.ready()) return;
    if (KIWI_VOICES[pk]) this.loadBuf(KIWI_VOICES[pk].file);
    if (this.mix.voice === 'natural' && this.natPack()) {   // 자연스러운 소리: 걸음 다섯 번 + 콕 한 번
      const st = pk === 'place' || !STEP_SAMPLES[pk] ? this.natPack() : pk;
      this.loadBuf(STEP_SAMPLES[st]).then(() => {
        for (let i = 0; i < 5; i++) setTimeout(() => this.stepTex(st, this.stage.W / 2, 1.1), i * 160);
        setTimeout(() => this.peck(), 5 * 160 + 250);
      });
      return;
    }
    // 들어 보기: 화음을 따라 올라가는 네 걸음 (고른 악기로)
    for (let i = 0; i < 4; i++) setTimeout(() => {
      const n = this.scaleNote(4 + i * 2);
      if (pk === 'music') this.pluck(n, 0.085, 0, 1.1, 0, 'sfx', 0.35);
      else if (KIWI_VOICES[pk]) { this.voice(pk, n, this.stage.W / 2); if (i === 3) setTimeout(() => this.peck(), 300); }
      else if (pk === 'sand') this.noise(0.04, 900 + Math.random() * 700, 1.2, 0.06, 0, 'bandpass', 0);
      else { this.stepVoice(pk, n, 0); if (pk !== 'splash') this.stepTex(pk, this.stage.W / 2, 0.55); }
    }, i * 260);
  }

  // ── 자연 배경 ── 한 번에 하나. v16: 새·모닥불·개구리는 녹음 고리(playLoop), 풍경은 매 프레임 가끔 합성으로 낸다
  setNature(pk) {
    this.mix.nature = pk; this.saveMix();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const k of ['bird', 'crk', 'pop', 'frog', 'chime']) this.last[k] = 0;   // 고르자마자 첫 소리가 나게
    this.playLoop('bed', NATURE_LOOPS[pk], 'amb', TRACK[`nature:${pk}`]?.level ?? 0.6);   // 크기는 카탈로그 level (숲 녹음은 조용해서 0.9)
  }
  natureTick(night) {
    const pk = this.mix.nature, R = Math.random, ctx = this.ctx, t = ctx.currentTime;
    if (pk === 'chime') {  // 풍경: 처마 끝 쇠 막대 종이 바람에 몇 개씩 부딪힌다 (지금 곡의 화음 음으로, 바람 불면 잦게)
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
    if (this.onVoyage) return;   // 출항 전에 예약된 콕 타이머도 차단
    if (!this.ready() || !this.gap('peck', 0.05)) return;
    if (this.natural) {   // v18.7 바닥을 콕 — 고른 바닥(장소 따라면 장소)의 녹음
      if (this.fx(PECK_OF[this.natPack()], x, 0.42, 0.9 + Math.random() * 0.25)) return;
    } else if (KIWI_VOICES[this.mix.stepPack] && this.voice(this.mix.stepPack, this.scaleNote(8) + 12, x, 0.8)) return;   // v18.8 악기 소리는 콕도 그 악기로
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
  // v18.7 발견: 고른 녹음 반짝(번갈아 둘) 위에 화음 종을 작게 — 녹음을 못 받았으면 예전 합성 그대로
  found(x) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime, p = this.panOf(x);
    this.foundN = (this.foundN || 0) + 1;
    const rec = this.mix.findPack === 'sparkle' && this.fx(this.foundN % 2 ? 'sparkle' : 'glow', x, 0.32, 1, 1.6);   // v18.8 반짝 녹음은 모아서 고른 경우만
    if (!rec) this.noise(0.25, 2400, 1.2, 0.06, 0, 'bandpass', p);
    [0, 2, 4, 7, 9].forEach((d, i) => this.bell(this.scaleNote(4 + d) + 12, rec ? 0.035 : 0.07, t + 0.05 + i * 0.07, p));
  }
  // v18.7 물가에서 줍기: 처음 줍는 희귀품 = 드러남 · 처음 = 유리병 플링 · 또 주움 = 동전 톡 (못 받았으면 found/peck 로)
  pick(x, fresh, rare) {
    if (!this.ready()) return;
    if (this.mix.findPack !== 'sparkle') { if (fresh) this.found(x); else this.peck(x); return; }   // 기본: 예전 그대로
    if (fresh && rare && this.fx('reveal', x, 0.4, 1, 1.8)) { const t = this.ctx.currentTime; [0, 2, 4, 7].forEach((d, i) => this.bell(this.scaleNote(5 + d) + 12, 0.03, t + 0.3 + i * 0.09, this.panOf(x))); return; }
    if (this.fx(fresh ? 'pickup' : 'coin', x, fresh ? 0.45 : 0.32, 0.95 + Math.random() * 0.1)) { if (fresh && !rare) { const t = this.ctx.currentTime; this.bell(this.scaleNote(9) + 12, 0.035, t + 0.08, this.panOf(x)); } return; }
    if (fresh) this.found(x); else this.peck(x);
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
