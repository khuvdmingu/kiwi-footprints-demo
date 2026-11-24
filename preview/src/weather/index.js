// weather/index.js — v29.37 실제 날씨 (테스트 단계)
//
//  · 설정 › 풍경 › 날씨: 「실제 날씨」(고른 도시) / 「직접 고르기」(지금처럼 위 날씨 버튼) / 「끄기」(늘 맑음). 기본은 직접 고르기 —
//    사용자가 「실제 날씨」를 고르기 전엔 네트워크 요청이 하나도 없다.
//  · 위치 권한은 묻지 않는다. 도시를 고르고, 보내는 것은 그 도시의 좌표(소수 둘째 자리)뿐이다.
//  · 날씨 받기는 이 파일 한 곳에. 서비스는 PROVIDER 하나만 바꾸면 된다 — 지금은 키 없는 Open-Meteo(비상업 무료판).
//    ⚠ 유료 출시 전에 바꾼다: 앱 → 중계 서버(키 보관 · 도시별 1시간 저장) → 날씨 서비스(Apple WeatherKit 등). docs/WORKSTREAMS.md 백로그 참고.
//  · 한 시간에 한 번, 화면이 보일 때만. 몇 초 안에 답이 없으면 포기하고 마지막 날씨(3시간 안) 또는 앱 날씨로 둔다.
//  · 받은 날씨는 이 기기에만(localStorage) — 서비스 워커는 다른 주소(open-meteo)를 저장하지 않는다(sw.js `mine`).

export const WX_MODES = ['real', 'manual', 'off'];
export const WX_MODE_NAME = { real: '실제 날씨', manual: '직접 고르기', off: '끄기' };

export const EVERY_MS = 60 * 60 * 1000;        // 한 시간에 한 번
export const RETRY_MS = 15 * 60 * 1000;        // 실패하면 15분 뒤 다시
export const STALE_MS = 3 * 60 * 60 * 1000;    // 3시간 넘은 날씨는 쓰지 않는다
export const TIMEOUT_MS = 6000;                // 6초 안에 답이 없으면 포기

export const CITIES = [
  { id: 'seoul', name: '서울', lat: 37.57, lon: 126.98 },
  { id: 'incheon', name: '인천', lat: 37.46, lon: 126.71 },
  { id: 'suwon', name: '수원', lat: 37.26, lon: 127.03 },
  { id: 'chuncheon', name: '춘천', lat: 37.88, lon: 127.73 },
  { id: 'gangneung', name: '강릉', lat: 37.75, lon: 128.88 },
  { id: 'daejeon', name: '대전', lat: 36.35, lon: 127.38 },
  { id: 'cheongju', name: '청주', lat: 36.64, lon: 127.49 },
  { id: 'jeonju', name: '전주', lat: 35.82, lon: 127.15 },
  { id: 'gwangju', name: '광주', lat: 35.16, lon: 126.85 },
  { id: 'daegu', name: '대구', lat: 35.87, lon: 128.6 },
  { id: 'ulsan', name: '울산', lat: 35.54, lon: 129.31 },
  { id: 'busan', name: '부산', lat: 35.18, lon: 129.08 },
  { id: 'jeju', name: '제주', lat: 33.5, lon: 126.53 },
  { id: 'tokyo', name: '도쿄', lat: 35.68, lon: 139.69 },
  { id: 'seattle', name: '시애틀', lat: 47.61, lon: -122.33 },
  { id: 'sf', name: '샌프란시스코', lat: 37.77, lon: -122.42 },
  { id: 'newyork', name: '뉴욕', lat: 40.71, lon: -74.01 },
  { id: 'london', name: '런던', lat: 51.51, lon: -0.13 },
];
export const cityOf = id => CITIES.find(c => c.id === id) || CITIES[0];

