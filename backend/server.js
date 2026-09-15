const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { CHARACTERS, MONSTERS, ZONE_MATERIALS } = require("./engine/data");
const { maxMp, mpRegenPerTurn, resolveAttack, CONFIG } = require("./engine/combat");

const app = express();
app.use(cors());
app.use(express.json());

// [!] MVP 단계: 메모리 저장. 실제로는 Firebase Firestore로 교체 예정.
const sessions = new Map();

function makeFighter(name, stats) {
  return {
    name,
    stats: { ...stats },
    hp: stats.hp,
    maxHp: stats.hp,
    mp: stats.int !== undefined ? maxMp(stats.int) : 0,
    maxMp: stats.int !== undefined ? maxMp(stats.int) : 0,
    pendingDefense: null,
  };
}

function zoneOfFloor(floor) {
  return Math.min(5, Math.ceil(floor / 20));
}

function spawnMonster(floor) {
  const zone = zoneOfFloor(floor);
  const zoneMonsters = MONSTERS.filter((m) => m.zone === zone);
  const isBossFloor = floor % 20 === 0;
  const def = isBossFloor
    ? zoneMonsters.find((m) => m.boss)
    : zoneMonsters.filter((m) => !m.boss)[Math.floor(Math.random() * 2)];
  return { def, fighter: makeFighter(def.name, def.stats) };
}

function chooseMonsterAction(monster) {
  const hpRatio = monster.hp / monster.maxHp;
  let attackProb;
  if (monster.ai === "attack") attackProb = 0.8;
  else if (monster.ai === "defense") attackProb = hpRatio > 0.5 ? 0.5 : 0.3;
  else attackProb = 0.6;
  return Math.random() < attackProb ? "attack" : "defend";
}

function doAttack(attacker, defender, opts, log) {
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
        log.push(`${defender.name}의 반격! ${attacker.name}에게 ${counterDmg}의 피해.`);
      }
      defender.pendingDefense = null;
    }
    log.push(
      result.crit
        ? `${attacker.name}의 치명타! ${defender.name}에게 ${result.damage}의 피해.`
        : `${attacker.name}의 공격, ${defender.name}에게 ${result.damage}의 피해.`
    );
  } else if (result.dodged) {
    log.push(`${defender.name}이(가) ${attacker.name}의 공격을 회피했다!`);
  }
  return result;
}

// 새 세션(캐릭터 선택) 생성
app.post("/api/session", (req, res) => {
  const { charKey, playerName } = req.body;
  const charDef = CHARACTERS[charKey];
  if (!charDef) return res.status(400).json({ error: "invalid charKey" });

  const sessionId = crypto.randomUUID();
  const player = makeFighter(playerName || charDef.name, charDef.baseStats);
  sessions.set(sessionId, { charKey, charDef, player, floor: 0, monster: null, monsterDef: null, log: [] });

  res.json({ sessionId, player, charName: charDef.name });
});

// 탑 진입 (항상 1층부터)
app.post("/api/session/:id/enter-tower", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "session not found" });

  // 층수 진행도만 초기화 (플레이어 스탯/레벨/아이템은 유지)
  session.floor = 1;
  session.player.hp = session.player.maxHp;
  session.player.mp = session.player.maxMp;
  session.player.pendingDefense = null;

  const { def, fighter } = spawnMonster(session.floor);
  session.monster = fighter;
  session.monsterDef = def;
  session.log = [`${session.floor}층 진입. ${def.name}이(가) 나타났다!`];

  res.json(sessionState(session));
});

// 전투 행동 처리 (한 번의 왕복 = 플레이어 행동 + 몬스터 행동)
app.post("/api/session/:id/action", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "session not found" });
  if (!session.monster) return res.status(400).json({ error: "no active battle, call enter-tower first" });

  const { action } = req.body; // 'attack' | 'skill1' | 'skill2' | 'defend'
  const { player, monster, charDef } = session;
  const log = [];

  if (player.hp <= 0 || monster.hp <= 0) {
    return res.status(400).json({ error: "battle already over, call enter-tower or next-floor" });
  }

  // 마력 자동 회복 (매 턴 시작 시)
  player.mp = Math.min(player.maxMp, player.mp + mpRegenPerTurn(player.stats.int));

  function playerAct() {
    if (action === "attack") {
      doAttack(player, monster, {}, log);
    } else if (action === "defend") {
      player.pendingDefense = { defendMult: CONFIG.DEFEND_MULT, healPct: 0, counterPct: 0 };
      log.push(`${player.name}이(가) 방어 자세를 취했다.`);
    } else if (action === "skill1" || action === "skill2") {
      const skill = charDef.skills[action === "skill1" ? 0 : 1];
      if (player.mp < skill.mp) {
        log.push(`마력이 부족해 ${skill.name}을(를) 사용할 수 없다! 기본 공격으로 대체.`);
        doAttack(player, monster, {}, log);
        return;
      }
      player.mp -= skill.mp;
      const eff = skill.effect(player);
      if (eff.atkMult) {
        doAttack(player, monster, {
          atkMult: eff.atkMult,
          defPierce: eff.defPierce || 0,
          bonusCrit: eff.bonusCrit || 0,
          noDodge: !!eff.noDodge,
        }, log);
      } else {
        player.pendingDefense = { defendMult: eff.defMult || 1, healPct: eff.healPct || 0, counterPct: eff.counterPct || 0 };
        log.push(`${player.name}이(가) ${skill.name}을(를) 사용했다.`);
        if (eff.healPct) {
          const heal = Math.round(player.maxHp * eff.healPct);
          player.hp = Math.min(player.maxHp, player.hp + heal);
          log.push(`${player.name}이(가) 체력을 ${heal} 회복했다.`);
        }
      }
    }
  }

  function monsterAct() {
    const mAction = chooseMonsterAction(session.monsterDef);
    if (mAction === "attack") {
      doAttack(monster, player, {}, log);
    } else {
      monster.pendingDefense = { defendMult: 1.3, healPct: 0, counterPct: 0 };
      log.push(`${monster.name}이(가) 방어 태세에 들어갔다.`);
    }
  }

  // 민첩 비교로 행동 순서 결정
  const order = player.stats.agi >= monster.stats.agi ? ["player", "monster"] : ["monster", "player"];
  for (const who of order) {
    if (player.hp <= 0 || monster.hp <= 0) break;
    if (who === "player") playerAct();
    else monsterAct();
  }

  session.log = log;

  let outcome = "ongoing";
  if (player.hp <= 0) outcome = "defeat";
  else if (monster.hp <= 0) outcome = "victory";

  res.json({ ...sessionState(session), outcome });
});

// 승리 후 다음 층으로
app.post("/api/session/:id/next-floor", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "session not found" });
  if (session.monster.hp > 0) return res.status(400).json({ error: "current battle not finished" });

  session.floor += 1;
  const { def, fighter } = spawnMonster(session.floor);
  session.monster = fighter;
  session.monsterDef = def;
  session.log = [`${session.floor}층 진입. ${def.name}이(가) 나타났다!`];

  res.json(sessionState(session));
});

function sessionState(session) {
  return {
    floor: session.floor,
    player: session.player,
    monster: session.monster,
    monsterName: session.monsterDef ? session.monsterDef.name : null,
    log: session.log,
  };
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`불꽃의 탑 백엔드 서버 실행 중: http://localhost:${PORT}`));
