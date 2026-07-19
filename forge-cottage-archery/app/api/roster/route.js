import { NextResponse } from "next/server";
const db = require("../../../lib/db");
const { emptyPrizes } = require("../../../lib/prizes");

export const dynamic = "force-dynamic";

function newRosterEntry(name) {
  return {
    id: crypto.randomUUID(),
    name,
    totalScore: 0,
    tournamentsPlayed: 0,
    tournamentsWon: 0,
    bestRound: 0,
    bullseyes: 0,
    prizes: emptyPrizes(),
  };
}

export async function POST(req) {
  const { name } = await req.json();
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const roster = await db.getRoster();
  if (roster.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
    return NextResponse.json({ error: "That name is already on the roster" }, { status: 409 });
  }
  const entry = newRosterEntry(trimmed);
  roster.push(entry);
  await db.setRoster(roster);
  return NextResponse.json({ roster });
}

export async function DELETE(req) {
  const { id } = await req.json();
  const roster = await db.getRoster();
  const tournament = await db.getTournament();
  if (tournament && tournament.participants.some((p) => p.rosterId === id)) {
    return NextResponse.json(
      { error: "Can't remove someone who's in the active tournament" },
      { status: 409 }
    );
  }
  await db.setRoster(roster.filter((p) => p.id !== id));
  return NextResponse.json({ ok: true });
}
