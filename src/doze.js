// doze.js — v22.1 돌아가며 낮잠: 가만히 두면 키위 몇 마리만 잠깐씩 존다
//
//  왜: v20 은 "아무것도 안 건드림 = 자리를 비움"으로 보고 키위가 다 잠들었다. 그런데 사용자는 멍하니 구경만 할 수도 있다
//      (브라우저는 화면 앞에 사람이 있는지 모른다) — 다 잠들면 구경할 것이 사라진다.
//  규칙: · 다 같이 자지 않는다 — 낮엔 많아야 3분의 1, 밤엔(키위는 야행성) 거의 안 잔다. 적어도 MIN_AWAKE 마리는 늘 깨어 있다.
//        · 돌아가며 잔다 — 한 마리가 NAP 초쯤 자고 일어나면, 조금 뒤 다른 한 마리가 존다. 오래 봐도 화면이 조금씩 바뀐다.
//        · 건드리면 다 깨는 반응(main.js nudge)은 그대로.
//  이 파일은 "누가 언제 자고 깨는가"만 정한다. 실제로 재우고 깨우는 건 main.js 가 결과를 받아 한다 (k.sleep() · k.wake()).

export const START_AFTER = 90;      // 초: 이만큼 안 건드리면 낮잠 시작
export const MIN_AWAKE = 2;         // 늘 깨어 있는 수
export const NAP = [60, 180];       // 한 번 자는 시간(초)
export const GAP = [8, 20];         // 다음 한 마리가 잠들기까지(초)

const between = ([a, b], r) => a + (b - a) * r;

// 동시에 잘 수 있는 수: 낮 1/3 · 밤(night 0~1)으로 갈수록 줄어 한밤엔 1마리 이하, 깨어 있는 수는 MIN_AWAKE 이상
export function napCap(n, night = 0) {
  const share = (1 / 3) * (1 - 0.75 * Math.min(1, Math.max(0, night)));
  return Math.max(0, Math.min(Math.floor(n * share + 1e-9), n - MIN_AWAKE));
}

export class Doze {
  constructor({ rand = Math.random, startAfter = START_AFTER } = {}) {
    this.rand = rand; this.startAfter = startAfter;
    this.until = new WeakMap();   // 키위 → 깰 시각
    this.nextAt = 0;
  }
  // t: 지금(초) · idle: 안 건드린 지(초) · kiwis: 지금 화면의 키위 · canNap(k): 재워도 되는 키위인가 · night 0~1
  // → { sleep: 재울 키위 | null, wake: 깨울 키위들 }
  tick(t, idle, kiwis, canNap, night = 0) {
    const out = { sleep: null, wake: [] };
    const sleepers = kiwis.filter(k => k.asleep);
    // 잘 만큼 잔 키위는 일어난다 (낮잠 시간을 모르는 키위 — 다른 데서 재운 것 — 는 지금부터 잰다)
    for (const k of sleepers) {
      if (!this.until.has(k)) this.until.set(k, t + between(NAP, this.rand()));
      if (t >= this.until.get(k)) { out.wake.push(k); this.until.delete(k); }
    }
    if (idle < this.startAfter) return out;
    const napping = sleepers.length - out.wake.length;
    if (napping >= napCap(kiwis.length, night) || t < this.nextAt) return out;
    const pool = kiwis.filter(k => !k.asleep && canNap(k));
    if (!pool.length) return out;
    const k = pool[Math.floor(this.rand() * pool.length)];
    this.until.set(k, t + between(NAP, this.rand()));
    this.nextAt = t + between(GAP, this.rand());
    out.sleep = k;
    return out;
  }
  // 건드려서 다 깨웠을 때: 기록을 비우고 다음 낮잠은 조금 뒤에
  reset(t) { this.until = new WeakMap(); this.nextAt = t + GAP[0]; }
}
