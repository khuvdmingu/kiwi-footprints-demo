// content.js — 키위가 저절로 쓰는 글: 시계 · 명언 · 단어장 · 응원
//  명언은 출처가 분명한 고전·오래된 속담만 쓴다(저작권이 끝났거나 관용구). 출처가 한 사람으로 확정되지 않으면 '속담'으로 적는다.
//  화면에는 영어를 키위가 쓰고, 다 쓴 뒤 한국어 뜻·출처가 캡션으로 드러난다(플래시카드처럼).

// v29.14 구경(watch): 아무 글도 쓰지 않고 키위가 돌아다니는 것만 본다 (입력 칸·자막도 숨김)
// 응원(cheer): 키위가 짧은 응원 한마디를 모래에 쓰고, 다 쓰면 조금 긴 말이 캡션으로 드러난다
export const MODES = ['free', 'clock', 'quote', 'word', 'cheer', 'watch'];
export const MODE_NAME = { free: '직접 쓰기', clock: '시계', quote: '명언', word: '단어장', cheer: '응원', watch: '구경' };
export const isAuto = m => m === 'clock' || m === 'quote' || m === 'word' || m === 'cheer';   // 저절로 다음 글을 쓰는 모드
export const isClock = m => m === 'clock';
// 시각 표기: ko 「오전 6:55」 · en 「AM 6:55」 · 24 「18:55」 (초는 표기와 따로 켜고 끈다)
export const CLOCK_FMTS = ['ko', 'en', '24'];

export const QUOTES = [
  { en: 'Step by step', ko: '한 걸음씩', by: '영어 관용구' },
  { en: 'Slow and steady wins the race', ko: '느려도 꾸준하면 이긴다', by: '이솝 우화 「토끼와 거북」의 교훈' },
  { en: 'Know thyself', ko: '너 자신을 알라', by: '델포이 신전의 격언' },
  { en: 'Time is money', ko: '시간은 돈이다', by: 'Benjamin Franklin, 1748' },
  { en: 'Knowledge is power', ko: '아는 것이 힘이다', by: 'Francis Bacon (라틴어 원문을 옮긴 말)' },
  { en: 'Less is more', ko: '적을수록 더 좋다', by: 'Robert Browning, 1855' },
  { en: 'Carpe diem', ko: '오늘을 붙잡아라', by: 'Horace, 「송가」' },
  { en: 'This too shall pass', ko: '이 또한 지나가리라', by: '페르시아 격언' },
  { en: 'Fortune favors the bold', ko: '행운은 용감한 자의 편', by: '라틴어 격언' },
  { en: 'To be or not to be', ko: '사느냐 죽느냐', by: 'Shakespeare, 「햄릿」' },
  { en: 'I think, therefore I am', ko: '나는 생각한다, 고로 존재한다', by: 'René Descartes' },
  { en: 'Well begun is half done', ko: '시작이 반이다', by: '아리스토텔레스의 말로 전해진다' },
  { en: 'Better late than never', ko: '늦더라도 안 하는 것보다 낫다', by: '영어 속담' },
  { en: 'Actions speak louder than words', ko: '말보다 행동', by: '영어 속담' },
  { en: 'The early bird catches the worm', ko: '일찍 일어나는 새가 벌레를 잡는다', by: '영어 속담 (키위는 밤에 일어난다)' },
  { en: 'Every cloud has a silver lining', ko: '모든 구름 뒤엔 은빛이 있다 — 나쁜 일에도 좋은 면이 있다', by: '영어 속담' },
  { en: 'Where there is a will, there is a way', ko: '뜻이 있는 곳에 길이 있다', by: '영어 속담' },
  { en: 'No pain, no gain', ko: '수고 없이는 얻는 것도 없다', by: '영어 속담' },
  { en: 'Home sweet home', ko: '즐거운 나의 집', by: 'John Howard Payne, 1823' },
  { en: 'All is well', ko: '모든 게 괜찮아', by: '영어 관용구' },
];

