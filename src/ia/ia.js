// src/ia/ia.js — UI 구조 개편 (가지치기, 2026-10-19 제안서 _views/html-views/2026-10-19_kiwi-ia-pruning.html)
//
//  기존 파일(index.html · main.js · style.css)을 고치지 않고, 앱이 뜬 뒤 기존 버튼·창을 새 자리로 "옮겨" 구조를 바꾼다.
//  요소를 옮겨도 붙어 있던 동작(이벤트·id 로 그리는 함수)은 그대로라 기능은 하나도 안 바뀐다.
//  최적화 작업이 끝나면 합칠 때: index.html 에 <script type="module" src="src/ia/ia.js"> 한 줄(또는 마크업 자체를 옮김) +
//  아래 「합칠 때 바꿀 것」 표시한 우회(버튼을 대신 눌러 그리게 하는 곳)를 main.js 의 함수 호출로 바꾼다.
//
//  바뀌는 것
//   · 화면 위: [글 모드·날씨·시점] → [글 모드·날씨], 소리 → ⋯ 메뉴 첫 줄, 새 「바구니」 버튼
//   · 바구니: 모은 것 9묶음을 탭 5(사진 · 편지 · 키위 · 장소·소리 · 도감)로 — 소리 묶음도 이리로 (집중 기록·달력은 집중 창에 펼쳐 둠)
//   · 설정: 풍경(장소·시간대·시점·키위 수) / 시계·메모(시간 메모·시계·벽시계) / 화면(창 모양·이름·화면 정리) / 테스트
//   · 소리 창: 크기 · 곡 (발자국·배경 묶음은 바구니)
//   · 집중 창: ① 섬/항해 → 시간 → 시작 ② 더 보기(집중 중 소리 · 한 줄 다짐 · 숨 고르기 · 규칙)
//   · 메뉴: 소리(+ 바로 켜고 끄기) · 설정 · 작품 설명
//   · 키보드 단축키(H·M·W·V·T) 없앰 — 손가락 앱이라 (사용자 2026-10-19). Esc 로 창 닫기는 남김. 합칠 때 main.js 의 단축키 코드를 지운다

const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (html) e.innerHTML = html; return e; };

// 한 창의 내용을 h2 제목마다 묶음으로 자른다 (제목 앞 내용은 head)
function sections(pane) {
  const out = { head: [], list: [] };
  let cur = null;
  for (const n of [...pane.children]) {
    if (n.tagName === 'H2') { cur = { h: n, nodes: [n] }; out.list.push(cur); }
    else if (cur) cur.nodes.push(n); else out.head.push(n);
  }
  return out;
}
const byTitle = (secs, re) => secs.list.find(s => re.test(s.h.id || '') || re.test(s.h.textContent.trim()));
const move = (nodes, to) => { for (const n of nodes) to.append(n); };
const firstSep = h => { h.classList.remove('sep'); return h; };

