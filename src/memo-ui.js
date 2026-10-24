// memo-ui.js — 시간 메모 창 · 놓친 메모 카드 · 이름 묻기 카드 (DOM 만 만든다 — 어디에 붙일지는 main.js 가 정한다)
//
//  쓰는 법 (연결은 docs/MEMOS.md):
//    mountMemoPanel(설정 창 안 칸, memos, { onChange })   → 목록·추가 칸을 그 칸 안에 그린다. 다시 그리기 = 반환값.paint()
//    missedCard(놓친 메모들)                              → 카드 요소 (발견 카드 #found .art 등에 넣는다)
//    nameCard(greeter, { onDone(name | null) })           → "뭐라고 불러 줄까요?" 카드 요소
//  모양은 memos.css (km- 로 시작하는 이름만 쓴다 — 다른 창 스타일과 안 섞이게).

import { MAX_TEXT, MAX_MEMOS, parseTime, sandTime } from './memos.js?v=v29.5.0';
import { MAX_NAME } from './greet.js?v=v29.5.0';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function mountMemoPanel(host, memos, { onChange = () => {}, now = () => Date.now() } = {}) {
  host.classList.add('km-memos');
  host.textContent = '';
  const next = el('p', 'km-next');
  const form = el('form', 'km-add'); form.setAttribute('aria-label', '시간 메모 더하기');
  const time = el('input'); time.type = 'time'; time.required = true; time.setAttribute('aria-label', '시간');
  const text = el('input'); text.type = 'text'; text.maxLength = MAX_TEXT; text.placeholder = '물 마시기'; text.setAttribute('aria-label', '키위가 쓸 말');
  const rep = el('label', 'km-rep'); const repIn = el('input'); repIn.type = 'checkbox'; rep.append(repIn, el('span', null, '매일'));
  const add = el('button', 'km-go', '더하기'); add.type = 'submit';
  form.append(time, text, rep, add);
  const err = el('p', 'km-err'); err.setAttribute('role', 'status');
  const list = el('ul', 'km-list');
  const hint = el('p', 'km-hint', '그 시간에 이 화면이 켜져 있으면 키위들이 모래에 써 줘요. 꺼져 있었으면 다시 열 때 「놓친 메모」로 알려 줘요. (앱이 꺼져 있어도 오는 알림은 다음에)');
  host.append(next, form, err, list, hint);

  // 처음 열면 다음 정시를 미리 채워 둔다
  { const d = new Date(now() + 3600e3); time.value = `${String(d.getHours()).padStart(2, '0')}:00`; }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const r = memos.add({ time: time.value, text: text.value, repeat: repIn.checked ? 'daily' : 'once' }, now());
    if (r.error) { err.textContent = r.error; return; }
    err.textContent = ''; text.value = ''; repIn.checked = false;
    paint(); onChange('add', r);
  });

  function paint() {
    list.textContent = '';
    const n = memos.next(now());
    next.textContent = n ? `다음 · ${new Date(n.at).getDate() !== new Date(now()).getDate() ? '내일 ' : ''}${sandTime(parseTime(n.memo.time))} ${n.memo.text}` : memos.list.length ? '남은 메모가 없어요.' : '아직 메모가 없어요. 시간과 한 줄을 적어 두면 그때 키위들이 써 줘요.';
    add.disabled = memos.list.length >= MAX_MEMOS;
    for (const m of memos.list) {
      const li = el('li', 'km-item' + (m.on ? '' : ' off'));
      const t = el('b', 'km-time', m.time);
      const tx = el('span', 'km-text', m.text);
      const tag = el('span', 'km-tag', m.repeat === 'daily' ? '매일' : m.on ? (m.day && m.day !== dayOf(now()) ? '내일' : '오늘') : '다 했어요');
      const tog = el('button', 'km-tog', m.on ? '끄기' : '켜기'); tog.type = 'button';
      tog.hidden = m.repeat === 'once' && !m.on;
      tog.setAttribute('aria-label', `${m.time} ${m.text} ${m.on ? '끄기' : '켜기'}`);
      tog.addEventListener('click', () => { memos.toggle(m.id); paint(); onChange('toggle', m); });
      const del = el('button', 'km-del', '×'); del.type = 'button'; del.setAttribute('aria-label', `${m.time} ${m.text} 지우기`);
      del.addEventListener('click', () => { memos.remove(m.id); paint(); onChange('remove', m); });
      li.append(t, tx, tag, tog, del); list.append(li);
    }
  }
  paint();
  return { paint, form };
}
const dayOf = ms => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// 다시 열었을 때 보여 줄 "놓친 메모" 카드 내용
export function missedCard(list) {
  const box = el('div', 'km-missed');
  box.append(el('b', 'km-missed-title', `놓친 메모 ${list.length}개`));
  const ul = el('ul');
  for (const m of list) { const li = el('li'); li.append(el('span', 'km-time', m.time), el('span', null, m.text)); ul.append(li); }
  box.append(ul, el('p', 'km-hint', '그 시간엔 화면이 꺼져 있었어요. 매일 메모는 내일 다시 써 줄게요.'));
  return box;
}

// 이름 묻기 카드 — 처음 한 번 (건너뛰면 다시 묻지 않는다, 설정에서 바꿀 수 있게)
export function nameCard(greeter, { onDone = () => {} } = {}) {
  const box = el('form', 'km-name'); box.setAttribute('aria-label', '이름');
  box.append(el('span', 'km-name-hi', '처음 만났네요'), el('b', 'km-name-q', '뭐라고 불러 줄까요?'), el('p', 'km-hint', '키위들이 처음 켤 때 모래에 이름을 써 줘요. 이 기기에만 저장돼요.'));
  const inp = el('input'); inp.type = 'text'; inp.maxLength = MAX_NAME; inp.placeholder = '이름이나 별명'; inp.value = greeter.name; inp.setAttribute('aria-label', '이름이나 별명');
  const row = el('div', 'km-row');
  const ok = el('button', 'km-go', '좋아요'); ok.type = 'submit';
  const later = el('button', 'km-later', '나중에'); later.type = 'button';
  row.append(later, ok); box.append(inp, row);
  box.addEventListener('submit', e => { e.preventDefault(); const n = greeter.setName(inp.value); onDone(n || null); });
  later.addEventListener('click', () => { greeter.skip(); onDone(null); });
  setTimeout(() => inp.focus(), 50);
  return box;
}
