const { CHARACTERS, MONSTERS } = require("./data");
const { maxMp, mpRegenPerTurn, resolveAttack } = require("./combat");

function makeFighter(base) {
  return {
    name: base.name,
    stats: { ...base.stats },
    hp: base.stats.hp,
    maxHp: base.stats.hp,
    mp: base.stats.int !== undefined ? maxMp(base.stats.int) : 0,
    maxMp: base.stats.int !== undefined ? maxMp(base.stats.int) : 0,
    pendingDefense: null,
  };
}

// 플레이어 행동 정책 (간단한 규칙 기반 봇)
function choosePlayerAction(player, charDef) {
  const [skill1, skill2] = charDef.skills;
  const hpRatio = player.hp / player.maxHp;

  // 회복형 스킬(healPct 있음)은 체력 낮을 때 우선 사용
  const healSkill = charDef.skills.find((s) => s.effect(player).healPct);
  if (healSkill && hpRatio < 0.4 && player.mp >= healSkill.mp) {
    return { skill: healSkill };
  }

  // 공격형 스킬(atkMult 존재)을 MP 되는대로 우선 사용
  const atkSkills = charDef.skills.filter((s) => s.effect(player).atkMult);
  for (const s of atkSkills.sort((a, b) => b.mp - a.mp)) {
    if (player.mp >= s.mp) return { skill: s };
  }

  // 방어형 스킬 중 비용 0짜리는 가끔 섞어씀 (30% 확률)
  const freeDefend = charDef.skills.find((s) => s.mp === 0 && s.effect(player).defMult);
  if (freeDefend && Math.random() < 0.3) return { skill: freeDefend };

  return { basicAttack: true };
}

// 몬스터 AI 행동 정책
function chooseMonsterAction(monster) {
  const hpRatio = monster.hp / monster.maxHp;
  let attackProb;
  if (monster.ai === "attack") attackProb = 0.8;
  else if (monster.ai === "defense") attackProb = hpRatio > 0.5 ? 0.5 : 0.3;
  else attackProb = 0.6; // balance

  return Math.random() < attackProb ? "attack" : "defend";
}

function applySkillDefend(actor, skill) {
  const eff = skill.effect(actor);
  actor.pendingDefense = { defendMult: eff.defMult || 1, healPct: eff.healPct || 0, counterPct: eff.counterPct || 0 };
}

function doAttack(attacker, defender, opts) {
  const result = resolveAttack(attacker, defender, {
    ...opts,
    isDefending: !!defender.pendingDefense,
    defendMult: defender.pendingDefense ? defender.pendingDefense.defendMult : 1,
  });
  if (result.hit) {
    defender.hp = Math.max(0, defender.hp - result.damage);
    if (defender.pendingDefense) {
      const { healPct, counterPct } = defender.pendingDefense;
      if (healPct) defender.hp = Math.min(defender.maxHp, defender.hp + Math.round(defender.maxHp * healPct));
      if (counterPct) {
        const counterDmg = Math.max(1, Math.round(result.damage * counterPct));
        attacker.hp = Math.max(0, attacker.hp - counterDmg);
      }
      defender.pendingDefense = null;
    }
  }
  return result;
}

function simulateBattle(charKey) {
  const charDef = CHARACTERS[charKey];

  return function (monsterDef) {
    const player = makeFighter({ name: charDef.name, stats: charDef.baseStats });
    const monster = makeFighter(monsterDef);
    let turn = 0;
    const maxTurns = 50;

    while (player.hp > 0 && monster.hp > 0 && turn < maxTurns) {
      turn++;
      // 마력 자동 회복 (매 턴)
      player.mp = Math.min(player.maxMp, player.mp + mpRegenPerTurn(player.stats.int));

      const order = player.stats.agi >= monster.stats.agi ? ["player", "monster"] : ["monster", "player"];

      for (const who of order) {
        if (player.hp <= 0 || monster.hp <= 0) break;

        if (who === "player") {
          const action = choosePlayerAction(player, charDef);
          if (action.basicAttack) {
            doAttack(player, monster, {});
          } else {
            const eff = action.skill.effect(player);
            player.mp -= action.skill.mp;
            if (eff.atkMult) {
              doAttack(player, monster, {
                atkMult: eff.atkMult,
                defPierce: eff.defPierce || 0,
                bonusCrit: eff.bonusCrit || 0,
                noDodge: !!eff.noDodge,
              });
            } else {
              applySkillDefend(player, action.skill);
            }
          }
        } else {
          const action = chooseMonsterAction(monster);
          if (action === "attack") {
            doAttack(monster, player, {});
          } else {
            monster.pendingDefense = { defendMult: 1.3, healPct: 0, counterPct: 0 };
          }
        }
      }
    }

    return { win: player.hp > 0 && monster.hp <= 0, turns: turn, timeout: turn >= maxTurns };
  };
}

function runTrials(charKey, monsterDef, trials = 2000) {
  const battle = simulateBattle(charKey);
  let wins = 0;
  let totalTurns = 0;
  for (let i = 0; i < trials; i++) {
    const result = battle(monsterDef);
    if (result.win) wins++;
    totalTurns += result.turns;
  }
  return { winRate: ((wins / trials) * 100).toFixed(1), avgTurns: (totalTurns / trials).toFixed(1) };
}

function main() {
  console.log("=== 1구간(1~20층) 몬스터 vs 시작 캐릭터 승률 시뮬레이션 (각 2000회) ===\n");
  const zone1 = MONSTERS.filter((m) => m.zone === 1);
  for (const charKey of Object.keys(CHARACTERS)) {
    const name = CHARACTERS[charKey].name;
    console.log(`--- ${charKey}번 ${name} ---`);
    for (const monster of zone1) {
      const { winRate, avgTurns } = runTrials(charKey, monster);
      console.log(`  vs ${monster.name.padEnd(14, " ")}  승률 ${winRate}%  (평균 ${avgTurns}턴)`);
    }
    console.log("");
  }
}

if (require.main === module) main();

module.exports = { simulateBattle, runTrials };
