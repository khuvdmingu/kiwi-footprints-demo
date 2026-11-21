// illus.js — v28.18 키위가 그린 이야기 그림 (항해 일지 · 손님 편지)
//
//  그림: assets/illus-*.webp — Claude 재고 stock/diary/scene (2026-10-22, nano_banana_pro) + Codex 재고 stock/stories/2026-10-21 (gpt_image_2_5)
//  같은 사건에 두 판이 있으면(고래 · 잎 우산) 이름을 달리해 둘 다 쓴다 (사용자 2026-10-24 "중복되어도 다른 이름으로 다 쓰자")
//  고르는 법: 같은 기록은 언제 열어도 같은 그림 (기록 시각으로 정한다)

export const ILLUS = {
  whale: ['illus-whale.webp?v=v30.23.0-cda5927', 'illus-whale-b.webp?v=v30.23.0-cda5927'],
  meteor: ['illus-meteor.webp?v=v30.23.0-cda5927'],
  lighthouse: ['illus-lighthouse.webp?v=v30.23.0-cda5927'],
  seabird: ['illus-seabird.webp?v=v30.23.0-cda5927'],
  doze: ['illus-doze.webp?v=v30.23.0-cda5927'],
  leaf: ['illus-leaf.webp?v=v30.23.0-cda5927', 'illus-leaf-b.webp?v=v30.23.0-cda5927'],
  // 아무 일 없던 바다(quiet) — 키위가 상상으로 그린 바다
  quiet: ['illus-flyingfish.webp?v=v30.23.0-cda5927', 'illus-dolphins.webp?v=v30.23.0-cda5927', 'illus-bottle.webp?v=v30.23.0-cda5927', 'illus-plankton.webp?v=v30.23.0-cda5927', 'illus-rainbow.webp?v=v30.23.0-cda5927', 'illus-flyinghat.webp?v=v30.23.0-cda5927'],
};
// 도착: 장소마다 (없으면 기본)
export const ARRIVE = { snow: 'illus-snowkiwi.webp?v=v30.23.0-cda5927', fall: 'illus-leafpile.webp?v=v30.23.0-cda5927', default: 'illus-arrive.webp?v=v30.23.0-cda5927' };
// 손님의 마지막 편지에 손님 그림 대신
export const GUEST_STORY = { gull: 'illus-gull.webp?v=v30.23.0-cda5927', weka: 'illus-weka.webp?v=v30.23.0-cda5927', cat: 'illus-cat.webp?v=v30.23.0-cda5927', crab: 'illus-crab.webp?v=v30.23.0-cda5927' };

// v30.18 일지 크레용 낙서 · 잉크 도장 (재고 stock/diary 2026-10-22 → 2026-11-21 사용자 「그림체 확인하고 붙이자」)
//  낙서: 「키위의 그림」 쪽의 약 40%를 삽화 대신 크레용 낙서로 (같은 기록은 늘 같은 쪽)
//  도장: 사건 쪽·도착 쪽에 그 사건 도장. 그림(tools/diary-seals.py)은 잉크 모양(투명)만, 색은 ink 로 칠한다 — 밤 종이에선 밝게 섞음(parts.css .bookSeal)
//  doze(키위에 다리)·leaf(잎 대신 사람 우산) 도장은 그림이 게임과 어긋나 뺐다 — 다시 그리면 SEAL 에 더한다
export const DOODLE = {
  whale: 'diary-doodle-whale.webp?v=v30.23.0-cda5927', meteor: 'diary-doodle-meteor.webp?v=v30.23.0-cda5927', lighthouse: 'diary-doodle-lighthouse.webp?v=v30.23.0-cda5927',
  seabird: 'diary-doodle-seabird.webp?v=v30.23.0-cda5927', doze: 'diary-doodle-doze.webp?v=v30.23.0-cda5927', leaf: 'diary-doodle-leaf.webp?v=v30.23.0-cda5927', quiet: 'diary-doodle-calm.webp?v=v30.23.0-cda5927',
};
export const DOODLE_ARRIVE = 'diary-doodle-island.webp?v=v30.23.0-cda5927';   // 장소별 도착 그림이 없는 섬에서만
export const DOODLE_SHARE = 40;   // 100 중
export const SEAL = {
  whale: { file: 'diary-seal-whale.webp?v=v30.23.0-cda5927', ink: '#194a56', ko: '고래' },
  meteor: { file: 'diary-seal-meteor.webp?v=v30.23.0-cda5927', ink: '#1e2d4e', ko: '별똥별' },
  lighthouse: { file: 'diary-seal-lighthouse.webp?v=v30.23.0-cda5927', ink: '#a04439', ko: '등대' },
  seabird: { file: 'diary-seal-seabird.webp?v=v30.23.0-cda5927', ink: '#687149', ko: '바닷새' },
  quiet: { file: 'diary-seal-calm.webp?v=v30.23.0-cda5927', ink: '#382115', ko: '잔잔한 바다' },
  arrive: { file: 'diary-seal-island.webp?v=v30.23.0-cda5927', ink: '#ca6e59', ko: '섬' },
};

const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
export function pickIllus(kind, seed) {
  const list = ILLUS[kind];
  return list && list.length ? list[hash(seed) % list.length] : null;
}
export const arriveIllus = to => ARRIVE[to] || ARRIVE.default;
const doodled = seed => hash(seed + ':doodle') % 100 < DOODLE_SHARE;
// 사건 그림 한 쪽: { src, doodle } — 낙서가 있고 이 기록이 낙서 몫이면 낙서, 아니면 삽화
export function pickDrawn(kind, seed) {
  if (DOODLE[kind] && doodled(seed)) return { src: DOODLE[kind], doodle: true };
  const src = pickIllus(kind, seed); return src ? { src, doodle: false } : null;
}
export function arriveDrawn(to, seed) {
  if (!ARRIVE[to] && doodled(seed)) return { src: DOODLE_ARRIVE, doodle: true };
  return { src: arriveIllus(to), doodle: false };
}
// 도장: { file, ink, ko, tilt } — 기울기는 기록마다 고정 (−9° ~ 9°)
export function sealOf(kind, seed) {
  const s = SEAL[kind]; return s ? { ...s, tilt: (hash(seed + ':seal') % 19) - 9 } : null;
}
