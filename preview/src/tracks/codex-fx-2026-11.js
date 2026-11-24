// tracks/codex-fx-2026-11.js — v30.23 Codex 소리 9 (2026-11-22 앱 연결, 사용자 「다 넣자」 — 듣기용 사본을 보낸 뒤)
//  Codex 재고 stock/audio/2026-10-21-hq (2026-10-21, Higgsfield Kling 3.0 pro sound=on 영상에서 소리만 — job·프롬프트는 그 폴더 README·requests.json)
//  손질: 모노 44.1kHz 96kbps · 자연 배경 −24~−26 · 효과음 −22~−26 LUFS (loudnorm, 잎 우산 빗방울은 +4.5dB 리미터)
//  배경음악 8 은 사용자 결정(「음악 말고 효과음으로만」)으로 넣지 않는다
//  ⚠ AI 생성 소리 — 상업 출시 전에 Higgsfield 플랜의 생성물 이용 조건을 확인할 것

const own = (title, src) => ({ title, author: `Codex 재고 ${src}`, source: 'Higgsfield Kling 3.0 소리 (Ultra 플랜)', url: '', license: 'OWN' });

export default {
  id: 'codex-fx-2026-11',
  name: 'v30.23 Codex 소리 (2026-10-21)',
  tracks: [
    // 자연 배경 (고리) — 소라로 모아 설정 › 소리에서 고른다
    { id: 'creek', kind: 'nature', file: 'amb-creek.mp3', level: 0.6, item: { id: 'n-creek', name: '숲 개울', note: '숲속 작은 개울이 졸졸' }, credit: own('숲 · 작은 개울', 'forest-creek') },
    { id: 'leafrain', kind: 'nature', file: 'amb-leafrain.mp3', level: 0.6, item: { id: 'n-leafrain', name: '잎 우산 빗소리', note: '큰 잎 위로 빗방울이 톡톡' }, credit: own('잎 우산 · 빗방울', 'leaf-umbrella-rain') },
    { id: 'nightmeadow', kind: 'nature', file: 'amb-nightmeadow.mp3', level: 0.6, item: { id: 'n-nightmeadow', name: '밤 풀밭', note: '풀바람과 먼 귀뚜라미' }, credit: own('밤 · 풀바람과 먼 귀뚜라미', 'night-meadow') },
    // 걷기 녹음 — 소라로 모으는 「자연스러운 소리」 발걸음
    { id: 'soil', kind: 'step', file: 'steps-soil.mp3', item: { id: 'k-soil', name: '숲 흙길 녹음', note: '부드러운 흙길을 사박 — 그 바닥을 콕 찍는 녹음도 함께', group: 'natstep' }, natural: '숲 흙길', credit: own('발소리 · 숲 흙길', 'steps-soil') },
    // 효과음 (sound.js MORE_FX)
    { id: 'oar-dip', kind: 'fx', file: 'fx-oar-dip.mp3', credit: own('항해 · 노 젓기', 'oar-dip') },
    { id: 'letter-unfold', kind: 'fx', file: 'fx-letter-unfold.mp3', credit: own('편지지 펼치기', 'letter-unfold') },
    { id: 'journal-open', kind: 'fx', file: 'fx-journal-open.mp3', credit: own('일지 책 펼치기', 'journal-open') },
    { id: 'ui-confirm', kind: 'fx', file: 'fx-ui-confirm.mp3', credit: own('버튼 · 포근한 확인음', 'ui-confirm') },
    { id: 'ui-tap', kind: 'fx', file: 'fx-ui-tap.mp3', credit: own('버튼 · 나무 톡', 'ui-soft-tap') },
  ],
};
