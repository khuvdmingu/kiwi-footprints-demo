// letters/index.js — 편지 시스템 (v29.28): 키위 쪽지와 손님 동물 편지를 한곳에서
//
//  보내는 이   kiwi 성격 4가지(temper.js) · 손님 동물(guests.js 의 id) · 이름 박힌 손님 키위(쪽지 by)
//  상황 칸     cheer 응원(키위) · visit 방문(동물, 순서대로) · thanks 보통 선물 고마움(동물, 묶음) · liked 좋아하는 것 맞힘(동물)
//  고르는 방식 pool 묶음에서 고르기(안 본 것 · 상황 · 주제) · seq 순서대로 · once 조건 처음 채울 때 한 번(사이 단계 — 2단계)
//  글          지금은 한국어만 (letters/ko/). 엔진·정보는 언어와 무관하게, 글은 번호로 찾는다 — 나중에 다른 언어는 번호 → 글 파일만 더한다
//  자세한 규칙·새 동물 붙이는 법: docs/LETTERS.md · 자동 검사: test/letters-lint.test.mjs

import todak from './ko/kiwi/todak.js?v=v29.31.0-bcde151';
import jan from './ko/kiwi/jan.js?v=v29.31.0-bcde151';
import hd from './ko/kiwi/hd.js?v=v29.31.0-bcde151';
import bs from './ko/kiwi/bs.js?v=v29.31.0-bcde151';
import ANIMALS from './ko/animals/index.js?v=v29.31.0-bcde151';
import common from './ko/common.js?v=v29.31.0-bcde151';
import { eul, iga } from './josa.js?v=v29.31.0-bcde151';

export { ANIMALS };
export const THEMES = {
  praise: '칭찬', comfort: '위로', pace: '천천히·한 걸음', rest: '쉼·잠', care: '몸 챙기기',
  write: '글씨·모래', sea: '바다·물', body: '키위 몸·생태', mates: '무리·이웃', oops: '실수',
};
export const ID_PREFIX = { todak: 't', jan: 'w', hd: 'h', bs: 'b' };   // 키위 쪽지 새 번호 (동물은 <동물 id>-v1 · -t1 · -l1)
export const MAX_LEN = { kiwi: 90, animal: 120 };
export const BANNED = ['벌레', '지렁이', '모기', '파리', '개미', '바퀴벌레', '구더기', 'MBTI'];   // 키위 세계 금지 소재 (반딧불·나비는 예외로 허용)
export const MIN = { kiwi: 20, visit: 3, liked: 1 };   // 최소 분량 — 새 동물도 이만큼은 써야 시험을 통과한다

// 키위 응원 쪽지 (성격은 파일이 정한다)
export const CHEERS = [
  ...todak.map(c => ({ ...c, p: 'todak' })),
  ...jan.map(c => ({ ...c, p: 'jan' })),
  ...hd.map(c => ({ ...c, p: 'hd' })),
  ...bs.map(c => ({ ...c, p: 'bs' })),
];
const CHEER = new Map(CHEERS.map(c => [c.id, c]));
export const cheerById = id => CHEER.get(id) || null;
export const COMMON_THANKS = common.thanks;

// 글 채우기: {gift} · {gift.eul}(을/를) · {gift.iga}(이/가)
export function fill(t, v = {}) {
  return t.replace(/\{gift(?:\.(eul|iga))?\}/g, (_, j) => !v.gift ? '' : j === 'eul' ? eul(v.gift) : j === 'iga' ? iga(v.gift) : v.gift);
}

// ── 손님 동물 ──
export const visitTexts = id => (ANIMALS[id]?.visit || []).map(l => l.t);   // 순서대로 (guests.js 가 손님 편지로 쓴다)
// 고마움 편지: liked 면 그 물건 전용(없으면 그 동물 공통) 한 줄, 아니면 그 동물 고마움 글(없으면 모두의 글) — n 으로 고정해 다시 읽어도 같다
export function thanksLetter(id, gift, liked, n = 0, key = '') {
  const a = ANIMALS[id] || {};
  if (liked) {
    const l = (a.liked || []).find(x => x.key === key) || (a.liked || []).find(x => !x.key);
    return `${eul(gift)} 받았어요!\n${l ? fill(l.t, { gift }) : ''}`;
  }
  const pool = a.thanks?.length ? a.thanks : COMMON_THANKS;
  return fill(pool[n % pool.length].t, { gift });
}

// ── 고르는 방식: pool ──
//  list 중 안 본 것(seen)에서, 지금 상황 꼬리표(ctx)가 맞는 것을 60% 먼저, 바로 전 주제(lastTh)는 피한다.
//  다 봤으면 그 묶음만 다시 섞는다 → { item, seen }
export function pickPool(list, { seen = [], ctx = {}, lastTh = '', rnd = Math.random } = {}) {
  let pool = list.filter(c => !seen.includes(c.id));
  if (!pool.length) { const ids = new Set(list.map(c => c.id)); seen = seen.filter(id => !ids.has(id)); pool = list.slice(); }
  const tags = Object.keys(ctx).filter(k => ctx[k]);
  const fit = pool.filter(c => c.tag && tags.includes(c.tag));
  const any = pool.filter(c => !c.tag);
  let from = fit.length && rnd() < 0.6 ? fit : any.length ? any : pool;
  const fresh = from.filter(c => c.th !== lastTh);
  if (fresh.length) from = fresh;
  const item = from[Math.floor(rnd() * from.length)];
  return { item, seen: [...seen, item.id] };
}
