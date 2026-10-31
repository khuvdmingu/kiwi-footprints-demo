// gifts.js — v29.6 답장 선물: 손님 편지에 주운 것 · 낚은 것 하나로 답한다
//
//  · 편지를 읽은 손님에게 선물 하나를 모래에 놓아 둔다 (동물마다 한 번에 하나, 바구니에서 빠진다).
//  · 그 동물은 다음에 손님이 올 때 꼭 들러(그 장소에 사는 동물이면) 선물을 가져가고, 고맙다는 편지를 모래에 남긴다.
//  · 동물마다 좋아하는 것이 있다 — 맞히면 그 동물만의 답장. 무엇을 좋아하는지는 맞혀 봐야 안다(맞힌 뒤엔 편지 카드에 적힌다).
//  · v29.9 답례: 좋아하는 걸 맞히면 그 동물이 섬 가는 길을 알려 줘 잠긴 섬 하나가 바로 열리고(그 동물이 사는 섬 먼저),
//    보통 선물은 지도 조각 하나 — 조각 둘이면 섬 하나가 열린다. 열 섬이 없으면 답례 없이 편지만.
//  · 세 통을 다 읽은 뒤에도 선물로 편지가 이어진다. 준 횟수 = 그 동물과의 사이(손님 칸에 🎁 숫자).
//  item key: 'f:<주운 것 id>' · 'c:<낚은 것 id>'
//  규칙·저장만 — 화면은 main.js (편지 카드 「답장 선물」 · 고르기 칸 · 모래 위 고맙다는 쪽지).

import { thanksLetter } from './letters/index.js?v=v29.33.0-879286d';
import { eul, ro } from './letters/josa.js?v=v29.33.0-879286d';

export const LIKES = {
  gull: { likes: ['c:kelp', 'f:scallop', 'f:feather'] },
  crab: { likes: ['f:snail', 'f:pebble', 'c:seahorse'] },
  weka: { likes: ['f:glassG', 'f:glassB', 'f:rainbow', 'c:buoy'] },
  hedgehog: { likes: ['f:berry', 'f:willowleaf', 'f:heartpetal'] },
  duck: { likes: ['c:kelp', 'f:riverstone', 'f:willowleaf'] },
  fox: { likes: ['f:ice', 'f:obsidian', 'f:gold'] },
  rabbit: { likes: ['f:heartpetal', 'f:blossom', 'f:berry'] },
  deer: { likes: ['f:willowleaf', 'f:amber', 'f:fossil'] },
  sparrow: { likes: ['f:dateseed', 'f:berry', 'f:eggshell'] },
  cat: { likes: ['c:seahorse', 'f:pearl', 'f:glow'] },
  squirrel: { likes: ['f:dateseed', 'f:berry', 'f:amber'] },
  whiteeye: { likes: ['f:blossom', 'f:heartpetal', 'f:berry'] },
  frog: { likes: ['f:riverstone', 'f:glassG', 'c:buoy'] },
  egret: { likes: ['f:pearl', 'f:scallop', 'c:coral'] },
  fennec: { likes: ['f:desertrose', 'f:goldstone', 'f:sandstone'] },
  hoopoe: { likes: ['f:feather', 'f:gold', 'f:bluebead'] },
  gecko: { likes: ['f:obsidian', 'f:glow', 'f:bluebead'] },
  gerbil: { likes: ['f:dateseed', 'f:palmfiber', 'f:sandstone'] },
  camel: { likes: ['f:palmfiber', 'f:desertrose', 'c:rope'] },
  raccoon: { likes: ['f:riverstone', 'f:glassB', 'c:compass'] },
};

export const SCRAPS = 2;   // 지도 조각 몇 개면 섬 하나

// v29.28 고맙다는 편지 글은 편지 시스템(letters) — 동물마다 thanks · liked, 없으면 모두의 글(letters/ko/common.js)
export { eul };
export function thanksText(guest, name, liked, n = 0, key = '') { return thanksLetter(guest, name, liked, n, key); }

// 답례 한 줄 (편지 끝에 붙인다): r = { island: 열린 섬 이름, scrap, left: 남은 조각 수 }
export function rewardText(r) {
  if (r?.island && !r.scrap) return `\n\n답례로 길을 알려 줄게요 — ${ro(r.island)} 가는 바닷길이에요. 해도에 그려 뒀어요.`;
  if (r?.island) return `\n\n지도 조각을 하나 두고 가요. 전에 받은 조각과 맞춰 보니 ${ro(r.island)} 가는 길이 보여요!`;
  if (r?.scrap) return `\n\n지도 조각을 하나 두고 가요. ${SCRAPS - (r.left || 0)}개 더 모이면 섬 하나가 보일 거예요.`;
  return '';
}

export class Gifts {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.waiting = s.waiting && typeof s.waiting === 'object' ? s.waiting : {};   // 동물 → { key, at } 모래에 놓아 둔 선물
    this.given = s.given && typeof s.given === 'object' ? s.given : {};           // 동물 → [{ key, at, liked }] 가져간 선물
    this.scraps = Math.max(0, s.scraps | 0);                                       // 모아 둔 지도 조각 (둘이면 섬 하나)
  }
  store() { this.save(JSON.stringify({ waiting: this.waiting, given: this.given, scraps: this.scraps })); }
  // 답례: locked = 아직 잠긴 섬 id 들(가까운 순), home = 그 동물이 사는 섬들 → { island, scrap }
  //  좋아하는 것 → 섬 하나 · 보통 → 조각 하나(둘 모이면 섬 하나) · 열 섬이 없으면 아무것도
  reward(liked, locked, home = []) {
    if (!locked.length) return { island: null, scrap: false };
    const pickIsle = () => locked.find(id => home.includes(id)) || locked[0];
    if (liked) { this.store(); return { island: pickIsle(), scrap: false }; }
    this.scraps++;
    if (this.scraps >= SCRAPS) { this.scraps = 0; this.store(); return { island: pickIsle(), scrap: true }; }
    this.store(); return { island: null, scrap: true };
  }
  isLiked(guest, key) { return !!LIKES[guest]?.likes.includes(key); }
  // 놓아 두기 — 이미 하나 기다리는 중이면 false
  put(guest, key, at = Date.now()) { if (this.waiting[guest]) return false; this.waiting[guest] = { key, at }; this.store(); return true; }
  // 그 동물이 들렀다: 기다리던 선물을 가져간다 → { key, liked, n } | null
  collect(guest, at = Date.now()) {
    const w = this.waiting[guest]; if (!w) return null;
    delete this.waiting[guest];
    const liked = this.isLiked(guest, w.key), list = (this.given[guest] ||= []);
    list.push({ key: w.key, at, liked }); this.store();
    return { key: w.key, liked, n: list.length - 1 };
  }
  count(guest) { return (this.given[guest] || []).length; }
  get total() { return Object.values(this.given).reduce((n, l) => n + l.length, 0); }
  // 맞힌 좋아하는 것 (편지 카드에 적는다)
  knownLikes(guest) { return [...new Set((this.given[guest] || []).filter(g => g.liked).map(g => g.key))]; }
}

// 손님 고르기: 선물이 기다리는 동물(이 장소에 사는)은 꼭 온다 — 앞자리부터 바꿔 넣는다
export function invite(ids, here, gifts) {
  if (!ids.length) return ids;
  const want = Object.keys(gifts.waiting).filter(id => here.includes(id) && !ids.includes(id));
  return ids.map((id, i) => want[i] || id);
}
