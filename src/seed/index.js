// seed/index.js — 테스트용 더미 데이터 묶음
//
//  · 모듈 하나 = 저장 데이터 한 종류. 각 모듈은 { id, label, where, keys, variants, build(now, variant) } 를 내보낸다.
//    build 는 { 저장이름: 문자열 | null(지우기) } 를 돌려주는 순수 함수라 node 시험에서도 돈다 (test/seed.test.mjs).
//    IndexedDB 처럼 비동기인 것은 build 대신 apply(now, variant) 를 쓴다 (album).
//  · 새 기능에 저장 데이터가 생기면: 이 폴더에 파일 하나 + 아래 MODULES 에 한 줄. 다른 모듈은 안 건드린다.
//  · 채우기 전에 지금 기록을 통째로 한 번 백업해 두고(이미 백업이 있으면 그대로), 되돌리기로 돌아간다.
//    진짜 사진(IndexedDB)은 백업하지 않는 대신 건드리지 않는다 — 더미 사진만 seed: true 로 지운다.
//  · ⚠ 같은 주소에 게임이 열린 탭이 있으면 그 탭이 들고 있던 기록을 30초 안에 다시 저장해 덮어쓴다 (확인함 2026-10-18).
//
//  나중에 합칠 때 (지금은 main.js·index.html 을 안 건드린다 — 다른 세션 작업 중):
//   1. 설정 › 테스트 탭에 「더미 데이터」 줄: seed(...) 부르고 location.reload() — 앱 안에서 채우면 덮어쓰기 문제도 없다
//      (단 reload 전에 main.js 가 pagehide 에서 seen 을 저장하므로 away 는 reload 뒤에 다시 써야 함)
//   2. tools/deploy-demo.sh FILES 에 src/seed · seed.html 추가 (지금은 src/*.js 한 단계만 올라간다)
//   3. 출시 전 UNLOCK_ALL 끌 때 테스트 탭과 함께 숨김

import { PREFIX } from './util.js?v=v27.3.0';
import focus from './focus.js?v=v27.3.0';
import album from './album.js?v=v27.3.0';
import flock from './flock.js?v=v27.3.0';
import guests from './guests.js?v=v27.3.0';
import bottles from './bottles.js?v=v27.3.0';
import finds from './finds.js?v=v27.3.0';
import items from './items.js?v=v27.3.0';
import away from './away.js?v=v27.3.0';

export const MODULES = [focus, album, flock, guests, bottles, finds, items, away];
export const BACKUP = 'kiwi-footprints-seed.backup';

const ls = () => { try { return window.localStorage; } catch (e) { return null; } };

export function snapshot(store = ls()) {
  const out = {};
  if (!store) return out;
  for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.startsWith(PREFIX)) out[k] = store.getItem(k); }
  return out;
}
export const hasBackup = (store = ls()) => !!store?.getItem(BACKUP);

// plan: { 모듈 id: variant } → 채운 결과 요약 [{ id, variant, keys }]
export async function seed(plan, now = Date.now(), store = ls()) {
  if (!store) throw new Error('이 브라우저는 저장소를 쓸 수 없어요');
  if (!hasBackup(store)) store.setItem(BACKUP, JSON.stringify({ at: now, data: snapshot(store) }));
  const done = [];
  for (const m of MODULES) {
    const v = plan[m.id];
    if (!v) continue;
    if (m.apply) { const n = await m.apply(now, v); done.push({ id: m.id, variant: v, keys: [`사진 ${n}장`] }); continue; }
    const kv = m.build(now, v), keys = [];
    for (const [k, val] of Object.entries(kv)) {
      if (val == null) store.removeItem(PREFIX + k); else store.setItem(PREFIX + k, val);
      keys.push(k);
    }
    done.push({ id: m.id, variant: v, keys });
  }
  return done;
}

// 채우기 전으로 (더미 사진도 지움)
export async function restore(store = ls()) {
  const b = JSON.parse(store?.getItem(BACKUP) || 'null');
  if (!b) return false;
  for (const k of Object.keys(snapshot(store))) store.removeItem(k);
  for (const [k, v] of Object.entries(b.data || {})) store.setItem(k, v);
  store.removeItem(BACKUP);
  try { await album.clearSeed(); } catch (e) { /* IndexedDB 없음 */ }
  return true;
}
