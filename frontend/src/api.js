const ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const BASE = `${ORIGIN}/api`;

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // 서버가 JSON이 아닌 응답을 준 경우 (예: 서버가 깨어나는 중이거나 다운된 경우)
    throw new Error(
      res.ok
        ? "서버 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요."
        : `서버 오류 (${res.status}). 서버가 방금 깨어난 상태라면 몇 초 후 다시 시도해보세요.`
    );
  }

  if (!res.ok) throw new Error(data.error || "요청 실패");
  return data;
}

export const api = {
  createSession: (charKey, playerName, progress) => post("/session", { charKey, playerName, progress }),
  enterTower: (sessionId) => post(`/session/${sessionId}/enter-tower`),
  act: (sessionId, action) => post(`/session/${sessionId}/action`, { action }),
  nextFloor: (sessionId) => post(`/session/${sessionId}/next-floor`),
  allocate: (sessionId, stat, delta) => post(`/session/${sessionId}/allocate`, { stat, delta }),
};
