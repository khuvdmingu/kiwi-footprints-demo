// seed/flock.js — 나의 키위 무리 (저장 이름: flock)
//
//  보이는 곳: 모은 것 › 나의 무리 (이름표·옷 고르기) · 화면 키위 머리 위 이름.
//  · 보통: 12마리, 옷 섞음(auto·맨몸·모자·목도리 등), 마지막 방문 = 어제 → 열면 13번째가 들어오는 장면까지 확인
//  · 가득: 30마리(최대) → 더는 안 들어옴 · 목록이 길 때 스크롤
//  · 한 마리: 처음 연 사람 화면

import { at, dayKey } from './util.js?v=v29.4.1';

const NAMES = ['콩', '보리', '모래', '솔', '도토리', '밤톨', '조약돌', '이슬', '구름', '호두', '쑥', '깨', '율무', '달래', '노을',
  '물결', '소라', '고둥', '미역', '자갈', '잎새', '이끼', '버섯', '땅콩', '완두', '메밀', '토란', '수수', '새싹', '별'];
const WEARS = ['auto', 'auto', 'none', 'hat', 'scarf', 'crown', 'glasses', 'backpack', 'beanie', 'sweater', 'auto', 'santa'];

export function build(now = Date.now(), variant = 'rich') {
  if (variant === 'none') return { flock: null };
  const n = variant === 'full' ? 30 : variant === 'one' ? 1 : 12;
  const members = [];
  for (let i = 0; i < n; i++) {
    const ago = Math.round((n - i) * (variant === 'full' ? 2 : 3));   // 들어온 날: 오래된 것부터
    members.push({ id: 'k' + (i + 1), name: NAMES[i], day: dayKey(at(now, ago)), wear: WEARS[i % WEARS.length] });
  }
  // 이름이 긴 키위 하나 (이름표 넘침 확인, 최대 8글자)
  if (n >= 12) members[11].name = '도토리묵무침';
  const last = variant === 'rich' ? dayKey(at(now, 1)) : dayKey(now);
  return { flock: JSON.stringify({ members, last, seq: n }) };
}

export default {
  id: 'flock', label: '나의 키위 무리', where: '모은 것 › 나의 무리 · 키위 이름표',
  keys: ['flock'],
  variants: { rich: '12마리 (열면 1마리 더 옴)', full: '30마리 가득', one: '1마리', none: '비우기' },
  build,
};
