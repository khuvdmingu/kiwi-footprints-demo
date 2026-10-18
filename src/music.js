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
// v16: 이 생성 곡들은 아이템에서 뺐다(아이템 곡은 오픈소스 녹음 — sound.js SONG_TRACKS). 엔진 기능으로만 남긴다.
// v15 곡: 시간 따라 바뀌는 분위기 대신 하나를 골라 계속 듣는다 (소라로 얻고 소리 창에서 고른다). 전부 직접 짠 진행·선율, 남의 곡 없음.
//  lead: bell 오르골 · pluck 칼림바 · rhodes 로즈 피아노 · glass 유리 · flute 플루트
//  pad: tri 지금 패드 · soft 부드러운 사인 · warm 따뜻한 톱니(어둡게)   bass: two 1·3박 · one 첫 박 · none
//  play: random 화음 음 아무거나 · arp 정해진 순서로 오르내림 · motif 곡마다 정한 짧은 선율을 화음에 맞춰 되풀이
export const SONGS = {
  tide: { name: '물결 오르골', key: 64, bpm: 62, density: 0.55, bright: 2800, lead: 'bell', pad: 'tri', bass: 'two', play: 'arp', arp: [0, 1, 2, 3, 2, 1, 2, 3],
    prog: [[0, 4, 7, 11], [2, 6, 9, 13], [0, 4, 7, 11], [-1, 2, 7, 11]] },                       // Imaj7 · II(리디아) · Imaj7 · V/7 — 반짝이는 들뜸
  kalimba: { name: '느린 칼림바', key: 62, bpm: 70, density: 0.7, bright: 2400, lead: 'pluck', pad: 'soft', bass: 'two', play: 'arp', arp: [0, 2, 1, 3, 2, 0, 3, 1],
    prog: [[0, 4, 7, 14], [-3, 0, 4, 9], [5, 9, 12, 16], [0, 2, 7, 12]] },                       // I · vi · IV · Isus2
  rhodes: { name: '밤 피아노', key: 57, bpm: 54, density: 0.3, bright: 1500, lead: 'rhodes', pad: 'warm', bass: 'one', play: 'motif', motif: [3, -1, 2, -1, 1, -1, -1, 0],
    prog: [[0, 3, 7, 10], [5, 9, 12, 15], [0, 3, 7, 10], [-2, 2, 5, 9], [0, 3, 7, 10], [5, 9, 12, 15], [3, 7, 10, 14], [-2, 2, 5, 12]] },   // 도리아 i7 · IV7 · … 8마디
  fog: { name: '안개 패드', key: 60, bpm: 44, density: 0.16, bright: 1100, lead: 'glass', pad: 'soft', bass: 'none', play: 'random',
    prog: [[0, 4, 7, 14], [-3, 0, 4, 11], [-7, -3, 0, 7], [0, 5, 7, 14]] },                     // Iadd9 · vi7 · IVadd9 · Isus4 — 아주 느리게
  stars: { name: '별빛 유리', key: 67, bpm: 58, density: 0.42, bright: 3400, lead: 'glass', pad: 'tri', bass: 'one', play: 'motif', motif: [2, 3, -1, 1, -1, 2, -1, -1],
    prog: [[0, 4, 7, 14], [-2, 2, 5, 12], [-7, -3, 0, 7], [0, 4, 7, 12]] },                     // 믹솔리디아 I · bVII · IV · I
  forest: { name: '숲속 아침', key: 65, bpm: 76, density: 0.5, bright: 3000, lead: 'flute', pad: 'soft', bass: 'two', play: 'motif', motif: [0, -1, 1, 2, -1, 1, 0, -1],
    prog: [[0, 4, 7, 12], [4, 7, 11, 16], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 7, 12], [-3, 0, 4, 9], [2, 5, 9, 14], [7, 11, 14, 17]] },   // I · iii · IV · V · I · vi · ii · V7
  // v18 앰비언트 6곡 (2026-10-11, 직접 짬 — 후보 듣기 kiwi-sound-lab/pages/audition.html 에서 고른 뒤 아이템으로 올린다)
  //  새 재료: chordBars 화음 하나를 N마디 끈다 · drone 진행 내내 깔리는 근음+5도 · pad 'swell' 아주 천천히 부풀고 다음 화음과 겹친다
  //          lead 'shimmer' 높은 사인 두 개가 맥놀이하며 오래 남는다 · play 'sparse' 5음 음계에서 드물게, 가끔 두 음
  mist: { name: '새벽 물안개', key: 62, bpm: 40, density: 0.22, bright: 1600, lead: 'glass', pad: 'swell', bass: 'none', drone: true, chordBars: 2, play: 'sparse',
    prog: [[0, 4, 7, 14], [2, 6, 9, 16], [-3, 0, 4, 11], [0, 7, 11, 14]] },                      // Iadd9 · II(리디아) · vi7 · Imaj7
  shell: { name: '소라 속 바다', key: 64, bpm: 36, density: 0.18, bright: 1900, lead: 'shimmer', pad: 'swell', bass: 'none', drone: true, chordBars: 2, play: 'sparse',
    prog: [[0, 7, 14, 16], [-3, 4, 9, 14], [5, 12, 16, 19], [0, 7, 9, 14]] },                    // 열린 5도 화음만 — 조성감 흐리게
  starlit: { name: '별 아래 키위', key: 57, bpm: 46, density: 0.3, bright: 1400, lead: 'rhodes', pad: 'swell', bass: 'one', chordBars: 2, play: 'sparse',
    prog: [[0, 3, 7, 14], [-4, 0, 3, 10], [5, 8, 12, 15], [-2, 2, 5, 9]] },                      // i(add9) · bVI7 · iv · bVII — 단조, 달밤
  moss: { name: '이끼 숲', key: 60, bpm: 44, density: 0.26, bright: 1200, lead: 'flute', pad: 'warm', bass: 'one', drone: true, chordBars: 2, play: 'sparse',
    prog: [[0, 3, 7, 10], [5, 9, 12, 15], [0, 3, 7, 14], [-2, 2, 5, 12]] },                      // 도리아 i7 · IV7 · i9 · bVII
  lake: { name: '눈 오는 호수', key: 69, bpm: 38, density: 0.2, bright: 2600, lead: 'bell', pad: 'swell', bass: 'none', drone: true, chordBars: 2, play: 'sparse',
    prog: [[0, 4, 7, 11], [-5, -1, 2, 7], [-3, 0, 4, 7], [-7, -3, 0, 4]] },                       // Imaj7 · V · vi · IV — 높은 음역, 아주 느리게
  dusk: { name: '노을 물결', key: 65, bpm: 52, density: 0.5, bright: 2100, lead: 'pluck', pad: 'swell', bass: 'two', chordBars: 1, play: 'arp', arp: [0, 1, 2, 3, 2, 1, -1, -1],
    prog: [[0, 4, 7, 11], [-3, 0, 4, 7], [2, 5, 9, 12], [-5, -1, 2, 5]] },                        // Imaj7 · vi7 · ii7 · V7 — 칼림바가 느리게 오르내림
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
    this.song = null; this.wantSong = null;   // null = 시간 따라 (MOODS)
  }
  get m() { return this.song ? SONGS[this.song] : MOODS[this.mood]; }
  get key() { return this.m.key; }
  // 지금 울리는 화음 (MIDI 음 배열)
  chord() { const p = this.m.prog; return p[this.ci() % p.length].map(i => this.key + i); }
  ci() { return Math.floor(this.bar / (this.m.chordBars || 1)); }   // 지금 화음 번호 (chordBars 마디마다 하나)
  // 곡 고르기: 다음 마디 첫 박부터 (박이 끊기지 않게)
  setSong(id) { this.wantSong = SONGS[id] ? id : null; }

  // 생성 음악 전용 출력 (음악 버스 앞 한 단). 곡을 바꾸면 이전 곡의 긴 꼬리(드론·swell 패드)를 2초 안에 줄인다
  out() {
    const s = this.s;
    if (!s.bus.gen) { const g = s.ctx.createGain(); g.connect(s.bus.music); s.bus.gen = g; }
    return 'gen';
  }
  fadeOut() {
    const s = this.s, old = s.bus && s.bus.gen;
    if (!old) return;
    old.gain.setTargetAtTime(0, s.ctx.currentTime, 0.5);
    setTimeout(() => old.disconnect(), 6000);
    delete s.bus.gen;
  }

  setMood(hour, weather) { this.want = moodOf(hour); this.weather = weather; }

  // 매 프레임: 0.25초 앞까지 박을 예약한다
  tick() {
    const ctx = this.s.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.25) {
      if (this.wantSong !== this.song) { this.song = this.wantSong; this.bar = 0; this.beat = 0; this.fadeOut(); }   // v15.1 곡은 다음 박에 바로, 첫 마디부터
      if (!this.silent) this.play(this.next);   // v16 녹음 곡이 흐를 땐 쉰다 (박·화음은 계속)
      const spb = 60 / this.m.bpm / 2;   // 8분음표 길이
      this.next += spb;
      this.beat = (this.beat + 1) % 8;
      if (this.beat === 0) {
        this.bar++;
        if (!this.song && this.bar % 4 === 0 && this.want !== this.mood) this.mood = this.want;   // 진행이 한 바퀴 돈 뒤에 분위기 전환
      }
    }
  }

  play(t) {
    const m = this.m, chord = this.chord(), w = this.weather;
    const bright = m.bright * (w === 'rain' ? 0.55 : w === 'drizzle' ? 0.75 : w === 'fog' ? 0.7 : w === 'snow' ? 1.25 : w === 'blossom' ? 1.1 : 1);
    const spb = 60 / m.bpm / 2;
    const cb = m.chordBars || 1, root = this.key + m.prog[this.ci() % m.prog.length][0];
    if (this.beat === 0 && this.bar % cb === 0) this.pad(chord, t, spb * 8 * cb, bright, m.pad);
    if (m.drone && this.beat === 0 && this.bar % (cb * m.prog.length) === 0) this.drone(this.key, t, spb * 8 * cb * m.prog.length, bright);
    if (m.bass !== 'none' && (this.beat === 0 || (this.beat === 4 && m.bass !== 'one'))) this.bass(root - 24, t, spb * (m.bass === 'one' ? 7 : 3.5));
    let density = m.density * (w === 'rain' ? 0.6 : w === 'drizzle' ? 0.8 : w === 'wind' ? 0.5 : w === 'snow' ? 1.2 : 1);
    if (this.beat % 2 === 1) density *= 0.55;   // 뒷박은 드물게
    const up = 12 + (w === 'snow' ? 12 : 0);
    if (m.play === 'motif') {
      // 곡의 선율: 박마다 정해진 화음 음(−1 = 쉼), 가끔 한 옥타브 위로
      const k = m.motif[this.beat];
      if (k >= 0 && Math.random() < 0.85) this.voice(m.lead, chord[k % chord.length] + up + (this.bar % 4 === 3 && Math.random() < 0.4 ? 12 : 0), t, (this.beat / 7 - 0.5) * 0.8);
    } else if (m.play === 'sparse') {
      // 5음 음계(화음 음 + 근음의 2·9도)에서 드물게. 가끔 바로 옆 음을 하나 더 (두 음이 겹쳐 울림)
      if (Math.random() < density * (this.beat === 0 ? 1.6 : 1)) {
        const pool = [...chord, root + 2, root + 14], n = pool[Math.floor(Math.random() * pool.length)] + up + (Math.random() < 0.25 ? 12 : 0);
        const pan = (Math.random() - 0.5) * 1.2;
        this.voice(m.lead, n, t, pan);
        if (Math.random() < 0.25) this.voice(m.lead, n + (Math.random() < 0.5 ? 5 : 7), t + spb * (0.5 + Math.random()), -pan);
      }
    } else if (Math.random() < density && !(m.play === 'arp' && m.arp[this.beat] < 0)) {   // arp 의 −1 = 쉼
      const n = m.play === 'arp' ? chord[m.arp[this.beat] % chord.length] + up + (this.bar % 2 ? 12 : 0)
        : chord[Math.floor(Math.random() * chord.length)] + up + (Math.random() < 0.35 ? 12 : 0);
      this.voice(m.lead || 'bell', n, t, (Math.random() - 0.5) * 1.1);
    }
  }

  // 리드 악기 하나 (t = 절대 시각)
  voice(kind, n, t, pan) {
    const s = this.s, ctx = s.ctx;
    if (kind === 'pluck') { s.pluck(n, 0.1, Math.max(0, t - ctx.currentTime), 1.6, pan, this.out(), 0.35); return; }
    if (kind === 'bell' || !kind) { s.bell(n, 0.06 + Math.random() * 0.03, t, pan, this.out()); return; }
    const f = hz(n), g = ctx.createGain(), parts = [];
    if (kind === 'rhodes') {        // 로즈: 둥근 기음 + 금방 사라지는 쇳소리(높은 배음)
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      parts.push([1, 1, 'sine', 2.8], [2, 0.18, 'sine', 1.2], [7.1, 0.05, 'sine', 0.15]);
    } else if (kind === 'glass') {  // 유리: 맑고 길게, 살짝 어긋난 배음
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      parts.push([1, 1, 'sine', 3.6], [2.76, 0.2, 'sine', 1.8], [5.4, 0.06, 'sine', 0.6]);
    } else if (kind === 'shimmer') {  // 반짝임: 아주 높은 사인 두 개가 살짝 어긋나 맥놀이, 천천히 피었다 오래 남는다
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
      parts.push([1, 1, 'sine', 6], [1.003, 0.8, 'sine', 6], [2, 0.12, 'sine', 2.5]);
    } else if (kind === 'flute') {  // 플루트: 천천히 불고 살짝 떨림, 숨소리
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.09); g.gain.setValueAtTime(0.08, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      parts.push([1, 1, 'sine', 1.1], [2, 0.12, 'sine', 1.1]);
      const nb = ctx.createBufferSource(); nb.buffer = s.white; const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = f * 2; bf.Q.value = 3;
      const bg = ctx.createGain(); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.012, t + 0.06); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      nb.connect(bf); bf.connect(bg); bg.connect(g); nb.start(t, Math.random() * 0.5); nb.stop(t + 0.55);
    }
    s.route(g, this.out(), pan, kind === 'shimmer' ? 0.9 : 0.5);
    let vib = null;
    if (kind === 'flute') { vib = ctx.createOscillator(); vib.frequency.value = 5; const vg = ctx.createGain(); vg.gain.value = f * 0.004; vib.connect(vg); vib.vg = vg; vib.start(t + 0.15); vib.stop(t + 1.2); }
    for (const [mul, amp, type, dec] of parts) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.value = f * mul;
      if (vib) vib.vg.connect(o.frequency);
      og.gain.setValueAtTime(amp, t); og.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dec + 0.05);
    }
  }

  pad(notes, t, dur, bright, kind = 'tri') {
    const ctx = this.s.ctx;
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = kind === 'warm' ? bright * 0.6 : bright; f.Q.value = 0.4;
    const lvl = kind === 'warm' ? 0.03 : kind === 'soft' ? 0.06 : kind === 'swell' ? 0.05 : 0.05, att = kind === 'soft' ? 0.5 : kind === 'swell' ? 0.45 : 0.35;
    const tail = kind === 'swell' ? dur * 0.35 : 0.6;   // swell 은 다음 화음과 길게 겹친다 (끊김 없이 번진다)
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lvl, t + dur * att);
    g.gain.setValueAtTime(lvl, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur + tail);
    f.connect(g);
    this.s.route(g, this.out(), 0, kind === 'swell' ? 0.8 : 0.45);
    for (const n of notes) for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = kind === 'warm' ? 'sawtooth' : kind === 'soft' || kind === 'swell' ? 'sine' : 'triangle'; o.frequency.value = hz(n); o.detune.value = det * (kind === 'swell' ? 1.6 : 1);
      const og = ctx.createGain(); og.gain.value = 0.22;
      o.connect(og); og.connect(f);
      o.start(t); o.stop(t + dur + tail + 0.1);
    }
  }

  // 드론: 진행 한 바퀴 내내 근음 + 5도가 아주 낮게 깔리고, 필터가 천천히 열렸다 닫힌다
  drone(key, t, dur, bright) {
    const ctx = this.s.ctx, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(bright * 0.15, t); f.frequency.linearRampToValueAtTime(bright * 0.35, t + dur * 0.5); f.frequency.linearRampToValueAtTime(bright * 0.15, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + Math.min(6, dur * 0.2));
    g.gain.setValueAtTime(0.05, t + dur - 2); g.gain.linearRampToValueAtTime(0, t + dur + 4);   // 다음 바퀴 드론과 4초 겹침
    f.connect(g); this.s.route(g, this.out(), 0, 0.6);
    for (const [n, det] of [[key - 24, -4], [key - 24, 4], [key - 17, 0]]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = n === key - 17 ? 0.5 : 0.7;
      o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 4.2);
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
    this.s.route(g, this.out(), 0, 0.1);
    o.start(t); o.stop(t + dur + 0.05);
  }
}