export function mountIA() {
  if (document.body.dataset.ia) return;
  document.body.dataset.ia = '1';
  const corner = document.querySelector('.corner'), grp = corner.querySelector('.grp');
  const menu = $('menu'), settings = $('settings'), mixer = $('mixer'), focusPanel = $('focusPanel');
  const soundBtn = $('soundBtn'), viewBtn = $('viewBtn'), menuBtn = $('menuBtn');
  const pane = n => settings.querySelector(`.pane[data-pane="${n}"]`), tab = n => settings.querySelector(`[role="tab"][data-tab="${n}"]`);

  // ── 바구니 창 (설정 창과 같은 틀) ──
  const TABS = [['photo', '사진'], ['letter', '편지'], ['kiwi', '키위'], ['world', '장소·소리'], ['dex', '도감']];
  const basket = el('div', { id: 'basket', role: 'dialog', 'aria-label': '바구니', hidden: '' });
  const tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': '바구니 묶음' });
  const panes = {};
  for (const [id, name] of TABS) {
    const b = el('button', { type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': 'false' }); b.textContent = name; tabs.append(b);
    panes[id] = el('section', { class: 'pane', 'data-pane': id, role: 'tabpanel', 'aria-label': name, hidden: '' });
  }
  basket.append(tabs, ...Object.values(panes));
  settings.after(basket);

  // 모은 것 → 바구니
  const bag = sections(pane('bag'));
  const sum = $('colTitle'); if (sum) basket.insertBefore(sum, tabs);
  const put = (re, to, first) => { const s = byTitle(bag, re); if (!s) return; if (first) firstSep(s.h); move(s.nodes, panes[to]); };
  put(/shotTitle|집중 사진/, 'photo', true);
  put(/letterTitle|편지/, 'letter', true);
  put(/flockTitle|내 키위/, 'kiwi', true);
  put(/wearTitle|옷/, 'kiwi');
  put(/placeTitle|^장소/, 'world', true);
  put(/findTitle|주운 것/, 'dex', true);
  put(/바꾸기/, 'dex');
  put(/guestTitle|손님/, 'dex');
  // 중복(소리 요약)은 화면에서 뺀다 — main.js 의 그리는 함수가 이 칸(#soundSum · #toMixer)을 찾으므로 지우지 않고 숨겨 둔다 (합칠 때 함수와 함께 정리)
  const soundSec = byTitle(bag, /soundTitle|^소리/);
  if (soundSec) { const keep = el('div', { hidden: '', 'data-ia-keep': '' }); move(soundSec.nodes, keep); basket.append(keep); }
  // 집중 기록 · 달력 → 바구니 › 사진 위
  // 집중 기록(통계·달력)은 집중 창에 그대로 두고 펼쳐서 보인다 — 바구니 › 사진은 사진·앨범만 (사용자 2026-10-19: 접지 말고 바로 보이게)
  $('focusStats')?.before(el('h2', { class: 'sub ia-rec-h' }, '이번 달 기록'));
  // 소리 묶음(키위 소리·발자국·찾았을 때·자연 배경) → 바구니 › 장소·소리
  const bed = mixer.querySelector('.pane[data-pane="bed"]');
  if (bed) { const h = el('h2', { class: 'sep' }, '모은 소리'); panes.world.append(h, ...[...bed.children]); mixer.querySelector('[role="tab"][data-tab="bed"]')?.setAttribute('hidden', ''); }

  // 바구니 탭
  const showTab = id => {
    for (const b of tabs.children) { const on = b.dataset.tab === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
    for (const [k, p] of Object.entries(panes)) p.hidden = k !== id;
    basket.scrollTop = 0; try { localStorage.setItem('kiwi-footprints.tab.basket', id); } catch (e) {}
  };
  tabs.addEventListener('click', e => { const b = e.target.closest('[role="tab"]'); if (b) showTab(b.dataset.tab); });
  tabs.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = [...tabs.children], i = bs.findIndex(b => b.getAttribute('aria-selected') === 'true'), n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
    showTab(n.dataset.tab); n.focus(); e.preventDefault();
  });
  let saved = null; try { saved = localStorage.getItem('kiwi-footprints.tab.basket'); } catch (e) {}
  showTab(TABS.some(t => t[0] === saved) ? saved : 'photo');

  // 바구니 버튼 (메뉴 버튼 앞)
  const basketBtn = el('button', { id: 'basketBtn', type: 'button', class: 'round', 'aria-label': '바구니 — 사진 · 편지 · 키위 · 장소·소리 · 도감', 'aria-expanded': 'false', 'aria-controls': 'basket' },
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5h17" /><path d="M5 10.5l1.4 7.9a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6l1.4-7.9" /><path d="M7.6 10.5a4.4 4.9 0 0 1 8.8 0" /><path d="M5.9 14.5h12.2M10.2 10.5l.4 9.5M13.8 10.5l-.4 9.5" /></svg>');
  corner.insertBefore(basketBtn, menuBtn);
  const openBasket = open => {
    if (open) {
      // 합칠 때 바꿀 것: 아래 두 줄은 main.js 의 paintCollection() · paintPacks() 를 대신 부르려고 기존 버튼을 눌러 그리게 하는 우회
      const keepTab = settings.querySelector('[role="tab"][aria-selected="true"]')?.dataset.tab;
      $('bagBtn').click(); settings.hidden = true; $('setBtn').setAttribute('aria-expanded', 'false'); if (keepTab) tab(keepTab)?.click();
      const keepMix = mixer.querySelector('[role="tab"][aria-selected="true"]')?.dataset.tab;
      $('toMixer')?.click(); mixer.hidden = true; soundBtn.setAttribute('aria-expanded', 'false'); if (keepMix) mixer.querySelector(`[role="tab"][data-tab="${keepMix}"]`)?.click();
      for (const p of [focusPanel, menu, $('picker')]) if (p && !p.hidden) p.hidden = true;
    }
    basket.hidden = !open; basketBtn.setAttribute('aria-expanded', String(open));
    if (open) tabs.querySelector('[aria-selected="true"]')?.focus();
  };
  basketBtn.addEventListener('click', () => openBasket(basket.hidden));
  // 다른 창을 열면 바구니는 닫힌다 · 바깥을 누르거나 Esc 로 닫힌다 (카드·사진 보기 위에서 누른 건 바깥이 아님)
  document.addEventListener('pointerdown', e => {
    if (basket.hidden) return;
    const t = e.target;
    if (basket.contains(t) || basketBtn.contains(t) || t.closest?.('#found, #picker, #photoViewer, .journey-book, [role="dialog"][aria-modal="true"]')) return;
    openBasket(false);
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !basket.hidden && $('found')?.hidden !== false) { openBasket(false); basketBtn.focus(); } });
  // 바구니를 보는 동안엔 버튼 자동 숨김이 끼어들지 않게 (자동 숨김은 움직임이 없으면 동작 — 합칠 때 burnTick 의 열린 창 목록에 #basket 추가)
  setInterval(() => { if (!basket.hidden) dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch' })); }, 20000);
  // 메뉴의 「모은 것」은 바구니 버튼이 대신한다
  $('bagBtn').hidden = true;

  // ── 화면 위: 시점은 설정으로, 소리는 메뉴로 ──
  const sceneSecs = sections(pane('scene'));
  // 진짜 시점 버튼은 위 모서리에 보이지 않게 남겨 둔다 — 고르기 창이 그 자리(메뉴 버튼 아래)에 뜨고, 설정 창은 고르기 창이 알아서 닫는다
  corner.append(viewBtn); viewBtn.classList.add('ia-ghost'); viewBtn.tabIndex = -1; viewBtn.setAttribute('aria-hidden', 'true');
  const viewRow = el('div', { class: 'ia-row' });
  const viewH = el('h2', { class: 'sep' }, '시점');
  const NAMES = { top: '위에서', diorama: '디오라마', follow: '따라가기', scope: '쌍안경', text: '글자 보기', breeze: '바람결' };
  const viewPick = el('button', { type: 'button', class: 'ia-pick', 'aria-haspopup': 'dialog' });
  viewRow.append(viewPick);
  const paintView = () => {
    const v = document.body.dataset.view, svg = viewBtn.querySelector('svg').cloneNode(true);
    svg.querySelectorAll(':scope > g[class]').forEach(g => { if (g.getAttribute('class') !== 'v-' + v) g.remove(); else g.style.display = 'inline'; });
    svg.dataset.ico = 'v-' + v;
    viewPick.textContent = ''; viewPick.append(svg, el('span', {}, NAMES[v] || v), el('small', {}, '눌러서 바꾸기'));
  };
  viewPick.addEventListener('click', () => viewBtn.click());
  new MutationObserver(paintView).observe(document.body, { attributes: true, attributeFilter: ['data-view'] }); paintView();
  // 시간대 묶음 뒤에 시점
  const lightSec = byTitle(sceneSecs, /시간대/); (lightSec ? lightSec.nodes.at(-1) : pane('scene').lastElementChild).after(viewH, viewRow);
  if (!grp.children.length) grp.hidden = true;

  // 소리 → 메뉴 첫 줄 (+ 바로 켜고 끄기)
  const sndRow = el('div', { class: 'ia-menurow', role: 'none' });
  soundBtn.classList.remove('round'); soundBtn.setAttribute('role', 'menuitem');
  const lbl = el('span', {}, '소리'), small = el('small', {}, '크기 · 곡');
  soundBtn.append(lbl, small);
  const mute = el('button', { type: 'button', class: 'ia-mute', role: 'menuitemcheckbox', 'aria-label': '소리 켜기/끄기' });
  const mixOn = $('mixOn');
  const paintMute = () => { mute.setAttribute('aria-checked', String(mixOn.checked)); mute.textContent = mixOn.checked ? '켜짐' : '꺼짐'; };
  mute.addEventListener('click', e => { e.stopPropagation(); mixOn.checked = !mixOn.checked; mixOn.dispatchEvent(new Event('change', { bubbles: true })); paintMute(); });
  mixOn.addEventListener('change', paintMute); paintMute();
  sndRow.append(soundBtn, mute);
  menu.prepend(sndRow);
  menuBtn.setAttribute('aria-label', '메뉴 — 소리 · 설정 · 작품 설명');

  // ── 설정 재편: 풍경 / 시계·메모 / 화면 / 테스트 ──
  const write = pane('write'), shell = pane('bag');
  shell.textContent = '';
  const wSecs = sections(write);
  // 키위 수 → 풍경 (시점 다음)
  const kiwi = byTitle(wSecs, /키위 수/); if (kiwi) { kiwi.h.classList.add('sep'); viewRow.after(...kiwi.nodes); }
  // 키위 수 5단계 → 조금 · 보통 · 많이 · 직접 (한 마리는 직접 막대에서 1) — 이미 「한 마리」를 고른 기기는 그대로 보이게 둔다
  const one = settings.querySelector('input[name="kiwis"][value="one"]');
  if (one && !one.checked) { one.closest('label').classList.add('ia-off'); one.closest('.seg')?.classList.replace('five', 'four'); }
  // 창 모양 → 화면, 이름 → 화면, 화면 정리 → 화면
  const theme = byTitle(sceneSecs, /창 모양/); if (theme) { firstSep(theme.h); move(theme.nodes, shell); }
  const name = byTitle(wSecs, /이름/); if (name) { name.h.classList.add('sep'); move(name.nodes, shell); }
  const cleanH = el('h2', { class: 'sep' }, '화면 정리');
  const cleanBtn = $('cleanBtn'); cleanBtn.removeAttribute('role'); cleanBtn.classList.add('ia-wide');
  const cleanHint = el('p', { class: 'hint' }, '버튼과 입력창을 숨기고 그림만 남겨요. 한동안 안 건드리면 버튼은 저절로도 숨어요.');
  shell.append(cleanH, cleanBtn, cleanHint);
  // 남은 글씨 탭 = 시간 메모 · 시계 → 시계·메모 (시간 메모를 맨 앞으로)
  const memo = byTitle(wSecs, /시간 메모/); if (memo) { firstSep(memo.h); write.prepend(...memo.nodes); }
  const clock = byTitle(wSecs, /시계/); if (clock) clock.h.classList.add('sep');
  tab('write').textContent = '시계·메모'; write.setAttribute('aria-label', '시계·메모');
  tab('bag').textContent = '화면'; shell.setAttribute('aria-label', '화면');
  // 메뉴 「설정」 설명
  const setSmall = $('setBtn').querySelector('small'); if (setSmall) setSmall.textContent = '풍경 · 시계·메모 · 화면';

  // ── 소리 창: 크기 · 곡 ── (발자국·배경 탭은 위에서 숨김)

  // ── 집중 창: ① 고르고 시작 ② 더 보기 ──
  const idle = focusPanel.querySelector('.idle'), start = $('focusStart');
  const hushH = [...idle.querySelectorAll('h2.sub')].find(h => /소리/.test(h.textContent));
  if (hushH && start) {
    // 한 줄은 시작 바로 위에 — 이 한 줄이 끝난 뒤 모래 글씨·사진(스냅샷)이 되므로 꼭 거치게 하되, 비워도 시작된다
    const ta = $('focusLetter'), taNote = ta?.nextElementSibling?.matches('p.note') ? ta.nextElementSibling : null;
    const more = el('details', { class: 'ia-more' }); const sm = el('summary', {}, '더 보기 <small>집중 중 소리 · 숨 고르기 · 규칙</small>'); more.append(sm);
    let n = hushH; const rest = [];
    while (n) { const nx = n.nextElementSibling; if (n !== start && n !== ta && n !== taNote) rest.push(n); n = nx; }
    hushH.before(start);
    if (ta) {
      const h = el('h2', { class: 'sub ia-letter-h' }, '오늘의 한 줄 <small>사진에 남아요</small>');
      ta.placeholder = '예) 포트폴리오 정리 (안 써도 돼요)';
      ta.setAttribute('aria-label', '오늘의 한 줄 — 끝까지 하면 키위들이 모래에 쓰고 사진으로 남겨요');
      const note = taNote || el('p', { class: 'note' });
      note.classList.add('ia-snap');
      note.innerHTML = '끝까지 하면(항해는 도착하면) 키위들이 이 한 줄과 날짜를 <b>모래에 쓰고 사진 한 장</b>으로 남겨요. 며칠 뒤엔 호박색 병에 담겨 돌아와요. <span>비워 두면 「집중 ○분」이라고 써요 · 모래엔 앞의 14자까지</span>';
      start.before(h, ta, note);
    }
    move(rest, more); start.after(more);
    try { more.open = localStorage.getItem('kiwi-footprints.ia.more') === '1'; } catch (e) {}
    more.addEventListener('toggle', () => { try { localStorage.setItem('kiwi-footprints.ia.more', more.open ? '1' : '0'); } catch (e) {} });
  }

  // ── 키보드 단축키 없앰: 글을 쓰는 중이 아니면 H·M·W·V·T(두벌식 자판 포함)를 앱이 받기 전에 막는다 ──
  const KEYS = new Set(['h', 'm', 'w', 'v', 't', 'ㅗ', 'ㅡ', 'ㅈ', 'ㅍ', 'ㅅ']);
  addEventListener('keydown', e => {
    if (e.target.matches?.('input, textarea, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (KEYS.has(String(e.key).toLowerCase())) e.stopImmediatePropagation();
  }, true);
  for (const k of document.querySelectorAll('#info kbd, #menu kbd')) k.remove();
  const stripKey = b => { const a = b.getAttribute('aria-label'); if (a && /\s*\([A-Z] 키\)/.test(a)) b.setAttribute('aria-label', a.replace(/\s*\([A-Z] 키\)/, '')); };
  const hideBtn = $('hideBtn'); stripKey(hideBtn); new MutationObserver(() => stripKey(hideBtn)).observe(hideBtn, { attributes: true, attributeFilter: ['aria-label'] });

  // 작품 설명의 「위쪽 버튼」 목록 바로잡기
  const info = $('info');
  if (info) {
    const li = id => info.querySelector(`[data-icon="${id}"]`)?.closest('li');
    li('viewBtn')?.querySelector('span')?.insertAdjacentText('beforeend', ' — 설정 › 풍경');
    li('soundBtn')?.querySelector('span')?.insertAdjacentText('beforeend', ' — ⋯ 메뉴');
    const m = li('menuBtn')?.querySelector('span'); if (m) m.textContent = '소리 · 설정(풍경 · 시계·메모 · 화면) · 작품 설명';
    const focusLi = li('focusBtn');
    if (focusLi) {
      const b = el('li', {}, '<i></i><b>바구니</b><span>사진 · 편지 · 키위 · 장소·소리 · 도감</span>');
      b.querySelector('i').append(basketBtn.querySelector('svg').cloneNode(true)); b.querySelector('i').dataset.icon = 'basketBtn';
      focusLi.after(b);
    }
    for (const p of info.querySelectorAll('p, li span')) p.innerHTML = p.innerHTML.replace(/\s*\(?T 키로[^)·.]*\)?/g, '');
  }

  return { basket, openBasket, showTab };
}

// 스타일
if (!document.querySelector('link[data-ia]') && new URLSearchParams(location.search).get('ia') !== '0') {
  const v = new URL(import.meta.url).search;   // 배포 버전 꼬리표(?v=)를 CSS 에도
  for (const f of ['basket-gen.css', 'ia.css']) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL(f, import.meta.url).href + v; l.dataset.ia = '1'; document.head.append(l); }
}
// ?ia=0 이면 개편 없이 원래 구조 (비교용)
if (new URLSearchParams(location.search).get('ia') !== '0') mountIA();
