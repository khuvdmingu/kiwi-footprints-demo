// src/taps.js — 테스트 기간 「누름 세기」: 버튼·탭·고르기 칸을 몇 번 눌렀는지 이 기기에만 세어 둔다.
//
//  · 테스트 탭(#tunePane)이 있을 때만 켠다 — 출시 때 테스트 탭이 빠지면 저절로 안 센다.
//  · 서버로 아무것도 안 보낸다. localStorage 'kiwi-footprints.taps' 한 칸.
//  · 테스트 탭 맨 위에 「누름 세기」: 많이 누른 순 목록 + 「텍스트로 복사」(붙여넣어 Claude 에게 보여 주면 빈도 표를 실측으로 바꾼다) + 「처음부터」.
//  · 테스트 탭 안에서 누른 것은 세지 않는다(조절하느라 누른 게 섞이지 않게).
//  · UI 개편 모듈(src/ia/)과 함께 쓰면 바뀐 구조 기준으로 센다 — 기록에 「구조: 개편/원래」를 적는다.

export const KEY = 'kiwi-footprints.taps';
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.items) return v; } catch (e) {} return { since: Date.now(), items: {} }; };
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

const WHERE = [['#tunePane', null], ['#basket', '바구니'], ['#settings', '설정'], ['#mixer', '소리 창'], ['#focusPanel', '집중 창'], ['#menu', '메뉴'], ['#picker', '고르기 창'],
  ['#found', '카드'], ['#photoViewer', '사진 보기'], ['#info', '작품 설명'], ['.corner', '화면 위'], ['#say', '입력창'], ['#touch', '그림'], ['#breathOffer', '권유']];
const clip = s => (s || '').replace(/\s+/g, ' ').trim().slice(0, 28);

// 누른 대상 → { key, label, where } (세지 않을 것이면 null). 브라우저 없이 시험할 수 있게 DOM 메서드만 쓴다
export function describe(target) {
  if (!target || !target.closest) return null;
  let where = null;
  for (const [sel, name] of WHERE) if (target.closest(sel)) { if (name === null) return null; where = name; break; }
  if (!where) return null;
  if (where === '그림') return { key: '그림|누르기', label: '모래·키위·구름 누르기', where };
  const t = target.closest('button, [role="tab"], [role="menuitem"], summary, label, select, input, a');
  if (!t) return null;
  const input = t.matches('label') ? t.querySelector('input') : t.matches('input') ? t : null;
  let id = t.id || t.dataset?.tab || t.dataset?.act || t.dataset?.h || '';
  let label = t.getAttribute('aria-label') || '';
  if (input && (input.type === 'radio' || input.type === 'checkbox')) {
    id = `${input.name || input.id}=${input.type === 'radio' ? input.value : 'toggle'}`;
    label = clip((t.closest('label') || t).textContent) || input.getAttribute('aria-label') || id;
  }
  if (!label) label = clip(t.querySelector?.('span')?.textContent || t.textContent) || t.title || id;
  if (!id) id = label;
  return { key: `${where}|${id}`, label: clip(label.split(' — ')[0]), where };
}

export function bump(state, d) {
  const it = state.items[d.key] || (state.items[d.key] = { n: 0, label: d.label, where: d.where });
  it.n++; it.label = d.label; return it.n;
}

const day = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function asText(state, now = Date.now(), layout = '원래') {
  const rows = Object.values(state.items).sort((a, b) => b.n - a.n || a.where.localeCompare(b.where));
  const total = rows.reduce((s, r) => s + r.n, 0);
  const lines = [`누름 세기 · ${day(state.since)} ~ ${day(now)} · 총 ${total}번 · 구조: ${layout}`, '횟수\t어디\t무엇'];
  for (const r of rows) lines.push(`${r.n}\t${r.where}\t${r.label}`);
  return lines.join('\n');
}

