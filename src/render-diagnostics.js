// iPad에서 확인된 합성 제외 경로를 기본 적용한다. 장면의 그림/물결/키위는 그대로.
// 플랫폼 판별은 로컬에서만 수행하며 진단 UI·전송·저장은 기본 방문에 없다.
const LAYERS = ['tint', 'glow', 'grain'];
// iPad 층별 비교 시험 (2026-10-19): ?layers=tint · ?layers=glow,grain … — 적은 층만 켜고 나머지는 끈다. 기본 방문에는 없다.
//  세 층을 한꺼번에 켜고 끄는 tint=1/0 만으로는 어느 층(조합)이 iPad 화면을 덮는지 몰랐다 (docs/IPAD_RENDERING_HANDOFF.md 5번)
export function layerTest(q) {
  if (!q.has('layers')) return null;
  const on = new Set(String(q.get('layers')).split(',').map(s => s.trim()).filter(s => LAYERS.includes(s)));
  return { on: LAYERS.filter(l => on.has(l)), off: LAYERS.filter(l => !on.has(l)) };
}

export function colorCompositingEnabled(q, nav = {}) {
  if (q.has('layers')) return true;   // 층별 시험: 아래 hide-* 로 고른 층만 남긴다
  if (q.get('tint') === '0') return false;
  if (q.get('tint') === '1') return true;   // 명시적인 비교 시험용
  const ua = nav.userAgent || '', platform = nav.platform || '';
  const ipad = /iPad/i.test(ua + ' ' + platform) || (/Macintosh|MacIntel/i.test(ua + ' ' + platform) && nav.maxTouchPoints > 1);
  return !ipad;
}

export function mountRenderDiagnostics(q, readState, doc = document, win = window) {
  const compositing = colorCompositingEnabled(q, win.navigator);
  if (!compositing) doc.documentElement.classList.add('no-color-compositing');
  const test = layerTest(q);
  if (test) for (const l of test.off) doc.documentElement.classList.add('hide-' + l);
  if (!q.has('diagnostic')) return null;
  const el = doc.createElement('pre');
  el.id = 'renderDiagnostics';
  el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:10000;max-width:calc(100% - 16px);margin:0;padding:8px;background:#fff;color:#111;font:12px/1.4 monospace;white-space:pre-wrap;pointer-events:none';
  doc.body.appendChild(el);
  const update = () => {
    const state = readState(), plate = doc.getElementById('plate');
    el.textContent = ['v24.4.4 · 풍경 진단',
      `색조 합성: ${test ? `층 시험 — 켬 ${test.on.join('·') || '없음'} / 끔 ${test.off.join('·') || '없음'}` : compositing ? '사용' : '제외 (호환 모드)'} · ${state.renderer}`,
      `화면 ${win.innerWidth}×${win.innerHeight} · DPR ${win.devicePixelRatio}`,
      `그림 ${plate?.width || 0}×${plate?.height || 0} · ${state.ready ? '그리기 시작' : '시작 중'}`,
      state.error ? `오류: ${state.error}` : '프레임 오류 없음',
      win.navigator.userAgent].join('\n');
  };
  update();
  const timer = win.setInterval(update, 1000);
  return () => { win.clearInterval(timer); el.remove(); };
}
