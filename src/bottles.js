// bottles.js — v20 돌아오는 병: 내가 쓴 글은 바다가 기억했다가 며칠 뒤 호박색 병에 담아 돌려주고,
//               그 사이사이 초록 병에는 키위들이 쓴 응원 쪽지(다정 · 차분 · 피식)가 들어 있다.
//
//  · 내 글 = 집중 전에 적은 한 줄 + 모래에 직접 쓴 문장(4글자 넘게). 이 기기에만 저장한다 (localStorage).
//  · 내 글은 쓴 지 MIN_DAYS 가 지나야 돌아온다. 한 번 돌아온 글은 다시 오지 않는다.
//  · 응원 쪽지는 지금 상황(밤 · 아침 · 비 · 눈 · 방금 집중 · 오래 켜 둠)에 맞는 것을 먼저 고르고, 한 바퀴 다 볼 때까지 겹치지 않는다.
//  · 처음 쓰는 사람은 돌아올 글이 아직 없으니 응원 쪽지만 온다 — 내 글이 쌓이면 섞인다 (내 글 1 : 쪽지 2 정도).

export const MIN_DAYS = 2;
const KEEP = 300;

// tag: night · morning · rain · snow · focus(방금 집중 끝) · long(오래 켜 둠) · 없음 = 언제나
// by: 서명 (없으면 '키위 일동')
export const CHEERS = [
  // 다정 (반말)
  { id: 'c01', t: '오늘도 여기까지 온 거, 우리 다 봤어.' },
  { id: 'c02', t: '잘하고 있어. 모래가 증인이야.' },
  { id: 'c03', t: '천천히 해도 돼. 우리도 하루에 몇 미터 안 걸어.' },
  { id: 'c04', t: '모래 위에 쓴 "힘내"는 금방 지워져. 그러니까 자주 써 줄게.', by: '콩' },
  { id: 'c05', t: '네가 켜 둔 이 화면 덕분에 오늘 우리 산책 다녀왔어. 고마워.' },
  { id: 'c06', t: '어려운 건 원래 어려운 거야. 네가 모자란 게 아니라.' },
  { id: 'c07', t: '지금 한 걸음이면 충분해. 두 걸음은 내일의 너한테 맡기자.' },
  { id: 'c08', t: '물 한 잔 마시고 와. 기다릴게.', by: '보리' },
  { id: 'c09', t: '어깨 한번 으쓱. 그렇지, 그거.' },
  { id: 'c10', t: '오늘 못 한 건 실패가 아니라 남겨 둔 거야.' },
  // 차분 (존댓말)
  { id: 'c11', t: '서두르지 않아도 괜찮아요. 파도는 늘 같은 속도로 와요.' },
  { id: 'c12', t: '지워진다고 헛된 건 아니에요. 쓰는 동안 이미 충분했어요.' },
  { id: 'c13', t: '오늘의 당신에게 작은 박수를. 짝, 짝. (날개가 짧아서 소리는 작아요)' },
  { id: 'c14', t: '숨을 길게 한 번 쉬어 보세요. 바다도 그렇게 해요.' },
  { id: 'c15', t: '잘 안 풀리는 날은 모래를 한 번 고르는 날이에요.', by: '모래 정원지기' },
  { id: 'c16', t: '쓰고, 지우고, 다시 쓰는 것. 그게 이 해변의 일이고, 아마 당신의 일도요.' },
  { id: 'c17', t: '오늘 하루를 한 단어로 적는다면 뭘까요? 그걸 모래에 써 보세요.' },
  { id: 'c18', t: '멀리 보지 않아도 돼요. 다음 발자국 하나만.' },
  // 피식 (유머)
  { id: 'c21', t: '오늘 발자국 1,200개 찍었어. 다리가 좀 뻐근해.' },
  { id: 'c22', t: '파도한테 또 졌어. 내일 다시 씀.' },
  { id: 'c23', t: '우리 날개 있는 거 알아? 쓸 데는 없지만. 너도 안 쓰는 능력 하나쯤 있지?' },
  { id: 'c24', t: '부리가 길어서 좋은 점: 멀리 있는 것도 콕. 나쁜 점: 문에 자주 낌.' },
  { id: 'c25', t: '갈매기가 또 우리 글씨 맞춤법 지적했어. 자기는 글씨도 못 쓰면서.' },
  { id: 'c26', t: '오늘 할 일: ① 걷기 ② 콕 ③ 다시 걷기. 다 했다! 너는?' },
  { id: 'c27', t: '키위는 하루에 스무 시간 가까이 자. 그러니까 너도 좀 쉬어도 돼. 우리 기준으론 너 엄청 부지런해.' },
  { id: 'c28', t: '방금 바닷물 마셨다가 후회 중. 너는 맹물 마셔.', by: '밤톨' },
  { id: 'c29', t: '이 병 던진 키위가 누군지는 비밀이야. (콩이야)', by: '익명의 키위' },
  { id: 'c30', t: '"ㅎ" 쓰다가 모자 꼭지를 어디에 붙일지 3분 고민했어. 너도 사소한 거로 오래 고민해도 돼.' },
  { id: 'c31', t: '키위 알은 엄마 몸무게의 거의 5분의 1이래. 그러니까 오늘 네가 좀 무거운 걸 들고 있어도 이상한 거 아냐.' },
  { id: 'c32', t: '뉴스 속보: 키위 한 마리가 오늘도 날지 못함. 그런데도 행복한 것으로 알려져.' },
  { id: 'c33', t: '우리 중 하나가 "ㅇ"을 너무 크게 그려서 다들 웃었어. 실수해도 웃으면 그만이야.' },
  { id: 'c34', t: '병 하나 띄우는 데 키위 셋이 필요했어. 하나는 밀고, 하나는 응원하고, 하나는 잤어.' },
  { id: 'c35', t: '지금 자세 확인! 등 펴기. …우리는 원래 동그래서 못 하지만.' },
  { id: 'c36', t: '여기 해변 와이파이 없어. 그래서 우리 집중 잘해. 너도 잠깐 꺼 볼래?' },
  { id: 'c37', t: '오늘 조개 하나 주웠는데 알고 보니 갈매기 발톱이었어. 아무튼 행운의 상징으로 하기로 함.' },
  { id: 'c38', t: '부탁: 다음에 "ㅞ" 들어간 단어는 좀 봐줘. 다리 꼬였어.' },
  // 밤
  { id: 'n01', t: '밤이다! 키위 출근 시간. 너는 퇴근해.', tag: 'night' },
  { id: 'n02', t: '늦었어. 남은 건 내일의 네가 할 거야. 걔 꽤 잘해.', tag: 'night' },
  { id: 'n03', t: '별 세는 중이야. 하나, 둘… 너도 같이 세다가 잠들어.', tag: 'night' },
  { id: 'n04', t: '밤에는 발자국이 별빛을 받아 조금 반짝여요. 오늘 당신이 걸은 길도요.', tag: 'night' },
  { id: 'n05', t: '야행성끼리 하는 말인데, 그래도 자는 게 이겨.', tag: 'night' },
  // 아침
  { id: 'm01', t: '좋은 아침. 첫 발자국이 늘 제일 깊어.', tag: 'morning' },
  { id: 'm02', t: '아침이라 우린 이제 자러 가. 오늘 하루 잘 부탁해, 낮 담당.', tag: 'morning' },
  { id: 'm03', t: '오늘의 날씨: 대체로 할 만함. 가끔 귀찮음.', tag: 'morning' },
  // 비 · 눈
  { id: 'r01', t: '비 오는 날엔 글씨가 더 진하게 남아. 오늘 쓰는 마음도 그럴 거야.', tag: 'rain' },
  { id: 'r02', t: '젖은 깃털 털다가 옆 키위한테 다 튀었어. 미안하다고 쪽지 쓰는 중.', tag: 'rain' },
  { id: 's01', t: '눈 위 발자국은 멀리서도 보여. 오늘 너도 그래.', tag: 'snow' },
  { id: 's02', t: '눈사람 만들려다 눈키위가 됐어. 부리가 녹아서 지금은 그냥 눈공.', tag: 'snow' },
  // 방금 집중 끝
  { id: 'f01', t: '방금 그 집중, 파도도 못 지워.', tag: 'focus' },
  { id: 'f02', t: '집중하는 동안 우리 조용히 걸었어. 발소리 들렸으면 미안.', tag: 'focus' },
  { id: 'f03', t: '끝까지 해낸 사람한테만 이 병이 가. 규칙이야. (방금 만든 규칙)', tag: 'focus' },
  { id: 'f04', t: '수고했어요. 이제 기지개 한 번, 창밖 한 번.', tag: 'focus' },
  // 오래 켜 둠
  { id: 'l01', t: '계속 켜 둬서 고마워. 덕분에 우리 야근 수당 받았어. (도토리로)', tag: 'long' },
  { id: 'l02', t: '오래 같이 있었네. 눈 한번 꼭 감았다 떠 봐.', tag: 'long' },
  { id: 'l03', t: '이쯤 되면 우리 거의 룸메이트야.', tag: 'long' },
];

