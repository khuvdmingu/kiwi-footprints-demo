// Voyage reader: result first, then each image and its record on the same page.
import { PLACES, SIGHTS } from './voyage.js?v=v29.4.5';
import { stamp } from './album.js?v=v29.4.5';
import { pickIllus, arriveIllus } from './illus.js?v=v29.4.5';   // v28.18 키위가 그린 그림

export function diaryLeaves(text, size = 90) {
  const chars = Array.from(text || ''), leaves = [];
  for (let i = 0; i < chars.length;) {
    let end = Math.min(i + size, chars.length);
    if (end < chars.length) {
      // Prefer a sentence/word boundary without dropping spaces or punctuation.
      for (let j = end; j > i + size / 2; j--) {
        if (/[.!?。！？\s]/u.test(chars[j - 1])) { end = j; break; }
      }
    }
    leaves.push(chars.slice(i, end).join('')); i = end;
  }
  return leaves;
}
export function journeyPages(shot, diarySize = 90) {
  const sights = shot.journey?.sights || [];
  const route = shot.journey ? `${PLACES[shot.journey.from]?.ko || shot.journey.from} → ${PLACES[shot.journey.to]?.ko || shot.journey.to}` : '';
  const pages = [{ key: 'result', title: '항해 전체 결과', caption: route, blob: shot.blob, summary: true,
    stats: [shot.min ? `${shot.min}분 집중` : '', shot.nm ? `${shot.nm.toFixed(1)}해리` : '', sights.length ? `풍경 ${sights.length}장` : ''].filter(Boolean) }];
  // Same selection rule as Voyage.complete(): the saved diary belongs to this event.
  const real = sights.filter(s => s.kind !== 'quiet');
  const primary = real.find(s => !s.seen) || real[0] || sights[0];
  const records = sights.length ? sights : [{ kind: 'quiet', ts: shot.at, seen: true, blob: shot.blob }];
  for (const [i, sight] of records.entries()) {
    const name = SIGHTS[sight.kind]?.ko || '잔잔한 바다';
    const isDiary = !sights.length || sight === primary;
    const text = isDiary && shot.diary ? shot.diary : (sight.seen ? '항해 중 함께 바라본 풍경이에요.' : '자리를 비운 동안 키위가 남겨 둔 기록이에요.');
    const chunks = diaryLeaves(text, diarySize);
    for (const [part, text] of chunks.entries()) pages.push({ key: `scene-${i}`, part, text,
      title: (sights.length ? name : '키위의 항해 일기') + (part ? ' · 이어서' : ''),
      caption: [stamp(sight.ts || shot.at), sight.blob ? '' : '사진 대신 남긴 기록'].filter(Boolean).join(' · '),
      blob: sight.blob || shot.blob, fallback: !sight.blob && !!sights.length,
    });
    // v28.18 그 사건을 키위가 그린 그림 한 쪽 (항해 기록에만 — 예전 기록은 그대로)
    const pic = shot.journey && pickIllus(sight.kind || 'quiet', `${sight.kind}:${sight.ts || shot.at}`);
    if (pic) pages.push({ key: `illus-${i}`, title: `${name} · 키위의 그림`, caption: '키위가 일지 한쪽에 그려 둔 그림', src: pic });
  }
  if (shot.journey) pages.push({ key: 'arrive', title: `${PLACES[shot.journey.to]?.ko || '섬'}에 닿았다`, caption: '키위가 일지 끝에 그려 둔 그림', src: arriveIllus(shot.journey.to) });
  return pages;
}
export function mountJourneyBook(root, host, shot, viewer) {
  const compact = matchMedia('(orientation: landscape) and (max-height: 360px)');
  let pages = journeyPages(shot, compact.matches ? 50 : 90);
  let index = 0, url = '', start = null, animation, swiped = false;
  const book = document.createElement('section'); book.className = 'journeyBook'; book.setAttribute('aria-label', '항해 수첩');
  const leaf = document.createElement('div'); leaf.className = 'journeyLeaf'; book.append(leaf); host.append(book); root.classList.add('journal');
  const nav = document.createElement('nav'); nav.className = 'bookNavigation'; nav.setAttribute('aria-label', '항해일지 페이지');
  const status = document.createElement('span'); status.className = 'journeyPageNumber'; status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
  const controls = [-1, 1].map(dir => {
    const b = document.createElement('button'); b.type = 'button'; b.className = `bookTurn ${dir < 0 ? 'prev' : 'next'}`;
    b.setAttribute('aria-label', dir < 0 ? '항해일지 이전 페이지' : '항해일지 다음 페이지');
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir < 0 ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'}"/></svg>`;
    b.addEventListener('click', () => turn(dir)); return b;
  });
  nav.append(controls[0], status, controls[1]); root.append(nav);
  function paint(dir = 0) {
    animation?.cancel(); viewer.close(); if (url) URL.revokeObjectURL(url); url = ''; leaf.replaceChildren();
    const p = pages[index]; leaf.classList.toggle('summary', !!p.summary);
    const heading = document.createElement('h3'); heading.textContent = p.title; leaf.append(heading);
    if (p.src && !p.blob) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bookPhoto drawn'; b.setAttribute('aria-label', `${p.title} 크게 보기`);
      const im = document.createElement('img'); im.src = 'assets/' + p.src; im.alt = p.title;
      b.append(im); b.addEventListener('click', () => viewer.show(im.src, im.alt)); leaf.append(b);
    }
    if (p.blob) {
      url = URL.createObjectURL(p.blob);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bookPhoto'; b.setAttribute('aria-label', `${p.title} 전체 화면으로 보기`);
      const im = document.createElement('img'); im.src = url; im.alt = p.fallback ? '도착한 날' : p.title;
      const hint = document.createElement('span'); hint.className = 'bookPhotoHint'; hint.textContent = p.fallback ? '도착한 날 · 크게 보기' : '원본 크게 보기';
      b.append(im, hint); b.addEventListener('click', () => viewer.show(url, im.alt)); leaf.append(b);
    }
    const copy = document.createElement('div'); copy.className = 'bookCopy';
    if (p.text) { const text = document.createElement('p'); text.className = 'bookWriting'; text.textContent = p.text; copy.append(text); }
    if (p.caption) { const caption = document.createElement('p'); caption.className = 'bookCaption'; caption.textContent = p.caption; copy.append(caption); }
    if (p.stats?.length) { const stats = document.createElement('p'); stats.className = 'bookStats'; stats.textContent = p.stats.join(' · '); copy.append(stats); }
    leaf.append(copy);
    status.textContent = `${index + 1} / ${pages.length}`;
    controls[0].disabled = index === 0; controls[1].disabled = index === pages.length - 1;
    if (document.activeElement === controls[0] && controls[0].disabled) controls[1].focus();
    if (document.activeElement === controls[1] && controls[1].disabled) controls[0].focus();
    if (dir && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const css = getComputedStyle(root);
      animation = leaf.animate([{ opacity: 0, transform: `translateX(${dir * parseFloat(css.getPropertyValue('--book-space'))}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: parseFloat(css.getPropertyValue('--book-motion-ms')), easing: css.getPropertyValue('--ease').trim() });
    }
  }
  function turn(dir) { const next = index + dir; if (next < 0 || next >= pages.length) return; index = next; paint(dir); }
  leaf.addEventListener('pointerdown', e => { swiped = false; start = e.isPrimary ? { x: e.clientX, y: e.clientY } : null; });
  leaf.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { turn(dx < 0 ? 1 : -1); swiped = true; }
  });
  leaf.addEventListener('pointercancel', () => { start = null; });
  leaf.addEventListener('click', e => { if (swiped) { swiped = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  function reflow() {
    const current = pages[index], offset = pages.slice(0, index).filter(p => p.key === current.key).reduce((n, p) => n + Array.from(p.text || '').length, 0);
    pages = journeyPages(shot, compact.matches ? 50 : 90);
    index = pages.findIndex(p => p.key === current.key); let consumed = 0;
    if (index < 0) index = 0;
    while (index < pages.length - 1 && pages[index + 1].key === current.key && consumed + Array.from(pages[index].text || '').length <= offset) consumed += Array.from(pages[index++].text || '').length;
    paint();
  }
  compact.addEventListener('change', reflow);
  paint();
  return { turn, destroy() { compact.removeEventListener('change', reflow); animation?.cancel(); viewer.close(); if (url) URL.revokeObjectURL(url); nav.remove(); root.classList.remove('journal'); book.remove(); } };
}
