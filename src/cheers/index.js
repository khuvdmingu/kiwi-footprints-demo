// cheers/index.js — 초록 병 응원 쪽지 (v20 → v29.25 성격별 → v29.27 성격마다 파일 하나)
//
//  쪽지 한 장 = { id, th, t, tag?, by? }  — 성격(p)은 파일이 정한다 (아래에서 붙인다)
//   id   한 번 쓰면 바꾸거나 다시 쓰지 않는다. 뺀 쪽지도 번호는 비워 둔다 (받은 쪽지함 · 본 기록이 id 로 이어진다).
//        새 쪽지는 성격 접두 + 3자리: 토닥이 t · 차분이 w · 허당 h · 박사 b (예: t104). 예전 번호(c01·n01…)는 그대로 둔다.
//   th   주제 — 같은 주제가 연달아 오지 않게 고른다 (THEMES)
//   t    본문 — 병 카드에 들어가게 MAX_LEN 자 안
//   tag  상황: night · morning · rain · snow · focus(방금 집중 끝) · long(오래 켜 둠) · 없음 = 언제나
//   by   이름이 박힌 쪽지 = 가끔 오는 손님 키위 (무리 키위 서명으로 바꾸지 않는다)
//  쓰는 법: 성격마다 50장씩 묶어 쓰고 test/cheers-lint.test.mjs(번호·길이·말투·겹침·금지 소재)를 통과한 것만 넣는다.
//          사용자는 쪽지를 미리 읽지 않고 실제로 받아 본다 — 테스트 탭 「좋아요/별로」 모음으로 고친다.

import todak from './todak.js';
import jan from './jan.js';
import hd from './hd.js';
import bs from './bs.js';

export const THEMES = {
  praise: '칭찬', comfort: '위로', pace: '천천히·한 걸음', rest: '쉼·잠', care: '몸 챙기기',
  write: '글씨·모래', sea: '바다·물', body: '키위 몸·생태', mates: '무리·이웃', oops: '실수',
};
export const ID_PREFIX = { todak: 't', jan: 'w', hd: 'h', bs: 'b' };
export const MAX_LEN = 90;
export const BANNED = ['벌레', '지렁이', '모기', '파리', '개미', '바퀴', '구더기', 'MBTI'];   // 키위 세계 금지 소재 (반딧불·나비는 예외로 허용)

export const CHEERS = [
  ...todak.map(c => ({ ...c, p: 'todak' })),
  ...jan.map(c => ({ ...c, p: 'jan' })),
  ...hd.map(c => ({ ...c, p: 'hd' })),
  ...bs.map(c => ({ ...c, p: 'bs' })),
];
