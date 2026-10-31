// illus.js — v28.18 키위가 그린 이야기 그림 (항해 일지 · 손님 편지)
//
//  그림: assets/illus-*.webp — Claude 재고 stock/diary/scene (2026-10-22, nano_banana_pro) + Codex 재고 stock/stories/2026-10-21 (gpt_image_2_5)
//  같은 사건에 두 판이 있으면(고래 · 잎 우산) 이름을 달리해 둘 다 쓴다 (사용자 2026-10-24 "중복되어도 다른 이름으로 다 쓰자")
//  고르는 법: 같은 기록은 언제 열어도 같은 그림 (기록 시각으로 정한다)

export const ILLUS = {
  whale: ['illus-whale.webp?v=v29.31.0-bcde151', 'illus-whale-b.webp?v=v29.31.0-bcde151'],
  meteor: ['illus-meteor.webp?v=v29.31.0-bcde151'],
  lighthouse: ['illus-lighthouse.webp?v=v29.31.0-bcde151'],
  seabird: ['illus-seabird.webp?v=v29.31.0-bcde151'],
  doze: ['illus-doze.webp?v=v29.31.0-bcde151'],
  leaf: ['illus-leaf.webp?v=v29.31.0-bcde151', 'illus-leaf-b.webp?v=v29.31.0-bcde151'],
  // 아무 일 없던 바다(quiet) — 키위가 상상으로 그린 바다
  quiet: ['illus-flyingfish.webp?v=v29.31.0-bcde151', 'illus-dolphins.webp?v=v29.31.0-bcde151', 'illus-bottle.webp?v=v29.31.0-bcde151', 'illus-plankton.webp?v=v29.31.0-bcde151', 'illus-rainbow.webp?v=v29.31.0-bcde151', 'illus-flyinghat.webp?v=v29.31.0-bcde151'],
};
// 도착: 장소마다 (없으면 기본)
export const ARRIVE = { snow: 'illus-snowkiwi.webp?v=v29.31.0-bcde151', fall: 'illus-leafpile.webp?v=v29.31.0-bcde151', default: 'illus-arrive.webp?v=v29.31.0-bcde151' };
// 손님의 마지막 편지에 손님 그림 대신
export const GUEST_STORY = { gull: 'illus-gull.webp?v=v29.31.0-bcde151', weka: 'illus-weka.webp?v=v29.31.0-bcde151', cat: 'illus-cat.webp?v=v29.31.0-bcde151', crab: 'illus-crab.webp?v=v29.31.0-bcde151' };

const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
export function pickIllus(kind, seed) {
  const list = ILLUS[kind];
  return list && list.length ? list[hash(seed) % list.length] : null;
}
export const arriveIllus = to => ARRIVE[to] || ARRIVE.default;