// WMO 날씨 번호(+ 바람 km/h) → 앱 날씨. 꽃잎 바람은 실제 날씨에서 오지 않는다. 95~99 뇌우는 천둥번개(v30.1).
export const WIND_KMH = 30;
export function fromWmo(code, windKmh = 0) {
  const c = +code;
  if (!Number.isFinite(c)) return null;
  let w;
  if (c >= 95 && c <= 99) w = 'storm';   // v30.1 뇌우 → 천둥번개
  else if (c === 45 || c === 48) w = 'fog';
  else if ((c >= 51 && c <= 57) || c === 61 || c === 80) w = 'drizzle';
  else if ((c >= 62 && c <= 67) || c === 81 || c === 82) w = 'rain';
  else if ((c >= 71 && c <= 77) || c === 85 || c === 86) w = 'snow';
  else if (c === 3) w = 'cloudy';
  else if (c >= 0 && c <= 2) w = 'clear';
  else return null;
  if ((w === 'clear' || w === 'cloudy') && windKmh >= WIND_KMH) w = 'wind';
  return w;
}

// 서비스 한 벌 = { name, url(city), parse(json) → { code, wind } }. 출시 땐 이것만 중계 서버용으로 바꾼다.
export const openMeteo = {
  name: 'Open-Meteo',
  url: c => `https://api.open-meteo.com/v1/forecast?latitude=${c.lat.toFixed(2)}&longitude=${c.lon.toFixed(2)}&current=weather_code,wind_speed_10m&wind_speed_unit=kmh`,
  parse: j => ({ code: j?.current?.weather_code, wind: +j?.current?.wind_speed_10m || 0 }),
};
export const PROVIDER = openMeteo;

// 받는 사람. 저장은 밖에서 준다(load/store: 문자열) — main.js 는 localStorage, 시험은 메모리.
export class RealWeather {
  constructor({ provider = PROVIDER, fetch: f = (...a) => globalThis.fetch(...a), load = () => null, store = () => {} } = {}) {
    this.provider = provider; this.fetch = f; this.store = store;
    this.last = null;                 // { w, at, city }
    try { const v = JSON.parse(load() || 'null'); if (v && v.w && v.at && v.city) this.last = v; } catch (e) {}
    this.nextAt = 0; this.busy = false; this.fails = 0;
  }
  // 쓸 수 있는 마지막 날씨 (그 도시 · 3시간 안) — 없으면 null
  fresh(city, now = Date.now()) {
    const l = this.last;
    return l && l.city === city && now - l.at >= 0 && now - l.at < STALE_MS ? l.w : null;
  }
  due(city, now = Date.now()) {
    if (this.busy) return false;
    const l = this.last;
    if (l && l.city === city && now - l.at < EVERY_MS && now >= l.at) return false;
    return now >= this.nextAt;
  }
  // 도시를 바꾸면 바로 받는다
  reset() { this.nextAt = 0; this.fails = 0; }
  // 받아 오기 → 앱 날씨 또는 null(실패). 실패해도 던지지 않는다.
  async refresh(city, now = Date.now()) {
    if (this.busy) return null;
    this.busy = true;
    const c = cityOf(city);
    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    let timer;
    try {
      const res = await Promise.race([
        this.fetch(this.provider.url(c), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ac?.signal }),
        new Promise((_, no) => { timer = setTimeout(() => { ac?.abort(); no(new Error('timeout')); }, TIMEOUT_MS); }),
      ]);
      if (!res || !res.ok) throw new Error('http ' + (res && res.status));
      const { code, wind } = this.provider.parse(await res.json());
      const w = fromWmo(code, wind);
      if (!w) throw new Error('unknown code ' + code);
      this.last = { w, at: now, city: c.id, code: +code };
      try { this.store(JSON.stringify(this.last)); } catch (e) {}
      this.nextAt = 0; this.fails = 0;   // 다음은 due() 가 마지막 받은 시각으로 정한다(도시를 바꾸면 바로)
      return w;
    } catch (e) {
      this.fails++; this.nextAt = now + RETRY_MS;
      return null;
    } finally { clearTimeout(timer); this.busy = false; }
  }
}
