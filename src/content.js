// content.js — 키위가 저절로 쓰는 글: 시계 · 명언 · 단어장
//  명언은 출처가 분명한 고전·오래된 속담만 쓴다(저작권이 끝났거나 관용구). 출처가 한 사람으로 확정되지 않으면 '속담'으로 적는다.
//  화면에는 영어를 키위가 쓰고, 다 쓴 뒤 한국어 뜻·출처가 캡션으로 드러난다(플래시카드처럼).

export const MODES = ['free', 'clock', 'clocksec', 'quote', 'word'];
export const MODE_NAME = { free: '직접 쓰기', clock: '시계', clocksec: '시계 · 초', quote: '명언', word: '단어장' };
export const isClock = m => m === 'clock' || m === 'clocksec';

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
export function clockText(hour) {
  const h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60 + 1e-6);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`;
}
