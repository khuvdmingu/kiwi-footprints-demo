// tracks/fs-2026-10.js — 키위 「자연스러운 소리」 묶음 (2026-10-17, 효과음 듣기 페이지에서 사용자가 고른 12개 + 콕 기본 3개)
//  전부 Freesound CC0 (소리 페이지마다 확인). 원본은 로그인해야 받을 수 있어 공개 미리듣기(mp3 128k)를 받아 손질했다.
//  손질: 걷기 = tools/audio-steps.cjs (한 걸음씩 찾아 0.5초 칸) · 한 번 치기 = audio-add --kind fx (무음 자르기, 최고점 −3dB)
//  후보 고르기·듣기는 작업장 저장소 kiwi-sound-lab (pages/sfx-audition.html)
//
//  natural: 소리 창 「자연스러운 소리」 칸에 나오는 이름. v18.8 (사용자 2026-10-18 "아이템 모으듯이"): 소라 껍데기로 모은다
//   item.group 'natstep' = 자연스러운 소리 칸 · 'find' = 찾았을 때 소리 칸 (기본 = 합성 종소리는 그대로)
//  해변 모래는 두 녹음(655366 + 383490)을 이어 붙인 뒤 발걸음을 골랐다

const FS = 'Freesound', CC0 = 'CC0';
const fs = (url, title, author) => ({ title, author, source: FS, url, license: CC0 });   // title·author·url = Freesound 소리 페이지 그대로

export default {
  id: 'fs-2026-10',
  name: 'Freesound 키위 자연 소리 (2026-10-17 선택)',
  tracks: [
    // 걷기 (장소별) · 도망 종종걸음
    { id: 'sand', kind: 'step', file: 'steps-sand.mp3', item: { id: 'k-sand', name: '해변 모래 녹음', note: '해변 모래를 사박사박 — 그 바닥을 콕 찍는 녹음도 함께', group: 'natstep' }, natural: '해변 모래', credit: fs('https://freesound.org/people/21100495/sounds/655366/', 'walking in beach sand.wav + Footsteps on sand.wav', '21100495 · Daphne_in_Wonderland') },
    { id: 'zengravel', kind: 'step', file: 'steps-zengravel.mp3', item: { id: 'k-zengravel', name: '자갈 정원 녹음', note: '고운 자갈을 자박자박 — 그 바닥을 콕 찍는 녹음도 함께', group: 'natstep' }, natural: '자갈 정원', credit: fs('https://freesound.org/people/Cornwallis89/sounds/244590/', 'Gravel/Sand Walking 1', 'Cornwallis89') },
    { id: 'dryleaves', kind: 'step', file: 'steps-dryleaves.mp3', item: { id: 'k-dryleaves', name: '마른 잎 녹음', note: '마른 잎을 바스락 — 그 바닥을 콕 찍는 녹음도 함께', group: 'natstep' }, natural: '마른 잎', credit: fs('https://freesound.org/people/buojira/sounds/540949/', 'steps on dry leaves', 'buojira') },
    { id: 'snowwalk', kind: 'step', file: 'steps-snowwalk.mp3', item: { id: 'k-snowwalk', name: '눈길 녹음', note: '눈을 뽀득뽀득 — 그 바닥을 콕 찍는 녹음도 함께', group: 'natstep' }, natural: '눈길', credit: fs('https://freesound.org/people/Nox_Sound/sounds/613849/', 'Footsteps_Mountain_Boots_Snow_Walk_Mono.wav', 'Nox_Sound') },
    { id: 'mud', kind: 'step', file: 'steps-mud.mp3', item: { id: 'k-mud', name: '진흙 오솔길 녹음', note: '젖은 흙길을 철벅 — 그 바닥을 콕 찍는 녹음도 함께', group: 'natstep' }, natural: '진흙 오솔길', credit: fs('https://freesound.org/people/Magnesus/sounds/449653/', 'Footsteps on a muddy path', 'Magnesus') },
    { id: 'scurry', kind: 'step', file: 'steps-scurry.mp3', credit: fs('https://freesound.org/people/IENBA/sounds/658429/', 'Animal Footsteps', 'IENBA') },
    // 콕 (바닥별) — 사용자가 아직 고르지 않아 기본값으로 둔 것. 듣기 페이지에서 바꿀 수 있다
    { id: 'peck-sand', kind: 'fx', file: 'fx-peck-sand.mp3', credit: fs('https://freesound.org/people/f3bbbo/sounds/651292/', 'Digging in wet course sand (1)', 'f3bbbo') },
    { id: 'peck-mud', kind: 'fx', file: 'fx-peck-mud.mp3', credit: fs('https://freesound.org/people/MrFossy/sounds/589835/', 'SFX_SQUELCH_slayer_214.wav', 'MrFossy') },
    { id: 'peck-crunch', kind: 'fx', file: 'fx-peck-crunch.mp3', credit: fs('https://freesound.org/people/wubitog/sounds/234783/', 'Crunch', 'wubitog') },
    // 발견: 반짝(병·상자 열기) · 줍기(물가) · 희귀
    { id: 'sparkle', kind: 'fx', file: 'fx-sparkle.mp3', item: { id: 'k-sparkle', name: '반짝 녹음', note: '병·상자를 열면 반짝, 물가에서 주우면 플링·톡, 희귀품은 드러남 — 녹음 다섯 개 묶음', group: 'find' }, credit: fs('https://freesound.org/people/gsb1039/sounds/430893/', 'Magic 3.Glitter+Arrival.wav', 'gsb1039') },
    { id: 'glow', kind: 'fx', file: 'fx-glow.mp3', credit: fs('https://freesound.org/people/newagesoup/sounds/351408/', 'GLEAM-GLOW-SFX-CHIME.wav', 'newagesoup') },
    { id: 'pickup', kind: 'fx', file: 'fx-pickup.mp3', credit: fs('https://freesound.org/people/skylarjulian/sounds/521332/', 'Mein bottle pling', 'skylarjulian') },
    { id: 'coin', kind: 'fx', file: 'fx-coin.mp3', credit: fs('https://freesound.org/people/Cedimedi/sounds/550289/', 'Coin Pick Up / Fall', 'Cedimedi') },
    { id: 'reveal', kind: 'fx', file: 'fx-reveal.mp3', credit: fs('https://freesound.org/people/rmukx/sounds/119457/', 'revealed.wav', 'rmukx') },
  ],
};
