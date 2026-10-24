// gifts.js — v29.6 답장 선물: 손님 편지에 주운 것 · 낚은 것 하나로 답한다
//
//  · 편지를 읽은 손님에게 선물 하나를 모래에 놓아 둔다 (동물마다 한 번에 하나, 바구니에서 빠진다).
//  · 그 동물은 다음에 손님이 올 때 꼭 들러(그 장소에 사는 동물이면) 선물을 가져가고, 고맙다는 편지를 모래에 남긴다.
//  · 동물마다 좋아하는 것이 있다 — 맞히면 그 동물만의 답장. 무엇을 좋아하는지는 맞혀 봐야 안다(맞힌 뒤엔 편지 카드에 적힌다).
//  · 세 통을 다 읽은 뒤에도 선물로 편지가 이어진다. 준 횟수 = 그 동물과의 사이(손님 칸에 🎁 숫자).
//  item key: 'f:<주운 것 id>' · 'c:<낚은 것 id>'
//  규칙·저장만 — 화면은 main.js (편지 카드 「답장 선물」 · 고르기 칸 · 모래 위 고맙다는 쪽지).

export const LIKES = {
  gull: { likes: ['c:kelp', 'f:scallop', 'f:feather'], line: '이건 바다에서만 나는 보물이에요. 둥지 가장 높은 데 올려 두고, 날다가 내려다볼게요.' },
  crab: { likes: ['f:snail', 'f:pebble', 'c:seahorse'], line: '딱 맞는 새 집이에요! 집게로 꼭 안고 잤어요. 이사 축하해 줄래요?' },
  weka: { likes: ['f:glassG', 'f:glassB', 'f:rainbow', 'c:buoy'], line: '반짝이는 거 가져가고 싶다고 했던 거, 기억해 줬군요. 이번엔 정말 내 거예요!' },
  hedgehog: { likes: ['f:berry', 'f:willowleaf', 'f:heartpetal'], line: '가시 위에 꽂고 다니니까 다들 예쁘대요. 동글동글한 마음이 더 동글해졌어요.' },
  duck: { likes: ['c:kelp', 'f:riverstone', 'f:willowleaf'], line: '아기 오리들이 줄 맞춰 구경하러 왔어요. 다들 꽥꽥 고맙대요.' },
  fox: { likes: ['f:ice', 'f:obsidian', 'f:gold'], line: '눈 위에 놓으니 달빛을 받아 빛나요. 꼬리 옆에 두고 따뜻하게 지킬게요.' },
  rabbit: { likes: ['f:heartpetal', 'f:blossom', 'f:berry'], line: '너무 좋아서 깡충깡충 열 번 뛰었어요. 발자국이 또 엉망이 됐어요!' },
  deer: { likes: ['f:willowleaf', 'f:amber', 'f:fossil'], line: '오래된 숲 냄새가 나요. 아침 안개 속에서 한참 들여다봤어요.' },
  sparrow: { likes: ['f:dateseed', 'f:berry', 'f:eggshell'], line: '짹! 친구들한테 자랑하느라 하루가 다 갔어요. 다들 부러워해요.' },
  cat: { likes: ['c:seahorse', 'f:pearl', 'f:glow'], line: '…앞발로 굴려 보니 아주 마음에 들어요. 이 자리는 이제 다 당신 거예요.' },
  squirrel: { likes: ['f:dateseed', 'f:berry', 'f:amber'], line: '이건 묻지 않고 꼭 쥐고 다닐 거예요. 이번엔 잊어버리지 않게요.' },
  whiteeye: { likes: ['f:blossom', 'f:heartpetal', 'f:berry'], line: '부리에 꽃가루가 또 묻었어요. 노란 얼굴로 고맙다고 웃고 가요.' },
  frog: { likes: ['f:riverstone', 'f:glassG', 'c:buoy'], line: '그 위에 앉아 노래했더니 비가 왔어요. 개굴, 고마워요.' },
  egret: { likes: ['f:pearl', 'f:scallop', 'c:coral'], line: '하얀 깃털 옆에 두니 더 하얘 보여요. 한 발로 서서 오래 바라봤어요.' },
  fennec: { likes: ['f:desertrose', 'f:goldstone', 'f:sandstone'], line: '큰 귀에 대 보니 사막 바람 소리가 들려요. 굴 입구에 걸어 둘게요.' },
  hoopoe: { likes: ['f:feather', 'f:gold', 'f:bluebead'], line: '머리 깃을 활짝 폈어요. 훗훗훗, 이렇게 기분 좋은 건 처음이에요.' },
  gecko: { likes: ['f:obsidian', 'f:glow', 'f:bluebead'], line: '벽에 붙여 두니 밤마다 반짝여요. 별빛 아래서 꼬리를 흔들었어요.' },
  gerbil: { likes: ['f:dateseed', 'f:palmfiber', 'f:sandstone'], line: '볼에 쏙 넣어 왔어요! 굴에 푹신하게 깔고 낮잠 잘게요.' },
  camel: { likes: ['f:palmfiber', 'f:desertrose', 'c:rope'], line: '엄마한테 보여 줬더니 혹이 든든해 보인대요. 먼 길도 끄떡없어요.' },
  raccoon: { likes: ['f:riverstone', 'f:glassB', 'c:compass'], line: '물가에서 깨끗이 씻어서 간직했어요. 밤 산책 갈 때마다 만져 봐요.' },
};

const PLAIN = [
  w => `모래 위에 ${w} 놓여 있길래 가져왔어요. 누가 두고 간 건지 금방 알았어요. 고마워요.`,
  w => `${w} 잘 받았어요. 편지에 답장이 오다니, 생각도 못 했어요. 다음에도 들를게요.`,
  w => `발자국 옆에 ${w} 있었어요. 집에 가져가 제일 잘 보이는 데 두었어요.`,
];
// 받침 따라 을/를 · 이/가
const jong = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 > 0; };
export const eul = w => w + (jong(w) ? '을' : '를');
const iga = w => w + (jong(w) ? '이' : '가');

// 고맙다는 편지 글: liked 면 그 동물만의 한 줄, 아니면 보통 셋 중 하나 (n 으로 고정 — 다시 읽어도 같다)
export function thanksText(guest, name, liked, n = 0) {
  return liked ? `${eul(name)} 받았어요!\n${LIKES[guest]?.line || ''}` : PLAIN[n % PLAIN.length](iga(name));
}

export class Gifts {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.waiting = s.waiting && typeof s.waiting === 'object' ? s.waiting : {};   // 동물 → { key, at } 모래에 놓아 둔 선물
    this.given = s.given && typeof s.given === 'object' ? s.given : {};           // 동물 → [{ key, at, liked }] 가져간 선물
  }
  store() { this.save(JSON.stringify({ waiting: this.waiting, given: this.given })); }
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
