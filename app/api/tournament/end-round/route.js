import { NextResponse } from "next/server";
const db = require("../../../../lib/db");

export const dynamic = "force-dynamic";

export async function POST() {
  const tournament = await db.getTournament();
  if (!tournament || !tournament.active) {
    return NextResponse.json({ error: "No active tournament" }, { status: 409 });
  }

  const scorable = tournament.participants.filter((p) => !p.eliminated);
  const allScored = scorable.every((p) => p.currentArrows.every((v) => v !== null));
  if (!allScored) {
    return NextResponse.json(
      { error: "Every player still in the game needs all 3 arrows scored first" },
      { status: 400 }
    );
  }

  scorable.forEach((p) => {
    const roundScore = p.currentArrows.reduce((sum, v) => sum + v, 0);
    p.roundHistory.push({ round: tournament.round, score: roundScore, arrows: [...p.currentArrows] });
    p.tournamentTotal += roundScore;
    p.currentArrows = [null, null, null];
  });

  if (tournament.mode === "killer" || tournament.mode === "knockout") {
    const stillIn = tournament.participants.filter((p) => !p.eliminated);
    const lowestScore = Math.min(...stillIn.map((p) => p.roundHistory[p.roundHistory.length - 1].score));
    stillIn.forEach((p) => {
      const lastScore = p.roundHistory[p.roundHistory.length - 1].score;
      if (lastScore === lowestScore) {
        p.lives -= 1;
        if (p.lives <= 0) p.eliminated = true;
      }
    });
  }

  tournament.round += 1;
  await db.setTournament(tournament);
  return NextResponse.json({ tournament });
}