export const WORDS = [
  { en: 'breeze', ko: '산들바람', pos: '명사' }, { en: 'shore', ko: '해안, 물가', pos: '명사' },
  { en: 'tide', ko: '밀물과 썰물', pos: '명사' }, { en: 'footprint', ko: '발자국', pos: '명사' },
  { en: 'wander', ko: '거닐다, 돌아다니다', pos: '동사' }, { en: 'gentle', ko: '다정한, 부드러운', pos: '형용사' },
  { en: 'calm', ko: '차분한, 고요한', pos: '형용사' }, { en: 'dawn', ko: '새벽', pos: '명사' },
  { en: 'dusk', ko: '해 질 녘', pos: '명사' }, { en: 'serene', ko: '평온한', pos: '형용사' },
  { en: 'curious', ko: '호기심 많은', pos: '형용사' }, { en: 'patient', ko: '참을성 있는', pos: '형용사' },
  { en: 'brave', ko: '용감한', pos: '형용사' }, { en: 'cozy', ko: '아늑한', pos: '형용사' },
  { en: 'drizzle', ko: '이슬비', pos: '명사' }, { en: 'horizon', ko: '수평선, 지평선', pos: '명사' },
  { en: 'pebble', ko: '조약돌', pos: '명사' }, { en: 'seashell', ko: '조개껍데기', pos: '명사' },
  { en: 'meadow', ko: '풀밭, 목초지', pos: '명사' }, { en: 'moonlight', ko: '달빛', pos: '명사' },
  { en: 'firefly', ko: '반딧불이', pos: '명사' }, { en: 'sparkle', ko: '반짝이다', pos: '동사' },
  { en: 'journey', ko: '여정', pos: '명사' }, { en: 'steady', ko: '꾸준한, 흔들림 없는', pos: '형용사' },
  { en: 'cheerful', ko: '쾌활한', pos: '형용사' }, { en: 'whisper', ko: '속삭이다', pos: '동사' },
  { en: 'glow', ko: '은은하게 빛나다', pos: '동사' }, { en: 'nest', ko: '둥지', pos: '명사' },
  { en: 'snowflake', ko: '눈송이', pos: '명사' }, { en: 'rainbow', ko: '무지개', pos: '명사' },
];

