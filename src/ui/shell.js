// src/ui/shell.js — 2026-10-24 UI 구조 개편 (결정 10개: _views/html-views/2026-10-24_kiwi-ui-restructure.html)
//
//  마크업은 index.html 에 제자리로 있고(예전 src/ia/ia.js 처럼 뜬 뒤에 옮기지 않는다), 여기는 새 창 셋의 동작만 맡는다.
//   · 바구니 = 읽는 것(일지 · 편지 · 도감)
//   · 꾸미기 = 고르는 것(키위 옷 · 배·돛 · 소리 · 만들기). 누르면 바로 입혀 보고 들어 보고, 「저장」해야 남는다 — 다른 길로 닫으면 되돌린다
//   · 해도  = 장소의 유일한 입구(그리기·누르기는 voyage-extras.js 의 paintChart · pickAt)
//  그 밖에: 설정 › 풍경의 시점 줄 · 설정 › 화면의 창 투명도 · 아래 입력창 끄기 · 떠나기 창 「더 보기」 기억
//  main.js 는 맨 아래에서 mountShell(env) 한 번만 부른다.

const $ = id => document.getElementById(id);
const KEY = 'kiwi-footprints.';
const get = k => { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } };
const put = (k, v) => { try { localStorage.setItem(KEY + k, v); } catch (e) {} };

// 탭 묶음 (설정 창 wireTabs 와 같은 규칙: 화살표로 옮기고, 고른 탭을 기억)
function tabs(panel, key, first) {
  const list = [...panel.querySelectorAll(':scope > [role="tablist"] [role="tab"]')];
  const show = id => {
    if (!list.some(t => t.dataset.tab === id)) id = first || list[0].dataset.tab;
    for (const t of list) { const on = t.dataset.tab === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }
    for (const p of panel.querySelectorAll(':scope > .pane')) p.hidden = p.dataset.pane !== id;
    panel.scrollTop = 0; for (const p of panel.querySelectorAll(':scope > .pane')) p.scrollTop = 0;
    put('tab.' + key, id);
  };
  for (const t of list) t.addEventListener('click', () => show(t.dataset.tab));
  panel.querySelector(':scope > [role="tablist"]').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = list.findIndex(t => t.getAttribute('aria-selected') === 'true'), n = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    show(n.dataset.tab); n.focus(); e.preventDefault();
  });
  show(get('tab.' + key) || first);
  return show;
}

