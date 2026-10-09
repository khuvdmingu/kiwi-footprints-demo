// music.js — 느린 생성 배경 음악 (동숲처럼 잔잔하게)
//  4마디 코드 진행을 되풀이한다. 마디 첫 박에 패드(부드러운 화음) · 1·3박에 낮은 베이스 · 8분음표 자리마다 확률로 오르골 한 음.
//  분위기(아침·낮·노을·밤)는 시각으로, 날씨는 음색·밀도로 바꾼다. 분위기가 바뀌면 다음 마디부터 넘어간다(박이 끊기지 않게).
//  발자국 음악은 지금 화음(chord())에 맞춰 음을 고르므로 배경 음악과 늘 어울린다.

const MOODS = {
  //        근음  bpm  오르골 밀도  패드 밝기(Hz)  진행 (근음에서의 반음 간격)
  morning: { key: 62, bpm: 74, density: 0.5, bright: 3000, prog: [[0, 4, 7, 14], [7, 11, 14, 19], [9, 12, 16, 21], [5, 9, 12, 16]] },   // I · V · vi · IV
  day: { key: 60, bpm: 72, density: 0.45, bright: 2600, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [4, 7, 11, 14], [9, 12, 16, 19]] },       // Imaj7 · IVmaj7 · iii7 · vi7
  sunset: { key: 65, bpm: 66, density: 0.38, bright: 2000, prog: [[0, 4, 7, 11], [2, 5, 9, 12], [5, 9, 12, 16], [7, 11, 14, 17]] },  // Imaj7 · ii7 · IVmaj7 · V7
  night: { key: 57, bpm: 58, density: 0.26, bright: 1300, prog: [[0, 4, 7, 14], [5, 9, 12, 19], [9, 12, 16, 23], [7, 11, 14, 21]] },  // add9 · 느리고 어둡게
};
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

export function moodOf(hour) {
  const h = ((hour % 24) + 24) % 24;
  return h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'sunset' : 'night';
}

export class Music {
  constructor(sound) {
    this.s = sound;
    this.mood = 'day'; this.want = 'day';
    this.weather = 'clear';
    this.bar = 0; this.beat = 0; this.next = 0;
  }
  get m() { return MOODS[this.mood]; }
  get key() { return this.m.key; }
  // 지금 울리는 화음 (MIDI 음 배열)
  chord() { return this.m.prog[this.bar % 4].map(i => this.key + i); }

  setMood(hour, weather) { this.want = moodOf(hour); this.weather = weather; }

  // 매 프레임: 0.25초 앞까지 박을 예약한다
  tick() {
    const ctx = this.s.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.25) {
      this.play(this.next);
      const spb = 60 / this.m.bpm / 2;   // 8분음표 길이
      this.next += spb;
      this.beat = (this.beat + 1) % 8;
      if (this.beat === 0) {
        this.bar++;
        if (this.bar % 4 === 0 && this.want !== this.mood) this.mood = this.want;   // 진행이 한 바퀴 돈 뒤에 분위기 전환
      }
    }
  }

  play(t) {
    const m = this.m, chord = this.chord(), w = this.weather;
    const bright = m.bright * (w === 'rain' ? 0.55 : w === 'fog' ? 0.7 : w === 'snow' ? 1.25 : 1);
    const spb = 60 / m.bpm / 2;
    if (this.beat === 0) this.pad(chord, t, spb * 8, bright);
    if (this.beat === 0 || this.beat === 4) this.bass(this.key + m.prog[this.bar % 4][0] - 24, t, spb * 3.5);
    let density = m.density * (w === 'rain' ? 0.6 : w === 'wind' ? 0.5 : w === 'snow' ? 1.2 : 1);
    if (this.beat % 2 === 1) density *= 0.55;   // 뒷박은 드물게
    if (Math.random() < density) {
      const n = chord[Math.floor(Math.random() * chord.length)] + 12 + (Math.random() < 0.35 ? 12 : 0) + (w === 'snow' ? 12 : 0);
      this.s.bell(n, 0.06 + Math.random() * 0.03, t, (Math.random() - 0.5) * 1.1, 'music');
    }
  }

  pad(notes, t, dur, bright) {
    const ctx = this.s.ctx;
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = bright; f.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
    g.gain.setValueAtTime(0.05, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    f.connect(g);
    this.s.route(g, 'music', 0, 0.45);
    for (const n of notes) for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = hz(n); o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = 0.22;
      o.connect(og); og.connect(f);
      o.start(t); o.stop(t + dur + 0.7);
    }
  }

  bass(n, t, dur) {
    const ctx = this.s.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(n);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    this.s.route(g, 'music', 0, 0.1);
    o.start(t); o.stop(t + dur + 0.05);
  }
}