const day0 = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const daysBetween = (a, b) => Math.round((day0(b) - day0(a)) / 864e5);

export class Bottles {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load('bottles') || '{}'); } catch (e) { s = {}; }
    this.mine = Array.isArray(s.mine) ? s.mine : [];       // [{ t 글, at 쓴 시각, src 'focus'|'write', back 돌아온 시각 }]
    this.seen = Array.isArray(s.seen) ? s.seen : [];       // 읽은 응원 쪽지 id (한 바퀴 돌면 비운다)
    this.day = s.day || ''; this.today = s.today || 0;     // 오늘 떠내려온 병 수
    this.sinceMine = s.sinceMine || 0;                     // 마지막 내 글 뒤로 온 쪽지 수
  }
  store() { this.save('bottles', JSON.stringify({ mine: this.mine, seen: this.seen, day: this.day, today: this.today, sinceMine: this.sinceMine })); }

  // 내 글 남기기 (같은 글은 처음 것만)
  keep(text, src, at = Date.now()) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if ([...t.replace(/\s/g, '')].length < 4 || /^[\d\s.:/-]+$/.test(t)) return false;   // 너무 짧거나 숫자뿐(시계)이면 안 남긴다
    if (this.mine.some(m => m.t === t)) return false;
    this.mine.push({ t, at, src });
    if (this.mine.length > KEEP) { const i = this.mine.findIndex(m => m.back); this.mine.splice(i >= 0 ? i : 0, 1); }
    this.store(); return true;
  }
  due(now = Date.now(), minDays = MIN_DAYS) { return this.mine.filter(m => !m.back && now - m.at >= minDays * 864e5); }
  get returned() { return this.mine.filter(m => m.back).length; }

  // 다음 병 고르기 → { kind:'mine', ... } | { kind:'cheer', ... } | null(오늘 몫 다 옴)
  pick(ctx, now = Date.now(), { minDays = MIN_DAYS, cap = 8 } = {}) {
    const d = new Date(now).toDateString();
    if (this.day !== d) { this.day = d; this.today = 0; }
    if (this.today >= cap) return null;
    const due = this.due(now, minDays);
    let out;
    if (due.length && (this.sinceMine >= 2 || Math.random() < 0.35)) {
      const m = due[Math.floor(Math.random() * Math.min(due.length, 4))];   // 오래된 것부터 (앞쪽 몇 개 중 하나)
      m.back = now; this.sinceMine = 0;
      out = { id: 'mine', kind: 'mine', box: 'mine', text: m.t, at: m.at, src: m.src };
    } else {
      const c = this.cheer(ctx);
      this.sinceMine++;
      out = { id: c.id, kind: 'cheer', box: 'cheer', text: c.t, by: c.by || '키위 일동' };
    }
    this.today++; this.store();
    return out;
  }
  // 응원 쪽지: 지금 상황 태그가 맞는 것을 먼저, 아니면 언제나 쪽지. 한 바퀴 돌 때까지 겹치지 않게
  cheer(ctx = {}) {
    let pool = CHEERS.filter(c => !this.seen.includes(c.id));
    if (!pool.length) { this.seen = []; pool = CHEERS.slice(); }
    const tags = Object.keys(ctx).filter(k => ctx[k]);
    const fit = pool.filter(c => c.tag && tags.includes(c.tag));
    const any = pool.filter(c => !c.tag);
    const from = fit.length && Math.random() < 0.6 ? fit : any.length ? any : pool;
    const c = from[Math.floor(Math.random() * from.length)];
    this.seen.push(c.id);
    return c;
  }
}

// 카드 제목: "10월 4일의 너에게서" (오늘이면 "오늘의 너에게서")
export function mineTitle(at, now = Date.now()) {
  const n = daysBetween(at, now), d = new Date(at);
  return n <= 0 ? '오늘의 너에게서' : n === 1 ? '어제의 너에게서' : `${d.getMonth() + 1}월 ${d.getDate()}일의 너에게서`;
}
export function mineNote(m, now = Date.now()) {
  const n = daysBetween(m.at, now), when = n <= 0 ? '오늘' : `${n}일 전`;
  return `${when} ${m.src === 'focus' ? '집중하며 쓴 한 줄' : '모래에 쓴 글'} — 파도가 가져갔다가 돌려줬어요`;
}
