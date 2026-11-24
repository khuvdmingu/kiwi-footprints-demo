// config.js — 테스트 기간 설정
//  UNLOCK_ALL: 옷·장소·소리·곡·주운 것 도감을 전부 열어 둔다 (사용자 2026-10-10 "지금은 테스트니까 다 열려 있게").
//   모으는 기록은 그대로 쌓이고, 유리병·상자·소라도 여전히 떠내려온다 — 열어 두는 것은 "고르고 입고 듣는 것"만.
//   출시 전에 false 로 바꾼다. 주소에 ?all=0 을 붙이면 지금도 잠긴 상태로 볼 수 있다.
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const UNLOCK_ALL = q.has('all') ? q.get('all') !== '0' : true;
//  MOMENTS_ON: v28.21 드문 순간(섬을 오래 보면 가끔 나오는 영상 장면). 2026-11-01 사용자 "퀄리티가 별로라 일단 빼 두자"로 꺼 둠.
//   ⚠ 런칭 전 점검 항목 — 다시 넣을지 사용자에게 꼭 물어본다 (docs/WORKSTREAMS.md 「나중에 할 것」). 코드·그림은 그대로 둔다.
//   ?moment=<id> 미리 보기는 꺼져 있어도 된다(점검용).
export const MOMENTS_ON = false;
