// tracks/kiwi-voices-2026-10.js — 키위 「악기 소리」 모으기 묶음 (2026-10-18, 사용자 승인 후 받음)
//  키위가 걷고 콕 찍을 때 내는 소리를 소라 껍데기로 하나씩 모은다. 기본(발자국 음악·나무 콕)은 그대로 남는다.
//  악기: VCSL (Versilian Community Sample Library, 저장소 전체 CC0) — 악기마다 가운데 음역 한 음을 받아
//        게임 화음의 음으로 높낮이를 옮겨 쓴다 (playbackRate = 2^((음 − midi)/12)). oct = 게임 음보다 몇 옥타브 위에서 울릴지
//  귀여운 효과음: Freesound CC0 (소리 페이지마다 확인), 공개 미리듣기를 받아 손질
//  손질: audio-add --kind fx (앞뒤 무음 자르기, 최고점 −3dB, 모노 96k). 후보 듣기는 작업장 저장소 kiwi-sound-lab
//
//  voice: { midi, oct, pitched, walk } — sound.js 가 읽는다. walk = 글씨가 아닌 걸음(어슬렁)에도 작게 낼지
//  item.group 'step' = 소리 창 「악기 소리」 칸에 모으는 소리

const VCSL = 'VCSL', FS = 'Freesound', CC0 = 'CC0';
const vcsl = (path, title) => ({ title, author: 'Versilian Studios · Sam Gossner', source: VCSL, url: `https://github.com/sgossner/VCSL/tree/master/${path}`, license: CC0 });
const fs = (url, title, author) => ({ title, author, source: FS, url, license: CC0 });
const inst = (id, name, note) => ({ id: `s-${id}`, name, note, group: 'step' });

export default {
  id: 'kiwi-voices-2026-10',
  name: '키위 악기 소리 (VCSL · Freesound, 2026-10-18)',
  tracks: [
    // 음이 있는 악기 — 화음을 따라 걷는다
    { id: 'i-kalimba', kind: 'fx', file: 'fx-i-kalimba.mp3', voice: { midi: 70, oct: 0, pitched: true },
      item: inst('i-kalimba', '진짜 칼림바', '탄자니아 칼림바를 한 음씩'), credit: vcsl('Idiophones/Plucked%20Idiophones/Kalimba%2C%20Tanzania', 'Kalimba, Tanzania — MBira3_pluck_Main_A#4') },
    { id: 'i-balafon', kind: 'fx', file: 'fx-i-balafon.mp3', voice: { midi: 65, oct: 0, pitched: true },
      item: inst('i-balafon', '발라폰', '나무 건반을 마른 소리로 톡톡'), credit: vcsl('Idiophones/Struck%20Idiophones/Balafon/Soft%20Mallet', 'Balafon — EthnicXylo_softM_F4') },
    { id: 'i-marimba', kind: 'fx', file: 'fx-i-marimba.mp3', voice: { midi: 71, oct: 0, pitched: true },
      item: inst('i-marimba', '마림바', '둥글고 부드러운 나무 소리'), credit: vcsl('Idiophones/Struck%20Idiophones/Marimba', 'Marimba — Marimba_hit_Outrigger_B4_soft') },
    { id: 'i-glock', kind: 'fx', file: 'fx-i-glock.mp3', voice: { midi: 84, oct: 1, pitched: true },
      item: inst('i-glock', '글로켄슈필', '반짝이는 쇠 건반'), credit: vcsl('Idiophones/Struck%20Idiophones/Glockenspiel', 'Glockenspiel — glock_soft_C6') },
    { id: 'i-ocarina', kind: 'fx', file: 'fx-i-ocarina.mp3', voice: { midi: 79, oct: 1, pitched: true },
      item: inst('i-ocarina', '작은 오카리나', '짧게 "뽀"'), credit: vcsl('Aerophones/Edge-blown%20Aerophones/Ocarina%2C%20Small/Staccato', 'Ocarina, Small — ocarina_G5_staccato') },
    { id: 'i-harp', kind: 'fx', file: 'fx-i-harp.mp3', voice: { midi: 68, oct: 0, pitched: true },
      item: inst('i-harp', '포크 하프', '손끝으로 튕기는 하프'), credit: vcsl('Chordophones/Composite%20Chordophones/Folk%20Harp', 'Folk Harp — EWHarp_Normal_G#4') },
    { id: 'i-glass', kind: 'fx', file: 'fx-i-glass.mp3', voice: { midi: 74, oct: 1, pitched: true },
      item: inst('i-glass', '와인잔', '유리잔을 "팅"'), credit: vcsl('Idiophones/Friction%20Idiophones/Wine%20Glasses/Releases/Fast', 'Wine Glasses — glass4_D5_Fast_1_Decay') },
    // 음 없는 타악기 — 높낮이만 조금씩
    { id: 'p-woodblock', kind: 'fx', file: 'fx-p-woodblock.mp3', voice: { walk: true },
      item: inst('p-woodblock', '우드블록', '나무 "톡" — 콕과 잘 어울린다'), credit: vcsl('Idiophones/Struck%20Idiophones/Woodblock', 'Woodblock — wood_click_mp') },
    { id: 'p-shaker', kind: 'fx', file: 'fx-p-shaker.mp3', voice: { walk: true },
      item: inst('p-shaker', '작은 셰이커', '모래알 "샥" — 모래 발소리의 악기판'), credit: vcsl('Idiophones/Struck%20Idiophones/Shaker%2C%20Small', 'Shaker, Small — Mid_ShakerLowFaster_Down') },
    // 귀여운 효과음 — 걸음마다 뽁뽁
    { id: 'c-pop', kind: 'fx', file: 'fx-c-pop.mp3', voice: { walk: true },
      item: inst('c-pop', '통통 뽁', '통통한 "뽁"'), credit: fs('https://freesound.org/people/deraj/sounds/202230/', 'Pop sound', 'deraj') },
    { id: 'c-bubble', kind: 'fx', file: 'fx-c-bubble.mp3', voice: { walk: true },
      item: inst('c-bubble', '비눗방울', '방울이 "퐁"'), credit: fs('https://freesound.org/people/TheBuilder15/sounds/411462/', 'Bubble Pop', 'TheBuilder15') },
    { id: 'c-mouth', kind: 'fx', file: 'fx-c-mouth.mp3', voice: { walk: true },
      item: inst('c-mouth', '입으로 뽁', '입으로 낸 "뽁"'), credit: fs('https://freesound.org/people/fleurescence/sounds/573153/', 'Mouth pop', 'fleurescence') },
    { id: 'c-boop', kind: 'fx', file: 'fx-c-boop.mp3', voice: { walk: true },
      item: inst('c-boop', '만화 뿝', '만화처럼 "뿝"'), credit: fs('https://freesound.org/people/jeckkech/sounds/391649/', 'boop.wav', 'jeckkech') },
  ],
};
