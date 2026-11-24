// home-fullscreen.js — v29.20 홈 화면 바로가기로 열면 화면 전체 (위 검정 상태 표시줄 없이, 2026-10-26 사용자)
//
//  매니페스트 기본 display 를 fullscreen 으로 바꿨지만, 예전에 만든 바로가기나 display_override 를 읽지 않는 브라우저(삼성 인터넷 등)는
//  standalone 으로 열려 상태 표시줄이 남는다 → 바로가기로 열렸을 때만 첫 누름에서 전체 화면을 요청한다(브라우저 탭에서는 하지 않는다).
//  전체 화면은 사용자 동작 안에서만 허용되므로 첫 pointerup. 거절되거나 지원하지 않으면(아이폰 등) 조용히 그대로 둔다.

export function isHomeApp(win = globalThis) {
  const mm = q => !!win.matchMedia?.(q).matches;
  return mm('(display-mode: standalone)') || mm('(display-mode: minimal-ui)') || win.navigator?.standalone === true;
}

export function mountHomeFullscreen({ win = globalThis, doc = globalThis.document } = {}) {
  if (!doc?.documentElement?.requestFullscreen || !isHomeApp(win)) return false;
  const go = () => {
    if (doc.fullscreenElement) return;
    try { doc.documentElement.requestFullscreen({ navigationUI: 'hide' })?.catch?.(() => {}); } catch (e) { /* 그대로 */ }
  };
  const arm = () => win.addEventListener('pointerup', go, { once: true, passive: true });
  arm();
  // 다른 앱에 다녀오면 전체 화면이 풀릴 수 있다 → 돌아와서 다시 누르면 다시
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible' && !doc.fullscreenElement) arm(); });
  return true;
}
