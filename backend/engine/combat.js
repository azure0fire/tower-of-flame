// ============================================================
// 불꽃의 탑 - 전투 엔진
//
// [!] 아직 정확한 수치가 정해지지 않은 부분은 CONFIG에 placeholder로
//     넣어뒀습니다. 실제로는 대화에서 결정된 값만 반영하고, 나머지는
//     추정치이니 실제 밸런스 잡을 때 조정하세요.
// ============================================================

const CONFIG = {
  CRIT_MULT: 2.0,        // [결정됨] 크리티컬 2배
  DODGE_MAX: 60,         // [추정] 최대 회피율 %
  DODGE_K: 30,           // [결정됨] 회피 공식 K값
  CRIT_MAX: 50,          // [추정] 최대 크리티컬 확률 %
  CRIT_K: 30,            // [추정] 행운 기반 크리티컬 확률 K값 (회피 공식과 동일 스타일로 추정)
  DEFEND_MULT: 1.3,      // [추정] '방어' 행동 시 방어력 배율 (+30%)
  MP_REGEN_RATIO: 0.2,   // [추정] 턴당 마력 회복량 = 지능 * 이 값 (최소 1)
};

function maxMp(intStat) {
  return intStat; // [결정됨] 지능 수치 = 최대 마력
}

function mpRegenPerTurn(intStat) {
  return Math.max(1, Math.round(intStat * CONFIG.MP_REGEN_RATIO));
}

function dodgeChance(defenderAgi, attackerAgi) {
  const diff = defenderAgi - attackerAgi;
  if (diff <= 0) return 0;
  return CONFIG.DODGE_MAX * (diff / (diff + CONFIG.DODGE_K)) / 100;
}

function critChance(attackerLuk) {
  return CONFIG.CRIT_MAX * (attackerLuk / (attackerLuk + CONFIG.CRIT_K)) / 100;
}

// 한 번의 공격 판정을 처리 (attacker가 defender를 공격)
function resolveAttack(attacker, defender, opts = {}) {
  const { atkMult = 1, defPierce = 0, bonusCrit = 0, noDodge = false, isDefending = false, defendMult = CONFIG.DEFEND_MULT } = opts;

  const effAtk = attacker.stats.atk * atkMult;
  let effDef = defender.stats.def * (isDefending ? defendMult : 1);
  effDef = effDef * (1 - defPierce);

  // 회피 판정
  if (!noDodge) {
    const dChance = dodgeChance(defender.stats.agi, attacker.stats.agi);
    if (Math.random() < dChance) {
      return { hit: false, dodged: true, damage: 0, crit: false };
    }
  }

  // 데미지 계산 (최소 데미지 1 보장)
  let damage = Math.max(1, Math.round(effAtk - effDef));

  // 크리티컬 판정
  const cChance = Math.min(0.95, critChance(attacker.stats.luk) + bonusCrit);
  let crit = false;
  if (Math.random() < cChance) {
    damage = Math.round(damage * CONFIG.CRIT_MULT);
    crit = true;
  }

  return { hit: true, dodged: false, damage, crit };
}

module.exports = { CONFIG, maxMp, mpRegenPerTurn, dodgeChance, critChance, resolveAttack };
