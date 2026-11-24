// tracks/fx-2026-11.js — v30.22 효과음 6 (2026-11-22 앱 연결, sound.js MORE_FX — 한 판씩)
//  Claude 재고 stock/sound (2026-10-21, Higgsfield Seedance 2.0 Mini 영상에서 소리만 꺼냄 · 모노 44.1kHz 96kbps · −21~−23 LUFS)
//  붙이기 전 점검: 길이 5초 · 주파수 그림(말소리·음악 섞임 없음). ⚠ 모닥불은 성냥 뒤 낮은 웅웅이 끝까지 깔림 — 귀로 확인할 것
//  ⚠ AI 생성 소리 — 상업 출시 전에 Higgsfield 플랜의 생성물 이용 조건을 확인할 것 (voyage-2026-10.js 와 같은 메모)

const own = (title, author) => ({ title, author, source: 'Higgsfield 영상 모델 소리 추출 (Ultra 플랜)', url: '', license: 'OWN' });

export default {
  id: 'fx-2026-11',
  name: 'v30.22 효과음 (Claude 재고, 2026-10-21)',
  tracks: [
    { id: 'fx-dolphins', kind: 'fx', file: 'fx-dolphins.mp3', credit: own('돌고래 휘파람·물 튐', 'Claude 재고 fx-dolphins') },
    { id: 'fx-seabird', kind: 'fx', file: 'fx-seabird.mp3', credit: own('작은 날갯짓 + 짹짹', 'Claude 재고 fx-seabird') },
    { id: 'fx-ship-bell', kind: 'fx', file: 'fx-ship-bell.mp3', credit: own('작은 배 종 + 물가 파도', 'Claude 재고 fx-ship-bell') },
    { id: 'fx-map-unfold', kind: 'fx', file: 'fx-map-unfold.mp3', credit: own('종이 해도 펼치기', 'Claude 재고 fx-map-unfold') },
    { id: 'fx-build-done', kind: 'fx', file: 'fx-build-done.mp3', credit: own('망치 톡톡 + 나무 두드림', 'Claude 재고 fx-build-done') },
    { id: 'fx-fire-light', kind: 'fx', file: 'fx-fire-light.mp3', credit: own('성냥 + 불 붙는 타닥', 'Claude 재고 fx-fire-light') },
  ],
};
