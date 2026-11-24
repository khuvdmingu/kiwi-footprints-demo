// tracks/voyage-2026-10.js — v28.14 항해 소리 (2026-10-24 앱 연결, sound.js VOY_FX · VOY_BED 가 무작위로 고른다)
//  a = Claude 재고 stock/sound (2026-10-21, Higgsfield Seedance 2.0 Mini 영상에서 소리만 꺼냄)
//  b = Codex 재고 stock/audio/2026-10-21-hq (2026-10-21, Higgsfield 영상 모델에서 소리만 꺼냄 — 자세한 job·모델은 그 폴더 README)
//  손질: 모노 44.1kHz 96kbps, 효과음 −22 · 배 물소리 −26 LUFS 근처(원본 측정값에서 바로 증폭 + 리미터).
//  ⚠ AI 생성 소리 — 상업 출시 전에 Higgsfield 플랜의 생성물 이용 조건을 확인할 것 (Codex 재고 README 의 같은 메모)

const own = (title, author) => ({ title, author, source: 'Higgsfield 영상 모델 소리 추출 (Ultra 플랜)', url: '', license: 'OWN' });

export default {
  id: 'voyage-2026-10',
  name: '항해 소리 (Claude·Codex 재고, 2026-10-21)',
  tracks: [
    { id: 'voy-whale-a', kind: 'fx', file: 'voy-whale-a.mp3', credit: own('고래 숨 뿜기', 'Claude 재고 fx-whale-blow') },
    { id: 'voy-whale-b', kind: 'fx', file: 'voy-whale-b.mp3', credit: own('고래 숨', 'Codex 재고 whale-exhale') },
    { id: 'voy-sail-a', kind: 'fx', file: 'voy-sail-a.mp3', credit: own('돛이 바람을 받음', 'Claude 재고 fx-sail-gust') },
    { id: 'voy-sail-b', kind: 'fx', file: 'voy-sail-b.mp3', credit: own('돛과 밧줄', 'Codex 재고 sail-rope-soft') },
    { id: 'voy-reel-a', kind: 'fx', file: 'voy-reel-a.mp3', credit: own('릴 감기 + 물 튐', 'Claude 재고 fx-reel-catch') },
    { id: 'voy-reel-b', kind: 'fx', file: 'voy-reel-b.mp3', credit: own('낚시 찰박', 'Codex 재고 fishing-float') },
    { id: 'voy-boat-a', kind: 'fx', file: 'voy-boat-a.mp3', credit: own('나무배 삐걱 + 물 찰랑 (고리)', 'Claude 재고 amb-boat') },
    { id: 'voy-boat-b', kind: 'fx', file: 'voy-boat-b.mp3', credit: own('바다 잔물결 (고리)', 'Codex 재고 sea-lapping') },
  ],
};