// 응원: 모래에 쓰는 짧은 한마디(t) + 다 쓰면 드러나는 캡션(ko). 키위 말투(반말, 쪽지와 같은 결).
//  한글과 영어를 번갈아 쓴다. 한글은 캡션에 조금 긴 말, 영어는 캡션에 한글 뜻(명언·단어장처럼).
//  모래 글은 '/' 로 줄을 나눈다. 세로 화면에서도 크게 보이게 한 줄 한글 9자·영어 12자 이하. 쓸 수 있는 부호: . , ! ? ~ ♥ ' -
//  아침(5~10시)·밤(22~4시)엔 가끔(4번에 1번꼴) 그 시간용 한마디를 쓴다 — cheerFor()
//  MVP 문구다. 다듬을 제안(6개)은 docs/WORKSTREAMS.md 「나중에 할 것」 › 「글 모드 응원 — 문구 다듬기」에 있다.
export const SAND_CHEERS = [
  { t: '오늘도/잘했어', ko: '여기까지 온 것만으로 충분해' },
  { t: '천천히/가도 돼', ko: '키위도 빨리는 못 달려. 그래도 바다까지 와' },
  { t: '쉬어도/괜찮아', ko: '쉬는 것도 하는 거야' },
  { t: '한 걸음이면/돼', ko: '오늘은 딱 한 발자국만 찍자' },
  { t: '거의 다/왔어!', ko: '뒤를 봐, 발자국이 이만큼이야' },
  { t: '잘하고/있어', ko: '티가 안 나도 차곡차곡 쌓이는 중이야' },
  { t: '실수해도/괜찮아', ko: '파도가 지워 줄 거야. 다시 쓰면 돼' },
  { t: '지워져도/다시 쓰면 돼', ko: '글씨는 지워져도 모래는 그대로 있어' },
  { t: '넌 생각보다/강해', ko: '오늘 버틴 걸 보면 알 수 있어' },
  { t: '지금도/충분해', ko: '더 잘하지 않아도 이미 괜찮아' },
  { t: '오늘/수고했어', ko: '키위들이 줄 서서 박수 치는 중' },
  { t: '너를/믿어', ko: '키위들은 처음부터 네 편이었어' },
  { t: '할 수/있어!', ko: '어제의 너도 해냈잖아' },
  { t: '같이/있을게', ko: '혼자인 것 같을 때도 우리가 여기 있어' },
  { t: '작은 것도/대단해', ko: '작은 걸 해낸 날이 모여서 큰 날이 돼' },
  { t: '조금만/더 힘내', ko: '조금만 더 가면 쉬는 자리가 있어' },
  { t: '너답게/하면 돼', ko: '남의 발자국 말고 네 발자국으로' },
  { t: '괜찮아,/다 괜찮아', ko: '정말이야. 키위들이 확인했어' },
  { t: '숨 한 번/쉬자', ko: '들이쉬고… 내쉬고… 좋아' },
  { t: '물/마셨어?', ko: '키위가 걱정돼서 물어보는 거야' },
  { t: '기지개/한 번!', ko: '어깨 쭉, 날개 쭉. 키위도 같이 할게' },
  { t: '멈춰도/길은 남아', ko: '찍어 둔 발자국은 어디 안 가' },
  { t: '비 와도/괜찮아', ko: '키위는 비 오는 날 더 잘 걸어' },
  { t: '오늘 하루도/고마워', ko: '여기 와 줘서, 버텨 줘서' },
  { t: '너 최고야♥', ko: '키위들이 만장일치로 정했어' },
  { t: '응원해!', ko: '모래가 다 닳을 때까지 쓸 거야' },
  { t: '포기하지/마', ko: '멈춰도 되는데, 그만두진 말자' },
  { t: '내일은/내일의 해', ko: '오늘 못 한 건 내일의 몫으로 두자' },
];
export const SAND_CHEERS_MORNING = [
  { t: '좋은/아침!', ko: '오늘도 같이 걸어 보자' },
  { t: '오늘도/화이팅!', ko: '첫 발자국은 키위들이 찍어 둘게' },
  { t: '천천히/일어나도 돼', ko: '해도 아직 기지개 켜는 중이야' },
];
export const SAND_CHEERS_NIGHT = [
  { t: '오늘도/고생했어', ko: '이제 내려놓아도 돼' },
  { t: '푹/자', ko: '키위들이 밤새 바닷가를 지킬게' },
  { t: '내일 또/만나', ko: '모래는 파도가 고르게 펴 둘 거야' },
];
export const SAND_CHEERS_EN = [
  { t: 'YOU GOT/THIS', ko: '넌 해낼 수 있어' },
  { t: 'KEEP/GOING', ko: '계속 가 보자' },
  { t: 'ONE STEP/AT A TIME', ko: '한 번에 한 걸음씩' },
  { t: 'WELL DONE', ko: '잘했어' },
  { t: 'YOU ARE/ENOUGH', ko: '너는 지금 그대로 충분해' },
  { t: 'TAKE A/BREATH', ko: '숨 한 번 쉬어' },
  { t: 'ALMOST/THERE', ko: '거의 다 왔어' },
  { t: 'PROUD/OF YOU', ko: '네가 자랑스러워' },
  { t: "IT'S OK/TO REST", ko: '쉬어도 괜찮아' },
  { t: 'BELIEVE IN/YOURSELF', ko: '너 자신을 믿어' },
  { t: 'STAY/STRONG', ko: '힘내, 조금만 버텨 보자' },
  { t: 'YOU CAN/DO IT!', ko: '넌 할 수 있어!' },
  { t: 'NEVER/GIVE UP', ko: '포기하지 마' },
  { t: 'LITTLE BY/LITTLE', ko: '조금씩, 천천히' },
  { t: 'TRY/AGAIN', ko: '다시 해 보자' },
  { t: 'YOU/MATTER', ko: '너는 소중해' },
  { t: 'SHINE ON', ko: '계속 빛나 줘' },
  { t: 'BE KIND TO/YOURSELF', ko: '너 자신에게 다정하게 대해 줘' },
  { t: "I'M WITH/YOU♥", ko: '내가 네 옆에 있어' },
  { t: 'NO RUSH', ko: '서두르지 않아도 돼' },
  { t: "YOU'RE/DOING GREAT", ko: '잘하고 있어' },
];
export const SAND_CHEERS_EN_MORNING = [
  { t: 'GOOD/MORNING', ko: '좋은 아침' },
  { t: 'NEW DAY,/NEW START', ko: '새로운 날, 새로운 시작' },
  { t: 'RISE AND/SHINE', ko: '일어나, 해가 떴어' },
];
export const SAND_CHEERS_EN_NIGHT = [
  { t: 'GOOD/NIGHT', ko: '잘 자' },
  { t: 'SWEET/DREAMS', ko: '좋은 꿈 꿔' },
  { t: 'REST/WELL', ko: '푹 쉬어' },
];
const cheerTime = hour => { const h = Math.floor(hour) % 24; return h >= 5 && h < 11 ? 'morning' : (h >= 22 || h < 5) ? 'night' : null; };
// 다음 응원 한마디: 그 말(lang 'ko'|'en')의 늘 쓰는 덱에서, 아침·밤엔 4번에 1번꼴로 그 시간용 덱에서
//  decks = { ko: { all, morning, night }, en: { all, morning, night } } · 돌려주는 것 { t, ko, lang }
export function cheerFor(hour, decks, lang = 'ko', rnd = Math.random) {
  const d = decks[lang] || decks.ko, t = cheerTime(hour);
  const it = t && d[t] && rnd() < 0.25 ? d[t].next() : d.all.next();
  return { ...it, lang: decks[lang] ? lang : 'ko' };
}
export const cheerDecks = () => ({
  ko: { all: new Deck(SAND_CHEERS), morning: new Deck(SAND_CHEERS_MORNING), night: new Deck(SAND_CHEERS_NIGHT) },
  en: { all: new Deck(SAND_CHEERS_EN), morning: new Deck(SAND_CHEERS_EN_MORNING), night: new Deck(SAND_CHEERS_EN_NIGHT) },
});

// 같은 것이 금방 다시 나오지 않게 섞어서 차례로
export class Deck {
  constructor(items) { this.items = items; this.order = []; }
  next() {
    if (!this.order.length) {
      this.order = this.items.map((_, i) => i);
      for (let i = this.order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.order[i], this.order[j]] = [this.order[j], this.order[i]]; }
    }
    return this.items[this.order.pop()];
  }
}

// 시계 글: "오후 3:42"
export function clockText(hour, fmt = 'ko') {
  const h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60 + 1e-6), mm = String(m).padStart(2, '0');
  if (fmt === '24') return `${h}:${mm}`;
  const ap = fmt === 'en' ? (h < 12 ? 'AM' : 'PM') : (h < 12 ? '오전' : '오후');
  return `${ap} ${h % 12 || 12}:${mm}`;
}
