// letters/ko/animals/fennec.js — 사막여우 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'fennec-v1', t: '귀가 커서 모래 밑 작은 소리까지 들려요. 당신 마음 소리도 조금 들렸어요.' },
    { id: 'fennec-v2', t: '낮엔 굴에서 자고 해 질 녘에 나와요. 하루를 늦게 시작해도 괜찮아요.' },
    { id: 'fennec-v3', t: '발바닥에 털이 있어서 뜨거운 모래도 견뎌요. 당신에게도 그런 털이 있을 거예요.' },
  ],
  thanks: [
    { id: 'fennec-t1', t: '큰 귀로 {gift.eul} 찾았어요. 모래 속에서도 반짝이는 소리가 들렸어요.' },
    { id: 'fennec-t2', t: '{gift.eul} 굴 깊숙이 가져갔어요. 낮에는 시원한 데 두어야 하니까요.' },
    { id: 'fennec-t3', t: '밤 사막을 건너며 {gift.eul} 꼭 물고 있었어요. 별이 길을 비춰 줬어요.' },
    { id: 'fennec-t4', t: '{gift.iga} 놓인 자리에 귀를 대 보니 당신 발소리가 남아 있었어요.' },
  ],
  liked: [
    { id: 'fennec-l1', key: 'f:desertrose', t: '큰 귀에 대 보니 사막 바람 소리가 들려요. 굴 입구에 걸어 둘게요.' },
    { id: 'fennec-l2', key: 'f:goldstone', t: '금빛 돌이 달빛을 받아 반짝여요. 밤에 길을 잃으면 이걸 따라올게요.' },
    { id: 'fennec-l3', key: 'f:sandstone', t: '사암 조약돌을 굴 벽에 박았어요. 우리 집에 창문이 하나 생긴 것 같아요.' },
  ],
};
