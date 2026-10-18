// album-view.js — v23.2 사진 앨범 보기 · 공유
//
//  · 묶기: 최근 몇 장은 지금처럼 폴라로이드로 펼치고, 나머지는 달별 카드 묶음으로 접는다 (사진이 수백 장이 돼도 창이 가볍게).
//  · 공유 카드: 사진 아래에 이유·날짜·집중 시간을 적은 폴라로이드 한 장(JPEG — 메신저·SNS 가 webp 를 못 받는 경우가 있어서).
//  · 공유: 폰의 공유 창(Web Share)으로 다른 앱에 파일을 넘긴다. 서버로 보내는 것 없음. 공유 창이 없는 브라우저는 내려받기.
//  groupShots 는 DOM 없이 돌아서 node 시험에서 그대로 쓴다.

import { photoDate, PHOTO_MONTHS } from './album.js?v=v25.3.0';

export const RECENT = 6;

const monthKey = ms => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}`; };
export function monthLabel(ms, now = Date.now()) {
  const d = new Date(ms);
  return `${PHOTO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// list: 최신순 사진 → { recent: [..최근 n장], months: [{ key, label, shots, start }] }
//  start = 전체 목록에서 그 달 첫 사진의 자리 (크게 보기에서 이어서 넘기려고)
export function groupShots(list, now = Date.now(), n = RECENT) {
  const recent = list.slice(0, n), months = [];
  for (let i = n; i < list.length; i++) {
    const s = list[i], key = monthKey(s.at);
    let g = months[months.length - 1];
    if (!g || g.key !== key) months.push(g = { key, label: monthLabel(s.at, now), shots: [], start: i });
    g.shots.push(s);
  }
  return { recent, months };
}

// 공유 카드: 사진 + 아래 띠(이유 · 날짜 · 몇 분 집중 · 발자국 한글) → Promise<Blob(JPEG)>
export async function shareCard(shot, font = 'sans-serif') {
  const bmp = await createImageBitmap(shot.blob);
  const W = 1200, pad = 44, pw = W - pad * 2, ph = Math.round(pw * bmp.height / bmp.width), band = 200;
  const H = pad + ph + band;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fffdf7'; g.fillRect(0, 0, W, H);
  g.drawImage(bmp, pad, pad, pw, ph); bmp.close?.();
  g.strokeStyle = 'rgba(60, 40, 20, 0.08)'; g.lineWidth = 2; g.strokeRect(pad, pad, pw, ph);
  const y0 = pad + ph;
  g.fillStyle = '#3a2c1c'; g.textBaseline = 'alphabetic';
  g.font = `600 54px ${font}`;
  g.fillText(fit(g, shot.reason || '집중', pw - 10), pad + 6, y0 + 92);
  g.fillStyle = '#8a6a48'; g.font = `400 36px ${font}`;
  const meta = [photoDate(shot.at), shot.min ? `${shot.min}분 집중` : ''].filter(Boolean).join(' · ');
  g.fillText(meta, pad + 6, y0 + 150);
  g.textAlign = 'right'; g.fillStyle = '#b39a7a'; g.font = `500 30px ${font}`;
  g.fillText('발자국 한글', W - pad - 6, y0 + 150);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('카드 실패'))), 'image/jpeg', 0.9));
}
function fit(g, text, max) {
  if (g.measureText(text).width <= max) return text;
  let t = text; while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

// 공유 창으로 넘기기 → 'shared' | 'cancel' | 'download'
export async function shareFile(blob, name, title = '') {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }   // 그 밖의 실패는 내려받기로
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'download';
}
