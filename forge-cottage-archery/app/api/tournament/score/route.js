import { NextResponse } from "next/server";
const db = require("../../../../lib/db");

export const dynamic = "force-dynamic";

const VALID_SCORES = new Set([2, 4, 6, 8, 10]);

export async function POST(req) {
  const { rosterId, arrowIndex, value } = await req.json();

  if (!VALID_SCORES.has(value) || ![0, 1, 2].includes(arrowIndex)) {
    return NextResponse.json({ error: "Invalid score or arrow index" }, { status: 400 });
  }

  const tournament = await db.getTournament();
  if (!tournament || !tournament.active) {
    return NextResponse.json({ error: "No active tournament" }, { status: 409 });
  }

  const participant = tournament.participants.find((p) => p.rosterId === rosterId);
  if (!participant) {
    return NextResponse.json({ error: "Player not in this tournament" }, { status: 404 });
  }
  if (participant.eliminated) {
    return NextResponse.json({ error: "That player has been eliminated" }, { status: 409 });
  }

  participant.currentArrows[arrowIndex] = value;
  await db.setTournament(tournament);
  return NextResponse.json({ tournament });
}
