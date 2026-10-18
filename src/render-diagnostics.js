// 명시적인 진단 URL에서만 표시. 기기 정보는 화면에만 남으며 전송·저장하지 않는다.
export function mountRenderDiagnostics(q, readState, doc = document, win = window) {
  if (q.get('tint') === '0') doc.documentElement.classList.add('no-color-compositing');
  if (!q.has('diagnostic')) return null;
  const el = doc.createElement('pre');
  el.id = 'renderDiagnostics';
  el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:10000;max-width:calc(100% - 16px);margin:0;padding:8px;background:#fff;color:#111;font:12px/1.4 monospace;white-space:pre-wrap;pointer-events:none';
  doc.body.appendChild(el);
  const update = () => {
    const state = readState(), plate = doc.getElementById('plate');
    el.textContent = ['v24.4.3 · 풍경 진단',
      `색조 합성: ${q.get('tint') === '0' ? '제외' : '사용'} · ${state.renderer}`,
      `화면 ${win.innerWidth}×${win.innerHeight} · DPR ${win.devicePixelRatio}`,
      `그림 ${plate?.width || 0}×${plate?.height || 0} · ${state.ready ? '그리기 시작' : '시작 중'}`,
      state.error ? `오류: ${state.error}` : '프레임 오류 없음',
      win.navigator.userAgent].join('\n');
  };
  update();
  const timer = win.setInterval(update, 1000);
  return () => { win.clearInterval(timer); el.remove(); };
}
