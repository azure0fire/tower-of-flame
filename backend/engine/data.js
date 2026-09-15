// ============================================================
// 불꽃의 탑 - 게임 데이터
// 스탯: 공격(atk) / 방어(def) / 체력(hp) / 민첩(agi) / 행운(luk) / 지능(int, 플레이어 전용 - 최대 마력 결정)
// ============================================================

const CHARACTERS = {
  0: {
    name: "모험가",
    baseStats: { atk: 5, def: 5, hp: 5, agi: 5, luk: 5, int: 5 },
    skills: [
      { id: "s1", name: "강타", mp: 1, effect: (self) => ({ atkMult: 1.3 }) },
      { id: "s2", name: "재정비", mp: 2, effect: (self) => ({ defMult: 1.2, healPct: 0.1 }) },
    ],
  },
  1: {
    name: "화염 기사",
    baseStats: { atk: 6, def: 9, hp: 9, agi: 2, luk: 2, int: 2 },
    skills: [
      { id: "s1", name: "잿더미 방벽", mp: 0, effect: (self) => ({ defMult: 1.5 }) },
      { id: "s2", name: "재의 반격", mp: 1, effect: (self) => ({ defMult: 1.2, counterPct: 0.4 }) },
    ],
  },
  2: {
    name: "비술사",
    baseStats: { atk: 4, def: 4, hp: 9, agi: 4, luk: 4, int: 5 },
    skills: [
      { id: "s1", name: "화염 폭발", mp: 3, effect: (self) => ({ atkMult: 1.0, defPierce: 0.5, bonusCrit: 0.2, noDodge: true }) },
      { id: "s2", name: "과열", mp: 2, effect: (self) => ({ atkMult: 1.5, defMult: 0.5 }) },
    ],
  },
};

// 몬스터 AI 유형: attack(공격형) / defense(방어형) / balance(밸런스형)
const MONSTERS = [
  // 1구간 (1~20층) - 타오르는 입구
  { zone: 1, name: "숲의 화염 슬라임", stats: { atk: 6, def: 5, hp: 10, agi: 2, luk: 2 }, ai: "balance", dropRate: 0.01 },
  { zone: 1, name: "재 뿌리는 박쥐", stats: { atk: 8, def: 3, hp: 7, agi: 7, luk: 3 }, ai: "attack", dropRate: 0.05 },
  { zone: 1, name: "타오르는 고블린 족장", stats: { atk: 10, def: 7, hp: 12, agi: 4, luk: 2 }, ai: "balance", dropRate: 0.10, boss: true },

  // 2구간 (21~40층) - 붉은 바위 절벽
  { zone: 2, name: "화산 암석 가고일", stats: { atk: 15, def: 25, hp: 20, agi: 5, luk: 5 }, ai: "defense", dropRate: 0.01 },
  { zone: 2, name: "열기를 품은 오거", stats: { atk: 28, def: 15, hp: 30, agi: 7, luk: 5 }, ai: "attack", dropRate: 0.05 },
  { zone: 2, name: "돌갑옷 골렘", stats: { atk: 20, def: 35, hp: 40, agi: 5, luk: 5 }, ai: "defense", dropRate: 0.10, boss: true },

  // 3구간 (41~60층) - 제련되지 않은 철광산
  { zone: 3, name: "화염 철광석 코볼트", stats: { atk: 35, def: 30, hp: 45, agi: 25, luk: 10 }, ai: "balance", dropRate: 0.01 },
  { zone: 3, name: "용광로 경비병", stats: { atk: 50, def: 50, hp: 60, agi: 15, luk: 10 }, ai: "balance", dropRate: 0.05 },
  { zone: 3, name: "강철 가시 스파이더", stats: { atk: 55, def: 30, hp: 50, agi: 55, luk: 20 }, ai: "attack", dropRate: 0.10, boss: true },

  // 4구간 (61~80층) - 신비한 미스릴 통로
  { zone: 4, name: "미스릴 환영 사냥꾼", stats: { atk: 80, def: 50, hp: 70, agi: 90, luk: 30 }, ai: "attack", dropRate: 0.01 },
  { zone: 4, name: "푸른 불꽃의 정령", stats: { atk: 110, def: 40, hp: 60, agi: 100, luk: 80 }, ai: "attack", dropRate: 0.05 },
  { zone: 4, name: "은빛 수호 기사", stats: { atk: 95, def: 110, hp: 120, agi: 50, luk: 50 }, ai: "defense", dropRate: 0.10, boss: true },

  // 5구간 (81~100층) - 금강석의 궁전
  { zone: 5, name: "다이아몬드 가고일", stats: { atk: 120, def: 180, hp: 150, agi: 60, luk: 60 }, ai: "defense", dropRate: 0.01 },
  { zone: 5, name: "결정체 집행자", stats: { atk: 160, def: 120, hp: 140, agi: 120, luk: 80 }, ai: "attack", dropRate: 0.05 },
  { zone: 5, name: "휘황찬란한 금강 골렘", stats: { atk: 140, def: 230, hp: 200, agi: 50, luk: 70 }, ai: "defense", dropRate: 0.10, boss: true },
];

const ZONE_MATERIALS = {
  1: { material: "불씨 파편", modifier: "온기 있는", effect: "HP 회복 효과 +5%" },
  2: { material: "화산 결정", modifier: "견고한", effect: "방어력 +10" },
  3: { material: "용광로 정수", modifier: "달구어진", effect: "공격력 +15" },
  4: { material: "환영의 미스릴", modifier: "신비로운", effect: "스킬 마력 소모량 -10%" },
  5: { material: "찬란한 원석", modifier: "영롱한", effect: "행운 +20" },
};

module.exports = { CHARACTERS, MONSTERS, ZONE_MATERIALS };
