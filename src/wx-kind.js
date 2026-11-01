// wx-kind.js — v30.1 날씨 종류 판단 한 곳 (atmos·손님·드문 순간·물가 물건·음악·항해가 같이 쓴다)
//  「천둥번개」(storm)는 비다. 보슬비까지 젖는 날로 칠 땐 isWet.
export const isRain = w => w === 'rain' || w === 'storm';
export const isWet = w => isRain(w) || w === 'drizzle';
