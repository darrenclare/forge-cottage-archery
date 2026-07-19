import { NextResponse } from "next/server";
const db = require("../../../../lib/db");
const { PRIZE_TIERS } = require("../../../../lib/prizes");

export const dynamic = "force-dynamic";

// Turns a set of {rosterId, key} pairs into competition-style ranks
// (1, 1, 3, 4, ...) - ties share a rank, and the next rank skips ahead
// by the number tied.
function computeRanks(entries) {
  const uniqueKeysDesc = [...new Set(entries.map((e) => e.key))].sort((a, b) => b - a);
  const rankByKey = new Map();
  let rank = 1;
  uniqueKeysDesc.forEach((key) => {
    const countAtThisKey = entries.filter((e) => e.key === key).length;
    rankByKey.set(key, rank);
    rank += countAtThisKey;
  });
  const ranks = {};
  entries.forEach((e) => {
    ranks[e.rosterId] = rankByKey.get(e.key);
  });
  return ranks;
}

export async function POST() {
  const tournament = await db.getTournament();
  if (!tournament || !tournament.active) {
    return NextResponse.json({ error: "No active tournament" }, { status: 409 });
  }

  const roster = await db.getRoster();

  const bullseyesById = {};
  tournament.participants.forEach((p) => {
    bullseyesById[p.rosterId] = p.roundHistory.reduce(
      (count, r) => count + r.arrows.filter((v) => v === 10).length,
      0
    );
  });

  const teamTotals = { A: 0, B: 0 };
  tournament.participants.forEach((p) => {
    if (p.team) teamTotals[p.team] += p.tournamentTotal;
  });

  // One ranking key per mode - everything else (winners, medals, history)
  // falls out of this automatically.
  const rankEntries = tournament.participants.map((p) => {
    let key;
    if (tournament.mode === "killer" || tournament.mode === "knockout") {
      key = p.eliminated ? p.roundHistory.length : Number.POSITIVE_INFINITY;
    } else if (tournament.mode === "teamBattle") {
      key = p.team ? teamTotals[p.team] : 0;
    } else if (tournament.mode === "bullseyeBlitz") {
      key = bullseyesById[p.rosterId] * 100000 + p.tournamentTotal;
    } else {
      key = p.tournamentTotal;
    }
    return { rosterId: p.rosterId, key };
  });

  const ranks = computeRanks(rankEntries); // { rosterId: 1 | 2 | 3 | ... }
  const tiers = PRIZE_TIERS[tournament.mode] || PRIZE_TIERS.roundRobin;
  const tierForRank = (rank) => tiers[rank - 1]; // "gold" | "silver" | "bronze" | undefined

  const winnerIds = tournament.participants
    .filter((p) => ranks[p.rosterId] === 1)
    .map((p) => p.rosterId);

  tournament.participants.forEach((p) => {
    const rosterEntry = roster.find((r) => r.id === p.rosterId);
    if (!rosterEntry) return;
    rosterEntry.tournamentsPlayed += 1;
    if (winnerIds.includes(p.rosterId)) rosterEntry.tournamentsWon += 1;
    rosterEntry.totalScore += p.tournamentTotal;
    const bestRound = Math.max(0, ...p.roundHistory.map((r) => r.score));
    rosterEntry.bestRound = Math.max(rosterEntry.bestRound, bestRound);
    rosterEntry.bullseyes += bullseyesById[p.rosterId];

    const tier = tierForRank(ranks[p.rosterId]);
    if (tier) rosterEntry.prizes[tournament.mode][tier] += 1;
  });

  const history = await db.getHistory();
  const results = tournament.participants
    .map((p) => ({
      rosterId: p.rosterId,
      name: roster.find((r) => r.id === p.rosterId)?.name || "Unknown",
      total: p.tournamentTotal,
      team: p.team || undefined,
      bullseyes: tournament.mode === "bullseyeBlitz" ? bullseyesById[p.rosterId] : undefined,
      place: ranks[p.rosterId],
      tier: tierForRank(ranks[p.rosterId]),
    }))
    .sort((a, b) => a.place - b.place);

  const historyEntry = {
    endedAt: new Date().toISOString(),
    mode: tournament.mode,
    rounds: tournament.round - 1,
    winners: winnerIds.map((id) => roster.find((r) => r.id === id)?.name).filter(Boolean),
    results,
  };
  history.unshift(historyEntry);

  await db.setRoster(roster);
  await db.setHistory(history.slice(0, 50)); // keep the most recent 50 tournaments
  await db.setTournament(null);

  return NextResponse.json({ history: historyEntry });
}
