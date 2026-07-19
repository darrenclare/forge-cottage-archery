// Data layer for Forge Cottage Archery.
//
// Uses the standard `redis` package with a REDIS_URL connection string -
// this matches Vercel's native Redis marketplace integration (the one that
// gives you a "redis-xxxxx-xxxx" database and a REDIS_URL env var, shown in
// its own Quickstart panel in the Vercel dashboard).
//
// Locally (npm run dev) without REDIS_URL set, this falls back to an
// in-memory store so you can preview the app. That data does NOT persist
// between restarts locally - only the real Redis database on Vercel
// persists long-term.

const KEYS = {
  ROSTER: "archery:roster",
  TOURNAMENT: "archery:tournament",
  HISTORY: "archery:history",
};

const REDIS_URL = process.env.REDIS_URL;
const hasKv = !!REDIS_URL;

// Reuse a single connection across warm serverless invocations instead of
// reconnecting on every request.
let clientPromise = null;

async function getClient() {
  if (!hasKv) return null;
  if (!clientPromise) {
    const { createClient } = require("redis");
    const client = createClient({ url: REDIS_URL });
    client.on("error", (err) => console.error("Redis client error:", err));
    clientPromise = client.connect().then(() => client);
  }
  return clientPromise;
}

// --- in-memory fallback (dev only, resets on server restart) ---
const memory = {
  [KEYS.ROSTER]: [],
  [KEYS.TOURNAMENT]: null,
  [KEYS.HISTORY]: [],
};

async function get(key) {
  if (hasKv) {
    const client = await getClient();
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  return memory[key] ?? null;
}

async function set(key, value) {
  if (hasKv) {
    const client = await getClient();
    await client.set(key, JSON.stringify(value));
    return;
  }
  memory[key] = value;
}

async function getRoster() {
  return (await get(KEYS.ROSTER)) || [];
}

async function setRoster(roster) {
  await set(KEYS.ROSTER, roster);
}

async function getTournament() {
  return await get(KEYS.TOURNAMENT);
}

async function setTournament(tournament) {
  await set(KEYS.TOURNAMENT, tournament);
}

async function getHistory() {
  return (await get(KEYS.HISTORY)) || [];
}

async function setHistory(history) {
  await set(KEYS.HISTORY, history);
}

module.exports = {
  hasKv,
  getRoster,
  setRoster,
  getTournament,
  setTournament,
  getHistory,
  setHistory,
};
