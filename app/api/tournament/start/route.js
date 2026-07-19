import { NextResponse } from "next/server";
const db = require("../../../../lib/db");

export const dynamic = "force-dynamic";

const VALID_MODES = ["roundRobin", "killer", "knockout", "teamBattle", "bullseyeBlitz"];
const STARTING_LIVES = { killer: 3, knockout: 1 };

export async function POST(req) {
  const { participantIds, mode, teams } = await req.json();
  const tournamentMode = VALID_MODES.includes(mode) ? mode : "roundRobin";

  const existing = await db.getTournament();
  if (existing && existing.active) {
    return NextResponse.json({ error: "A tournament is already in progress" }, { status: 409 });
  }

  const roster = await db.getRoster();
  const rosterIds = new Set(roster.map((p) => p.id));

  let baseParticipants; // [{ rosterId, team? }]

  if (tournamentMode === "teamBattle") {
    const teamA = (teams?.A || []).filter((id) => rosterIds.has(id));
    const teamB = (teams?.B || []).filter((id) => rosterIds.has(id));
    if (teamA.length === 0 || teamB.length === 0) {
      return NextResponse.json({ error: "Both teams need at least one player" }, { status: 400 });
    }
    baseParticipants = [
      ...teamA.map((rosterId) => ({ rosterId, team: "A" })),
      ...teamB.map((rosterId) => ({ rosterId, team: "B" })),
    ];
  } else {
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: "Pick at least one player" }, { status: 400 });
    }
    const validIds = participantIds.filter((id) => rosterIds.has(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid players selected" }, { status: 400 });
    }
    if ((tournamentMode === "killer" || tournamentMode === "knockout") && validIds.length < 2) {
      return NextResponse.json({ error: `${tournamentMode === "killer" ? "Killer" : "Knockout"} needs at least 2 players` }, { status: 400 });
    }
    baseParticipants = validIds.map((rosterId) => ({ rosterId }));
  }

  const startingLives = STARTING_LIVES[tournamentMode] ?? null;

  const tournament = {
    active: true,
    mode: tournamentMode,
    round: 1,
    startedAt: new Date().toISOString(),
    participants: baseParticipants.map((bp) => ({
      rosterId: bp.rosterId,
      team: bp.team ?? null,
      currentArrows: [null, null, null],
      tournamentTotal: 0,
      roundHistory: [],
      lives: startingLives,
      eliminated: false,
    })),
  };

  await db.setTournament(tournament);
  return NextResponse.json({ tournament });
}
