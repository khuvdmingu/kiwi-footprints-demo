// A voyage stays one album record; only the currently open page owns an image URL.
import { PLACES, SIGHTS } from './voyage.js?v=v25.5.0';
import { stamp } from './album.js?v=v25.5.0';

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
  const route = shot.journey ? `${PLACES[shot.journey.from]?.ko || shot.journey.from} → ${PLACES[shot.journey.to]?.ko || shot.journey.to}` : '';
  return [
    { title: '항해의 한 장', caption: route, blob: shot.blob },
    ...(shot.journey?.sights || []).map(s => ({ title: SIGHTS[s.kind]?.ko || '잔잔한 바다', caption: `${stamp(s.ts)}${s.seen ? '' : ' · 키위가 남긴 기록'}`, blob: s.blob, text: s.blob ? '' : '사진 대신 마음에 담아 둔 풍경이에요.' })),
    ...diaryLeaves(shot.diary, diarySize).map((text, i) => ({ title: i ? '이어지는 이야기' : '키위의 항해 일기', text })),
  ];
}
export function mountJourneyBook(root, host, shot, viewer) {
  let pages = journeyPages(shot), diarySize = 90, fitting = 0;
  const diaryStart = 1 + (shot.journey?.sights?.length || 0);
  let index = 0, url = '', start = null, animation, swiped = false;
  const book = document.createElement('section'); book.className = 'journeyBook'; book.setAttribute('aria-label', '항해 수첩');
  const leaf = document.createElement('div'); leaf.className = 'journeyLeaf';
  const status = document.createElement('p'); status.className = 'journeyPageNumber'; status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
  const measure = document.createElement('p'); measure.className = 'bookWriting bookMeasure'; measure.setAttribute('aria-hidden', 'true');
  book.append(leaf, status, measure); host.append(book); root.classList.add('journal');
  const controls = [-1, 1].map(dir => {
    const b = document.createElement('button'); b.type = 'button'; b.className = `bookTurn ${dir < 0 ? 'prev' : 'next'}`;
    b.setAttribute('aria-label', dir < 0 ? '항해일지 이전 페이지' : '항해일지 다음 페이지'); b.textContent = dir < 0 ? '‹' : '›';
    b.addEventListener('click', () => turn(dir)); root.append(b); return b;
  });
  function paint(dir = 0) {
    animation?.cancel();
    // Close the enlarged image before releasing its backing URL.
    viewer.close(); if (url) URL.revokeObjectURL(url); url = ''; leaf.replaceChildren();
    const p = pages[index], title = document.createElement('h3'); title.textContent = p.title; leaf.append(title);
    if (p.blob) {
      url = URL.createObjectURL(p.blob);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bookPhoto'; b.setAttribute('aria-label', `${p.title} 전체 화면으로 보기`);
      const im = document.createElement('img'); im.src = url; im.alt = p.title;
      b.append(im); b.addEventListener('click', () => viewer.show(url, p.title)); leaf.append(b);
      const hint = document.createElement('small'); hint.textContent = '사진을 누르면 크게 볼 수 있어요'; leaf.append(hint);
    }
    if (p.text) { const text = document.createElement('p'); text.className = 'bookWriting'; text.textContent = p.text; leaf.append(text); }
    if (p.caption) { const caption = document.createElement('p'); caption.className = 'bookCaption'; caption.textContent = p.caption; leaf.append(caption); }
    status.textContent = `${index + 1} / ${pages.length} · ${p.title}`;
    controls[0].disabled = index === 0; controls[1].disabled = index === pages.length - 1;
    if (document.activeElement === controls[0] && controls[0].disabled) controls[1].focus();
    if (document.activeElement === controls[1] && controls[1].disabled) controls[0].focus();
    cancelAnimationFrame(fitting); fitting = requestAnimationFrame(fitDiary);
    if (dir && !matchMedia('(prefers-reduced-motion: reduce)').matches) animation = leaf.animate([{ opacity: 0, transform: `translateX(${dir * 12}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' });
  }
  function fitDiary() {
    if (!shot.diary) return;
    const css = getComputedStyle(measure), heading = leaf.querySelector('h3');
    const line = parseFloat(css.lineHeight), font = parseFloat(css.fontSize);
    const height = leaf.clientHeight - heading.offsetHeight - parseFloat(getComputedStyle(leaf).gap) - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
    // Reserve a full em per character: Korean and Latin both fit without clipping.
    const capacity = Math.max(16, Math.min(90, Math.floor((leaf.clientWidth - 8) / font) * Math.max(1, Math.floor(height / line))));
    if (capacity === diarySize) return;
    const offset = pages.slice(diaryStart, index).reduce((n, p) => n + Array.from(p.text).length, 0);
    diarySize = capacity; pages = journeyPages(shot, diarySize);
    if (index >= diaryStart) {
      let consumed = 0; index = diaryStart;
      while (index < pages.length - 1 && consumed + Array.from(pages[index].text).length <= offset) consumed += Array.from(pages[index++].text).length;
    }
    paint();
  }
  const resize = new ResizeObserver(() => { cancelAnimationFrame(fitting); fitting = requestAnimationFrame(fitDiary); }); resize.observe(leaf);
  function turn(dir) { const next = index + dir; if (next < 0 || next >= pages.length) return; index = next; paint(dir); }
  // Keep normal vertical gestures and avoid opening a picture after a page swipe.
  function down(e) { swiped = false; start = e.isPrimary ? { x: e.clientX, y: e.clientY } : null; }
  function up(e) {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      turn(dx < 0 ? 1 : -1);
      swiped = true;
    }
  }
  leaf.addEventListener('click', e => { if (swiped) { swiped = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  leaf.addEventListener('pointerdown', down); leaf.addEventListener('pointerup', up); leaf.addEventListener('pointercancel', () => { start = null; });
  paint();
  return { turn, destroy() { resize.disconnect(); cancelAnimationFrame(fitting); animation?.cancel(); viewer.close(); if (url) URL.revokeObjectURL(url); controls.forEach(b => b.remove()); root.classList.remove('journal'); book.remove(); } };
}
