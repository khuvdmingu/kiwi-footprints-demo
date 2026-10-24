// 창은 장면과 함께 쓰는 비모달이다. 모달 카드만 Tab을 가두고, 닫을 때만 초점을 돌린다.
const openers = new WeakMap();
const visible = el => !!el?.isConnected && !el.disabled && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
export function rememberOpener(panel, fallback) {
  const current = document.activeElement;
  openers.set(panel, current && current !== document.body && !panel.contains(current) ? current : fallback);
}
export function returnFocus(panel, fallback) {
  const hadFocus = panel.contains(document.activeElement) || document.activeElement === document.body;
  if (!hadFocus) return;
  queueMicrotask(() => {
    if (document.activeElement !== document.body && !panel.contains(document.activeElement)) return;
    const opener = openers.get(panel); (visible(opener) ? opener : visible(fallback) ? fallback : null)?.focus();
  });
}
export function wireTabs(panel, key, { load, save, first } = {}) {
  const tabs = [...panel.querySelectorAll(':scope > [role="tablist"] [role="tab"]')];
  const panes = [...panel.querySelectorAll(':scope > .pane')];
  for (const tab of tabs) {
    const pane = panes.find(p => p.dataset.pane === tab.dataset.tab); if (!pane) continue;
    tab.id ||= `${panel.id}-tab-${tab.dataset.tab}`; pane.id ||= `${panel.id}-pane-${tab.dataset.tab}`;
    tab.setAttribute('aria-controls', pane.id); pane.setAttribute('aria-labelledby', tab.id);
  }
  const show = name => {
    if (!tabs.some(t => t.dataset.tab === name)) name = first || tabs[0].dataset.tab;
    for (const t of tabs) { const on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }
    for (const p of panes) { p.hidden = p.dataset.pane !== name; p.scrollTop = 0; }
    panel.scrollTop = 0; save?.('tab.' + key, name);
  };
  for (const t of tabs) t.addEventListener('click', () => show(t.dataset.tab));
  panel.querySelector(':scope > [role="tablist"]').addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs.at(-1) : tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    show(next.dataset.tab); next.focus(); e.preventDefault();
  });
  show(load?.('tab.' + key) || first || tabs[0].dataset.tab);
  return show;
}
export function installDialogKeyboard(dialogs) {
  document.addEventListener('keydown', e => {
    if (document.querySelector('#photoViewer[open]')) return; // 네이티브 dialog의 조작을 보존한다.
    const active = dialogs.find(d => !d.panel.hidden && visible(d.panel));
    if (!active) return;
    if (e.key === 'Escape') { active.close(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (e.key !== 'Tab' || active.panel.getAttribute('aria-modal') !== 'true') return;
    const list = [...active.panel.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(visible);
    const first = list[0], last = list.at(-1); if (!first) return;
    const outside = !active.panel.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || outside)) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && (document.activeElement === last || outside)) { first.focus(); e.preventDefault(); }
  }, true);
}
