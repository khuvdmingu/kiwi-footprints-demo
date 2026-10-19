// src/ia/ia.js — UI 구조 개편 (가지치기, 2026-10-19 제안서 _views/html-views/2026-10-19_kiwi-ia-pruning.html)
//
//  기존 파일(index.html · main.js · style.css)을 고치지 않고, 앱이 뜬 뒤 기존 버튼·창을 새 자리로 "옮겨" 구조를 바꾼다.
//  요소를 옮겨도 붙어 있던 동작(이벤트·id 로 그리는 함수)은 그대로라 기능은 하나도 안 바뀐다.
//  v26.0 에서 index.html 끝 한 줄로 연결. v26.1(2026-10-19) 우회 정리: 바구니는 main.js 의 그리는 함수(__kiwi)를 직접 부르고,
//  자동 숨김은 burnTick 이 #basket 을 열린 창으로 보고, 소리 요약·키보드 단축키는 원본(index.html·main.js)에서 지웠고,
//  시점은 숨은 버튼 대신 설정 안에서 바로 고른다. 남은 큰 정리(마크업을 직접 새 자리로 옮기고 이 파일 지우기)는 docs/IA.md
//
//  바뀌는 것
//   · 화면 위: [글 모드·날씨·시점] → [글 모드·날씨], 소리 → ⋯ 메뉴 첫 줄, 새 「바구니」 버튼
//   · 바구니: 모은 것 9묶음을 탭 5(사진 · 편지 · 키위 · 장소·소리 · 도감)로 — 소리 묶음도 이리로 (집중 기록·달력은 집중 창에 펼쳐 둠)
//   · 설정: 풍경(장소·시간대·시점·키위 수) / 시계·메모(시간 메모·시계·벽시계) / 화면(창 모양·창 투명도·입력창·이름·화면 정리) / 테스트
//   · 소리 창: 크기 · 곡 (발자국·배경 묶음은 바구니)
//   · 집중 창: 탭 [집중하기 | 기록] — 집중하기 = 섬/항해 → 시간 → 오늘의 한 줄 → 시작 → 더 보기(집중 중 소리 · 숨 고르기 · 규칙), 기록 = 통계 + 달력
//   · 메뉴: 소리(+ 바로 켜고 끄기) · 설정 · 작품 설명
//   · 키보드 단축키(H·M·W·V·T) 없앰 — 손가락 앱이라 (사용자 2026-10-19). Esc 로 창 닫기는 남김 (v26.1: main.js 에서 지움)

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
  const TABS = [['photo', '일지'], ['letter', '편지'], ['kiwi', '키위'], ['world', '장소·소리'], ['dex', '도감']];
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
  // 집중 기록 · 달력 → 바구니 › 사진 위
  // 집중 기록(통계·달력)은 집중 창의 「기록」 탭에 펼쳐 둔다 (아래 집중 창 절) — 바구니 › 사진은 사진·앨범만
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
  const basketBtn = el('button', { id: 'basketBtn', type: 'button', class: 'round', 'aria-label': '바구니 — 일지 · 편지 · 키위 · 장소·소리 · 도감', 'aria-expanded': 'false', 'aria-controls': 'basket' },
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5h17" /><path d="M5 10.5l1.4 7.9a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6l1.4-7.9" /><path d="M7.6 10.5a4.4 4.9 0 0 1 8.8 0" /><path d="M5.9 14.5h12.2M10.2 10.5l.4 9.5M13.8 10.5l-.4 9.5" /></svg>');
  corner.insertBefore(basketBtn, menuBtn);
  const openBasket = open => {
    if (open) {
      // main.js 의 그리는 함수를 직접 (모은 것 묶음 + 모은 소리 묶음) — 예전엔 모은 것·소리 창 버튼을 대신 눌렀다
      const k = window.__kiwi; k?.paintCollection(); k?.paintPacks();
      for (const p of [settings, mixer, focusPanel, menu, $('picker')]) if (p && !p.hidden) p.hidden = true;
      $('setBtn').setAttribute('aria-expanded', 'false'); soundBtn.setAttribute('aria-expanded', 'false');
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
  // 바구니를 보는 동안 버튼 자동 숨김은 main.js burnTick 이 #basket 을 열린 창으로 보고 막는다
  // 메뉴의 「모은 것」은 바구니 버튼이 대신한다
  $('bagBtn').hidden = true;

  // ── 화면 위: 시점은 설정으로, 소리는 메뉴로 ──
  const sceneSecs = sections(pane('scene'));
  // 시점은 설정 안에서 바로 고른다 (v26.1 — 예전엔 위 모서리에 투명한 진짜 버튼을 남겨 고르기 창을 띄웠다)
  corner.append(viewBtn); viewBtn.hidden = true;   // 위 줄 묶음(.grp)에선 빼 둔다 — 예전과 같은 [글 모드·날씨]
  const viewRow = el('div', { class: 'ia-views', role: 'group', 'aria-label': '시점' });
  const viewH = el('h2', { class: 'sep' }, '시점');
  const NAMES = { top: '위에서', diorama: '디오라마', follow: '따라가기', scope: '쌍안경', text: '글자 보기', breeze: '바람결' };
  for (const [v, nm] of Object.entries(NAMES)) {
    const b = el('button', { type: 'button', class: 'ia-pick ia-view', 'data-view': v, 'aria-pressed': 'false' }), svg = viewBtn.querySelector('svg').cloneNode(true);
    svg.querySelectorAll(':scope > g[class]').forEach(g => { if (g.getAttribute('class') !== 'v-' + v) g.remove(); else g.style.display = 'inline'; });
    svg.dataset.ico = 'v-' + v;   // 종이 테마 아이콘이 이 이름으로 그림을 고른다
    b.append(svg, el('span', {}, nm));
    b.addEventListener('click', () => window.__kiwi?.setView(v));
    viewRow.append(b);
  }
  const paintView = () => { for (const b of viewRow.children) b.setAttribute('aria-pressed', String(b.dataset.view === document.body.dataset.view)); };
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
  // 창 투명도 (v26.4 — 사용자 2026-10-19: 단색 배경을 설정에서 조절) — 창 모양 바로 아래. 모던·종이 따로 기억, 이 기기에만
  //  0% = 지금처럼(모던은 원래 살짝 비침 22%, 종이는 단색), 최대 70%. 비치면 뒤 그림을 흐리게 해 글씨는 읽히게
  {
    const DEF = { modern: 22, paper: 0 }, KEY = 'kiwi-footprints.winSee.';
    const ui = () => (document.documentElement.dataset.ui === 'paper' ? 'paper' : 'modern');
    const get = u => { try { const v = localStorage.getItem(KEY + u); if (v !== null && isFinite(+v)) return Math.min(70, Math.max(0, +v)); } catch (e) {} return DEF[u]; };
    const h = el('h2', { class: 'sep' }, '창 투명도');
    const now = el('p', { class: 'lightNow ia-see-now' });
    const r = el('input', { type: 'range', min: '0', max: '70', step: '5', id: 'winSee', 'aria-label': '창 투명도' });
    const hint = el('p', { class: 'hint' }, '설정·바구니·집중 같은 창의 바탕을 비치게 해요. 창 모양(모던·종이)마다 따로 기억해요.');
    const apply = v => {
      const de = document.documentElement;
      de.style.setProperty('--win-a', String(1 - v / 100));
      de.toggleAttribute('data-win-see', v > 0);
      r.value = String(v); now.textContent = v === 0 ? '비치지 않음' : `${v}% 비침`;
    };
    r.addEventListener('input', () => { const v = +r.value; apply(v); try { localStorage.setItem(KEY + ui(), String(v)); } catch (e) {} });
    new MutationObserver(() => apply(get(ui()))).observe(document.documentElement, { attributes: true, attributeFilter: ['data-ui'] });
    apply(get(ui()));
    shell.append(h, now, r, hint);
  }
  // 아래 입력창 (v26.5 — 사용자 2026-10-19: 「여기에 문장을 써 보세요」를 설정에서 지울 수 있게). 끄면 글은 글 모드(시계·명언·단어장)로만, 이 기기에만 기억
  {
    const KEY = 'kiwi-footprints.sayOff';
    const row = el('label', { class: 'row switch' }, '<span>아래 입력창 보이기</span>');
    const cb = el('input', { type: 'checkbox', id: 'optSay' }); row.append(cb);
    const hint = el('p', { class: 'hint' }, '끄면 화면 아래 「여기에 문장을 써 보세요」 칸이 사라져요. 글 모드(시계·명언·단어장)는 그대로예요.');
    const apply = off => { document.body.classList.toggle('ia-say-off', off); cb.checked = !off; };
    let off = false; try { off = localStorage.getItem(KEY) === '1'; } catch (e) {}
    apply(off);
    cb.addEventListener('change', () => { apply(!cb.checked); try { localStorage.setItem(KEY, cb.checked ? '0' : '1'); } catch (e) {} });
    shell.append(el('h2', { class: 'sep' }, '입력창'), row, hint);
  }
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
      const h = el('h2', { class: 'sub ia-letter-h' }, '오늘의 한 줄 <small>일지에 남아요</small>');
      ta.placeholder = '예) 포트폴리오 정리 (안 써도 돼요)';
      ta.setAttribute('aria-label', '오늘의 한 줄 — 끝까지 하면 키위들이 모래에 쓰고 일지로 남겨요');
      const note = taNote || el('p', { class: 'note' });
      note.classList.add('ia-snap');
      note.innerHTML = '끝까지 하면(항해는 도착하면) 키위들이 이 한 줄과 날짜를 <b>모래에 쓰고 일지 한 쪽</b>으로 남겨요. 며칠 뒤엔 호박색 병에 담겨 돌아와요. <span>비워 두면 「집중 ○분」이라고 써요 · 모래엔 앞의 14자까지</span>';
      start.before(h, ta, note);
    }
    move(rest, more); start.after(more);
    try { more.open = localStorage.getItem('kiwi-footprints.ia.more') === '1'; } catch (e) {}
    more.addEventListener('toggle', () => { try { localStorage.setItem('kiwi-footprints.ia.more', more.open ? '1' : '0'); } catch (e) {} });
  }

  // ── 집중 창 탭 2개: 집중하기 | 기록 (v26.2 — 사용자 2026-10-19: 한 창에 시작과 달력이 다 있어 스크롤이 길었다) ──
  //  집중하기 = 고르기·한 줄·시작(.idle) 또는 진행 중(.busy) · 기록 = 이번 달 통계 3칸 + 발자국 달력 (접지 않고 탭째 펼침)
  //  창을 열 때마다 「집중하기」부터 — 하려고 연 창이 기본. .idle/.busy 를 감싸기만 해서 main.js 의 숨김·그리기는 그대로
  {
    const idleEl = focusPanel.querySelector('.idle'), busyEl = focusPanel.querySelector('.busy'), stats = $('focusStats'), cal = $('focusCal');
    if (idleEl && busyEl && stats && cal) {
      const ft = el('div', { class: 'tabs ia-ftabs', role: 'tablist', 'aria-label': '집중 창 묶음' });
      const fp = {};
      for (const [id, nm] of [['go', '집중하기'], ['rec', '기록']]) {
        const b = el('button', { type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': 'false' }); b.textContent = nm; ft.append(b);
        fp[id] = el('section', { class: 'ia-fpane', 'data-pane': id, role: 'tabpanel', 'aria-label': nm });
      }
      focusPanel.prepend(ft, fp.go, fp.rec);
      fp.go.append(idleEl, busyEl); fp.rec.append(stats, cal);
      const t0 = idleEl.querySelector(':scope > h2:not(.sub)'); if (t0) t0.hidden = true;   // 「집중하기」 제목은 탭이 대신
      const fShow = id => { for (const b of ft.children) { const on = b.dataset.tab === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; } for (const [k, p] of Object.entries(fp)) p.hidden = k !== id; focusPanel.scrollTop = 0; };
      ft.addEventListener('click', e => { const b = e.target.closest('[role="tab"]'); if (b) fShow(b.dataset.tab); });
      ft.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const n = ft.querySelector('[aria-selected="false"]'); fShow(n.dataset.tab); n.focus(); e.preventDefault(); });
      new MutationObserver(() => { if (!focusPanel.hidden) fShow('go'); }).observe(focusPanel, { attributes: true, attributeFilter: ['hidden'] });
      fShow('go');
    }
  }

  // 작품 설명의 「위쪽 버튼」 목록 바로잡기
  const info = $('info');
  if (info) {
    const li = id => info.querySelector(`[data-icon="${id}"]`)?.closest('li');
    li('viewBtn')?.querySelector('span')?.insertAdjacentText('beforeend', ' — 설정 › 풍경');
    li('soundBtn')?.querySelector('span')?.insertAdjacentText('beforeend', ' — ⋯ 메뉴');
    const m = li('menuBtn')?.querySelector('span'); if (m) m.textContent = '소리 · 설정(풍경 · 시계·메모 · 화면) · 작품 설명';
    const focusLi = li('focusBtn');
    if (focusLi) {
      const b = el('li', {}, '<i></i><b>바구니</b><span>일지 · 편지 · 키위 · 장소·소리 · 도감</span>');
      b.querySelector('i').append(basketBtn.querySelector('svg').cloneNode(true)); b.querySelector('i').dataset.icon = 'basketBtn';
      focusLi.after(b);
    }
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
