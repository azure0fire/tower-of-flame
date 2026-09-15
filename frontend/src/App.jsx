import React, { useEffect, useState } from "react";
import { api } from "./api";
import { watchAuth, loginWithGoogle, logout, getUserProfile, createUserProfile, updateBestFloor } from "./firebase";

const CHARACTERS = [
  { key: 0, name: "모험가", desc: "모든 스탯이 고른 올라운더", stats: "공5 방5 체5 민5 행5 지5" },
  { key: 1, name: "화염 기사", desc: "체력과 방어에 투자한 탱커", stats: "공6 방9 체9 민2 행2 지2" },
  { key: 2, name: "비술사", desc: "마력을 앞세운 폭딜형", stats: "공4 방4 체9 민4 행4 지5" },
];

const TABS = ["전투", "가방", "대장간", "상점", "설정"];

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null); // firebase user
  const [profile, setProfile] = useState(null); // { displayName, charKey, bestFloor }
  const [stage, setStage] = useState("login"); // login | select | main
  const [tab, setTab] = useState("전투");
  const [selectedChar, setSelectedChar] = useState(null);
  const [nickname, setNickname] = useState("");
  const [session, setSession] = useState(null); // { sessionId, charName }
  const [battle, setBattle] = useState(null); // { floor, player, monster, monsterName, log, outcome }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // 로그인 상태 감시. 이미 캐릭터를 만든 유저면 바로 메인으로 보냄.
  useEffect(() => {
    const unsub = watchAuth(async (u) => {
      setAuthChecked(true);
      setUser(u);
      if (!u) {
        setStage("login");
        return;
      }
      try {
        const existing = await getUserProfile(u.uid);
        if (existing) {
          setProfile(existing);
          const res = await api.createSession(existing.charKey, existing.displayName);
          setSession(res);
          setStage("main");
        } else {
          setNickname(u.displayName || "");
          setStage("select");
        }
      } catch (e) {
        setError("계정 정보를 불러오지 못했습니다: " + e.message);
      }
    });
    return unsub;
  }, []);

  async function handleGoogleLogin() {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
      // watchAuth 콜백이 이후 흐름을 이어서 처리함
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    setProfile(null);
    setSession(null);
    setBattle(null);
    setStage("login");
  }

  async function handlePickCharacter(charKey) {
    const finalName = nickname.trim();
    if (!finalName) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const newProfile = await createUserProfile(user.uid, {
        displayName: finalName,
        charKey,
      });
      setProfile(newProfile);
      const res = await api.createSession(charKey, newProfile.displayName);
      setSession(res);
      setStage("main");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function afterFloorChange(res) {
    const nextBattle = { ...res, outcome: res.outcome || "ongoing" };
    setBattle(nextBattle);
    if (profile && res.floor > profile.bestFloor) {
      const newBest = await updateBestFloor(user.uid, res.floor, profile.bestFloor);
      setProfile({ ...profile, bestFloor: newBest });
    }
  }

  async function handleEnterTower() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.enterTower(session.sessionId);
      await afterFloorChange(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(action) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.act(session.sessionId, action);
      await afterFloorChange(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleNextFloor() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.nextFloor(session.sessionId);
      await afterFloorChange(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!authChecked) {
    return <div className="app-shell" />;
  }

  if (stage === "login") {
    return (
      <div className="app-shell">
        <div className="hero">
          <h1 className="display">불꽃의 탑</h1>
          <p>층을 오를수록 뜨거워지는 턴제 전투</p>
          <div style={{ marginTop: 32 }}>
            <button className="btn" disabled={busy} onClick={handleGoogleLogin}>
              {busy ? "로그인 중..." : "구글 계정으로 시작하기"}
            </button>
          </div>
          {error && <p style={{ color: "var(--danger)", marginTop: 16 }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (stage === "select") {
    return (
      <div className="app-shell">
        <div className="screen">
          <h2 className="display" style={{ color: "var(--gold)", fontSize: 26 }}>
            캐릭터 선택
          </h2>
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-dim)" }}>닉네임</label>
            <input
              className="nickname-input"
              value={nickname}
              maxLength={12}
              placeholder="탑에서 쓸 이름을 입력하세요"
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div className="char-grid">
            {CHARACTERS.map((c) => (
              <div
                key={c.key}
                className={`char-card ${selectedChar === c.key ? "selected" : ""}`}
                onClick={() => setSelectedChar(c.key)}
              >
                <div>
                  <div className="name">{c.name}</div>
                  <div className="stats">{c.desc}</div>
                  <div className="stats">{c.stats}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button
              className="btn"
              disabled={selectedChar === null || !nickname.trim() || busy}
              onClick={() => handlePickCharacter(selectedChar)}
            >
              {busy ? "생성 중..." : "이 캐릭터로 시작"}
            </button>
          </div>
          {error && <p style={{ color: "var(--danger)", textAlign: "center" }}>{error}</p>}
        </div>
      </div>
    );
  }

  // stage === "main"
  return (
    <div className="app-shell">
      <div className="topbar">
        <h1 className="display">불꽃의 탑</h1>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{session?.charName}</div>
          <div style={{ fontSize: 11, color: "var(--gold)" }}>최고 {profile?.bestFloor ?? 0}층</div>
        </div>
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="screen">
        {tab === "전투" ? (
          <BattleTab
            battle={battle}
            busy={busy}
            error={error}
            onEnter={handleEnterTower}
            onAction={handleAction}
            onNextFloor={handleNextFloor}
            onRetry={handleEnterTower}
          />
        ) : tab === "설정" ? (
          <div className="placeholder">
            <p>{user?.displayName} 님으로 로그인됨</p>
            <div style={{ marginTop: 16 }}>
              <button className="btn secondary" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </div>
        ) : (
          <div className="placeholder">
            <p>{tab} 화면은 준비 중입니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBar({ label, value, max, kind }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <>
      <div className="bar">
        <div className={`bar-fill ${kind}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="bar-label">
        <span>{label}</span>
        <span>
          {value} / {max}
        </span>
      </div>
    </>
  );
}

function BattleTab({ battle, busy, error, onEnter, onAction, onNextFloor, onRetry }) {
  if (!battle) {
    return (
      <div className="hero">
        <p>탑 앞에 도착했습니다.</p>
        <div style={{ marginTop: 20 }}>
          <button className="btn" disabled={busy} onClick={onEnter}>
            {busy ? "입장 중..." : "탑 입장"}
          </button>
        </div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      </div>
    );
  }

  const { floor, player, monster, monsterName, log, outcome } = battle;

  if (outcome === "victory") {
    return (
      <div className="outcome-panel">
        <h2>승리!</h2>
        <p style={{ color: "var(--text-dim)" }}>
          {floor}층의 {monsterName}을(를) 물리쳤습니다.
        </p>
        <button className="btn" style={{ marginTop: 20 }} disabled={busy} onClick={onNextFloor}>
          다음 층으로
        </button>
      </div>
    );
  }

  if (outcome === "defeat") {
    return (
      <div className="outcome-panel">
        <h2 style={{ color: "var(--danger)" }}>쓰러졌다...</h2>
        <p style={{ color: "var(--text-dim)" }}>
          {floor}층에서 패배했습니다. 층수는 초기화되지만 재료와 아이템은 유지됩니다.
        </p>
        <button className="btn" style={{ marginTop: 20 }} disabled={busy} onClick={onRetry}>
          1층부터 다시 도전
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="floor-banner">
        <strong>{floor}층</strong> · {monsterName}
      </div>

      <div className="fighter">
        <div className="row">
          <span className="name">{player.name}</span>
        </div>
        <StatBar label="HP" value={player.hp} max={player.maxHp} kind="hp" />
        <StatBar label="MP" value={player.mp} max={player.maxMp} kind="mp" />
      </div>

      <div className="fighter">
        <div className="row">
          <span className="name">{monster.name}</span>
        </div>
        <StatBar label="HP" value={monster.hp} max={monster.maxHp} kind="hp" />
      </div>

      <div className="log">
        {log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      <div className="actions">
        <button className="btn" disabled={busy} onClick={() => onAction("attack")}>
          공격
        </button>
        <button className="btn secondary" disabled={busy} onClick={() => onAction("defend")}>
          방어
        </button>
        <button className="btn secondary" disabled={busy} onClick={() => onAction("skill1")}>
          스킬 1
        </button>
        <button className="btn secondary" disabled={busy} onClick={() => onAction("skill2")}>
          스킬 2
        </button>
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
