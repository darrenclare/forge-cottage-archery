import { NextResponse } from "next/server";
const db = require("../../../lib/db");

export const dynamic = "force-dynamic";

export async function GET() {
  const [roster, tournament, history] = await Promise.all([
    db.getRoster(),
    db.getTournament(),
    db.getHistory(),
  ]);
  return NextResponse.json({ roster, tournament, history, hasKv: db.hasKv });
}