function mount() {
  const pane = document.getElementById('tunePane');
  if (!pane || document.getElementById('tapsBox')) return;
  let state = read();
  const layout = () => (document.body.dataset.ia ? '개편' : '원래');

  const box = document.createElement('div'); box.id = 'tapsBox';
  box.innerHTML = `<h2>누름 세기</h2>
    <p class="hint" id="tapsSum"></p>
    <div class="tbtns"><button type="button" id="tapsCopy">텍스트로 복사</button><button type="button" id="tapsReset" class="warn">처음부터</button></div>
    <ol class="taps" id="tapsList"></ol>
    <p class="hint">버튼·탭·고르기 칸을 누른 횟수를 이 기기에만 세요(서버로 안 보냄). 이 테스트 탭 안에서 누른 건 안 세요. 복사한 글을 Claude 에게 붙여 주면 자주 쓰는 것·안 쓰는 것을 실제 숫자로 다시 정해요.</p>
    <h2 class="sep">조절값</h2>`;
  const hint = pane.querySelector('.hint.top'); (hint || pane.firstChild).after(box);
  const sum = box.querySelector('#tapsSum'), list = box.querySelector('#tapsList');

  const paint = () => {
    const rows = Object.values(state.items).sort((a, b) => b.n - a.n);
    const total = rows.reduce((s, r) => s + r.n, 0);
    sum.textContent = `${day(state.since)}부터 · ${total}번 · ${rows.length}가지 · 구조: ${layout()}`;
    list.textContent = '';
    for (const r of rows.slice(0, 12)) {
      const li = document.createElement('li');
      li.innerHTML = '<b></b><span></span><small></small>';
      li.children[0].textContent = r.n; li.children[1].textContent = r.label; li.children[2].textContent = r.where;
      list.append(li);
    }
    if (!rows.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '아직 센 게 없어요 — 평소처럼 써 보세요'; list.append(li); }
  };
  const toast = msg => { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1600); };

  let saveT = 0, lastKey = '', lastAt = 0;
  const count = target => {
    const d = describe(target); if (!d) return;
    const now = performance.now();
    if (d.key === lastKey && now - lastAt < 80) return;   // 라벨을 누르면 안의 칸에도 click 이 한 번 더 온다 — 한 번으로
    lastKey = d.key; lastAt = now;
    bump(state, d);
    clearTimeout(saveT); saveT = setTimeout(() => write(state), 400);
    if (pane.offsetParent) paint();
  };
  // 사람이 실제로 누른 것만 (isTrusted) — 코드가 대신 누른 버튼(개편 모듈의 우회 등)은 세지 않는다
  addEventListener('click', e => { if (e.isTrusted) count(e.target); }, true);
  addEventListener('change', e => { if (e.isTrusted && e.target.matches?.('input[type="range"]')) count(e.target); }, true);
  addEventListener('pagehide', () => write(state));

  box.querySelector('#tapsCopy').addEventListener('click', async () => {
    write(state);
    const text = asText(state, Date.now(), layout());
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
      document.body.append(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } ta.remove();
    }
    toast(ok ? `복사했어요 · ${Object.keys(state.items).length}가지` : '복사가 안 됐어요 — 길게 눌러 직접 복사해 주세요');
  });
  box.querySelector('#tapsReset').addEventListener('click', e => {
    const b = e.currentTarget;
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '한 번 더 누르면 지워요'; setTimeout(() => { b.dataset.sure = ''; b.textContent = '처음부터'; }, 3000); return; }
    state = { since: Date.now(), items: {} }; write(state); b.dataset.sure = ''; b.textContent = '처음부터'; paint();
  });
  // 테스트 탭을 열 때 새로 그린다
  new MutationObserver(() => { if (!pane.hidden) paint(); }).observe(pane, { attributes: true, attributeFilter: ['hidden'] });
  paint();

  if (!document.querySelector('link[data-taps]')) {
    const s = document.createElement('style'); s.dataset.taps = '1';
    s.textContent = `#tapsBox .taps{list-style:none;margin:6px 2px 4px;padding:0;display:grid;gap:3px;counter-reset:t}
#tapsBox .taps li{display:grid;grid-template-columns:36px 1fr auto;gap:8px;align-items:baseline;padding:4px 8px;border-radius:8px;background:rgba(255,255,255,.06);font-size:13px}
#tapsBox .taps li b{font-variant-numeric:tabular-nums;text-align:right}
#tapsBox .taps li small{opacity:.6;font-size:11.5px;white-space:nowrap}
#tapsBox .taps li.empty{display:block;opacity:.65}
html[data-ui="paper"] #tapsBox .taps li{background:rgba(255,255,255,.35)}`;
    document.head.append(s);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
}
