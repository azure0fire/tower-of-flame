const ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const BASE = `${ORIGIN}/api`;

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json()).error || "요청 실패");
  return res.json();
}

export const api = {
  createSession: (charKey, playerName) => post("/session", { charKey, playerName }),
  enterTower: (sessionId) => post(`/session/${sessionId}/enter-tower`),
  act: (sessionId, action) => post(`/session/${sessionId}/action`, { action }),
  nextFloor: (sessionId) => post(`/session/${sessionId}/next-floor`),
};