export function mountShell(env) {
  const { closeOthers, paintCollection, paintPacks, onChart, unlock } = env;
  const basket = $('basket'), basketBtn = $('basketBtn');
  const ward = $('wardrobe'), wardBtn = $('wardBtn');
  const chartView = $('chartView'), chartBtn = $('chartBtn');
  const basketTab = tabs(basket, 'basket', 'photo');
  const wardTab = tabs(ward, 'ward', 'kiwi');

  // ── 바구니 ──
  function openBasket(open) {
    if (open === !basket.hidden) return;
    if (open) { closeAll(); closeOthers(); paintCollection(); }
    basket.hidden = !open; basketBtn.setAttribute('aria-expanded', String(open));
    if (open) basket.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  }
  basketBtn.addEventListener('click', () => { unlock(); openBasket(basket.hidden); });

  // ── 꾸미기: 지금 상태를 적어 두고 → 마음껏 바꿔 보고 → 저장 or 되돌리기 ──
  let draft = null;
  const snap = () => ({ wear: [...env.col.wear], boat: env.voyScene.boatId, sail: env.voyScene.sailId, mix: { ...env.sound.mix } });
  function restore(d) {
    for (const id of [...env.col.wear]) if (!d.wear.includes(id)) env.setWear(id, false);
    for (const id of d.wear) if (!env.col.wearing(id)) env.setWear(id, true);
    if (env.voyScene.boatId !== d.boat) { env.voyScene.setBoat(d.boat); env.save('boat', d.boat); }
    if (env.voyScene.sailId !== d.sail) { env.voyScene.setSail(d.sail); env.save('sail', d.sail); }
    const m = d.mix, now = env.sound.mix;
    const pick = {}; for (const k of ['voice', 'stepPack', 'natStep', 'findPack']) if (now[k] !== m[k]) pick[k] = m[k];
    if (Object.keys(pick).length) env.sound.setMix(pick);
    if (now.nature !== m.nature) env.sound.setNature(m.nature);
    if (now.song !== m.song) env.sound.setSong(m.song);
  }
  const changed = () => { if (!draft) return false; const n = snap(); return JSON.stringify(n.wear.slice().sort()) !== JSON.stringify(draft.wear.slice().sort()) || n.boat !== draft.boat || n.sail !== draft.sail || ['voice', 'stepPack', 'natStep', 'findPack', 'nature', 'song'].some(k => n.mix[k] !== draft.mix[k]); };
  function paintWardBar() { const c = changed(); $('wdSave').disabled = !c; $('wdCancel').textContent = c ? '되돌리기' : '닫기'; }
  function paintBoatStage() {
    const st = $('boatStage'); if (!st) return;
    const b = env.voyScene.boatId, s = env.voyScene.sailId;
    st.querySelector('.hull').src = 'assets/' + (b === 'dinghy' ? 'voyage-boat.webp?v=v29.0.0' : 'boat-' + b + '.webp?v=v29.0.0');
    st.querySelector('.sail').src = 'assets/' + (s === 'leaf' ? 'voyage-sail.webp?v=v29.0.0' : 'sail-' + s + '.webp?v=v29.0.0');
  }
  function openWard(open, { save = false, tab } = {}) {
    if (open === !ward.hidden) { if (open && tab) wardTab(tab); return; }
    if (open) {
      closeAll(); closeOthers();
      draft = snap(); paintCollection(); paintPacks(); paintBoatStage(); paintWardBar();
      if (tab) wardTab(tab);
    } else {
      if (!save && draft && changed()) { restore(draft); env.toast('바꾼 것을 되돌렸어요'); }
      else if (save && draft && changed()) env.toast('저장했어요');
      draft = null; paintCollection();
    }
    ward.hidden = !open; wardBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('dressing', open);
    if (open) ward.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  }
  wardBtn.addEventListener('click', () => { unlock(); openWard(true); });
  $('toWardSound')?.addEventListener('click', () => { unlock(); openWard(true, { tab: 'sound' }); });
  $('wdSave').addEventListener('click', () => openWard(false, { save: true }));
  $('wdCancel').addEventListener('click', () => openWard(false));
  // 고를 때마다 저장 단추·배 그림을 갱신 (각 칸의 그리는 함수가 다시 그린 뒤)
  ward.addEventListener('click', () => setTimeout(() => { if (!ward.hidden) { paintBoatStage(); paintWardBar(); } }, 0));

  // ── 해도 ──
  function openChart(open) {
    if (open === !chartView.hidden) return;
    if (open) { closeAll(); closeOthers(); }
    chartView.hidden = !open; chartBtn.setAttribute('aria-expanded', String(open));
    if (open) { $('isleCard').hidden = true; onChart(); $('chartClose').focus(); }
  }
  chartBtn.addEventListener('click', () => { unlock(); openChart(chartView.hidden); });
  $('chartClose').addEventListener('click', () => { openChart(false); chartBtn.focus(); });

  // 바깥을 누르면 바구니·해도는 닫힌다 (꾸미기는 저장/되돌리기로만 — 그 사이 섬을 보며 고르도록)
  const onTop = t => t.closest?.('#found, #picker, #photoViewer, .journey-book, [role="dialog"][aria-modal="true"]');
  document.addEventListener('pointerdown', e => {
    const t = e.target; if (onTop(t)) return;
    if (!basket.hidden && !basket.contains(t) && !basketBtn.contains(t)) openBasket(false);
  }, true);
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || $('found')?.hidden === false) return;
    if (!chartView.hidden) { if (!$('isleCard').hidden) $('isleCard').hidden = true; else { openChart(false); chartBtn.focus(); } }
    else if (!ward.hidden) { openWard(false); $('menuBtn').focus(); }
    else if (!basket.hidden) { openBasket(false); basketBtn.focus(); }
  });

  function closeAll() { openBasket(false); openWard(false); openChart(false); }

  // ── 설정 › 풍경 › 시점 ──
  const viewRow = $('viewRow'), viewBtn = $('viewBtn');
  const NAMES = { top: '위에서', diorama: '디오라마', follow: '따라가기', scope: '쌍안경', text: '글자 보기', breeze: '바람결' };
  for (const [v, nm] of Object.entries(NAMES)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pick'; b.dataset.view = v;
    const svg = viewBtn.querySelector('svg').cloneNode(true);
    svg.querySelectorAll(':scope > g[class]').forEach(g => { if (g.getAttribute('class') !== 'v-' + v) g.remove(); else g.style.display = 'inline'; });
    svg.dataset.ico = 'v-' + v;   // 종이 테마 아이콘이 이 이름으로 그림을 고른다
    const sp = document.createElement('span'); sp.textContent = nm;
    b.append(svg, sp); b.addEventListener('click', () => env.setView(v));
    viewRow.append(b);
  }
  const paintView = () => { for (const b of viewRow.children) b.setAttribute('aria-pressed', String(b.dataset.view === document.body.dataset.view)); };
  new MutationObserver(paintView).observe(document.body, { attributes: true, attributeFilter: ['data-view'] }); paintView();

  // ── 설정 › 화면 › 창 투명도 (모던·종이 따로 기억, 0% = 비치지 않음) ──
  {
    const DEF = { modern: 22, paper: 0 }, r = $('winSee'), now = $('winSeeNow');
    const ui = () => (document.documentElement.dataset.ui === 'paper' ? 'paper' : 'modern');
    const read = u => { const v = get('winSee.' + u); return v !== null && isFinite(+v) ? Math.min(70, Math.max(0, +v)) : DEF[u]; };
    const apply = v => { const de = document.documentElement; de.style.setProperty('--win-a', String(1 - v / 100)); de.toggleAttribute('data-win-see', v > 0); r.value = String(v); now.textContent = v === 0 ? '비치지 않음' : `${v}% 비침`; };
    r.addEventListener('input', () => { apply(+r.value); put('winSee.' + ui(), r.value); });
    new MutationObserver(() => apply(read(ui()))).observe(document.documentElement, { attributes: true, attributeFilter: ['data-ui'] });
    apply(read(ui()));
  }
  // ── 설정 › 화면 › 아래 입력창 ──
  {
    const cb = $('optSay'), apply = off => { document.body.classList.toggle('say-off', off); cb.checked = !off; };
    apply(get('sayOff') === '1');
    cb.addEventListener('change', () => { apply(!cb.checked); put('sayOff', cb.checked ? '0' : '1'); });
  }
  // ── 떠나기 창 「더 보기」 펼침 기억 ──
  { const m = $('focusMore'); if (m) { m.open = get('ia.more') === '1'; m.addEventListener('toggle', () => put('ia.more', m.open ? '1' : '0')); } }

  return { closeAll, openBasket, openWard, openChart, basketTab, wardTab, get dressing() { return !ward.hidden; } };
}
