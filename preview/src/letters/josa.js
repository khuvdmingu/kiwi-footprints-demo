// letters/josa.js — 받침 따라 을/를 · 이/가 · (으)로 (한국어 전용 — 다른 언어는 그 언어 파일이 따로 맡는다)
const code = w => w.charCodeAt(w.length - 1) - 0xac00;
const jong = w => { const c = code(w); return c >= 0 && c < 11172 && c % 28 > 0; };
export const eul = w => w + (jong(w) ? '을' : '를');
export const iga = w => w + (jong(w) ? '이' : '가');
export const ro = w => { const c = code(w), j = c >= 0 && c < 11172 ? c % 28 : 0; return w + (j && j !== 8 ? '으로' : '로'); };
