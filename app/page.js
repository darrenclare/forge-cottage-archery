"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Trophy, ChevronRight, Target, Flag, Heart, Skull } from "lucide-react";

const RINGS = [
  { value: 10, color: "#F2C230", label: "Yellow", textDark: true },
  { value: 8, color: "#D8342B", label: "Red" },
  { value: 6, color: "#2D93C7", label: "Blue" },
  { value: 4, color: "#1A1A1A", label: "Black" },
  { value: 2, color: "#EDEDE5", label: "White", textDark: true },
];

const MODE_LABELS = {
  roundRobin: "Round Robin",
  killer: "Killer",
  knockout: "Knockout",
  teamBattle: "Team Battle",
  bullseyeBlitz: "Bullseye Blitz",
};

const MODE_PRIZE_ICON = {
  killer: "💀",
  knockout: "🥊",
  teamBattle: "🛡️",
  bullseyeBlitz: "🎯",
};

const TIER_EMOJI = { gold: "🥇", silver: "🥈", bronze: "🥉" };
const TIER_COLOR = { gold: "#F2C230", silver: "#C7CDD6", bronze: "#C97A3D" };

function PrizeBadge({ mode, tier, size = 16 }) {
  if (!tier) return null;
  if (mode === "roundRobin") {
    return <span style={{ fontSize: size }}>{TIER_EMOJI[tier]}</span>;
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{ backgroundColor: TIER_COLOR[tier], width: size + 8, height: size + 8, fontSize: size - 2 }}
    >
      {MODE_PRIZE_ICON[mode]}
    </span>
  );
}

async function api(path, options) {
  const res = await fetch(path, {
    method: options?.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function ArrowSlot({ value, onPick, arrowNumber }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-stone-400">
        Arrow {arrowNumber}
      </span>
      <div className="flex gap-1">
        {RINGS.map((ring) => {
          const active = value === ring.value;
          return (
            <button
              key={ring.value}
              onClick={() => onPick(ring.value)}
              aria-label={`Score ${ring.value}`}
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-transform duration-150"
              style={{
                backgroundColor: ring.color,
                color: ring.textDark ? "#1C1C1C" : "#F5F0E6",
                outline: active ? "3px solid #F2C230" : "1px solid rgba(0,0,0,0.25)",
                outlineOffset: 2,
                transform: active ? "scale(1.12)" : "scale(1)",
              }}
            >
              {ring.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TargetMark({ size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, #EDEDE5 0 20%, #1A1A1A 20% 36%, #2D93C7 36% 52%, #D8342B 52% 68%, #F2C230 68% 100%)",
        flexShrink: 0,
      }}
    />
  );
}

function Card({ children, highlight }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ backgroundColor: "#26331F", borderColor: highlight ? "#F2C230" : "#3E4A35" }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedMode, setSelectedMode] = useState("roundRobin");
  const [teamAssignments, setTeamAssignments] = useState({}); // { rosterId: "A" | "B" }
  const [reveal, setReveal] = useState(null); // history entry just returned from ending a tournament

  const refresh = useCallback(async () => {
    try {
      const data = await api("/api/state");
      setState(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const run = async (fn) => {
    try {
      setError("");
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#1B2417" }}>
        <p style={{ color: "#8A9679" }}>Loading Forge Cottage Archery…</p>
      </div>
    );
  }

  const { roster, tournament, history, hasKv } = state;
  const rosterById = Object.fromEntries(roster.map((r) => [r.id, r]));

  const addToRoster = () =>
    run(async () => {
      const name = newName.trim();
      if (!name) return;
      await api("/api/roster", { method: "POST", body: { name } });
      setNewName("");
    });

  const removeFromRoster = (id) =>
    run(() => api("/api/roster", { method: "DELETE", body: { id } }));

  const toggleSelected = (id) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const toggleTeamMember = (id, team) =>
    setTeamAssignments((prev) => {
      const next = { ...prev };
      if (next[id] === team) delete next[id];
      else next[id] = team;
      return next;
    });

  const startTournament = () =>
    run(async () => {
      if (selectedMode === "teamBattle") {
        const teamA = Object.keys(teamAssignments).filter((id) => teamAssignments[id] === "A");
        const teamB = Object.keys(teamAssignments).filter((id) => teamAssignments[id] === "B");
        if (teamA.length === 0 || teamB.length === 0) return;
        await api("/api/tournament/start", {
          method: "POST",
          body: { mode: "teamBattle", teams: { A: teamA, B: teamB } },
        });
      } else {
        if (selectedIds.length === 0) return;
        await api("/api/tournament/start", {
          method: "POST",
          body: { participantIds: selectedIds, mode: selectedMode },
        });
      }
      setSelectedIds([]);
      setSelectedMode("roundRobin");
      setTeamAssignments({});
      setPickerOpen(false);
    });

  const scoreArrow = (rosterId, arrowIndex, value) =>
    run(() => api("/api/tournament/score", { method: "POST", body: { rosterId, arrowIndex, value } }));

  const endRound = () => run(() => api("/api/tournament/end-round", { method: "POST" }));

  const endTournament = async () => {
    try {
      setError("");
      const data = await api("/api/tournament/end", { method: "POST" });
      setReveal(data.history);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const mode = tournament?.mode;
  const isElimination = mode === "killer" || mode === "knockout";
  const isKillerLives = mode === "killer"; // knockout is 1-life, hearts aren't meaningful there
  const isTeamBattle = mode === "teamBattle";
  const isBullseyeBlitz = mode === "bullseyeBlitz";

  const scorableParticipants = tournament?.active
    ? tournament.participants.filter((p) => !p.eliminated)
    : [];

  const allScored =
    tournament?.active &&
    scorableParticipants.length > 0 &&
    scorableParticipants.every((p) => p.currentArrows.every((v) => v !== null));

  const leaderTotal =
    tournament?.active && !isElimination && !isTeamBattle
      ? Math.max(...tournament.participants.map((p) => p.tournamentTotal))
      : 0;

  const survivorCount = isElimination ? scorableParticipants.length : null;

  const teamTotals = isTeamBattle
    ? tournament.participants.reduce(
        (acc, p) => {
          if (p.team) acc[p.team] += p.tournamentTotal;
          return acc;
        },
        { A: 0, B: 0 }
      )
    : null;

  const bullseyeCounts = isBullseyeBlitz
    ? Object.fromEntries(
        tournament.participants.map((p) => [
          p.rosterId,
          p.roundHistory.reduce((c, r) => c + r.arrows.filter((v) => v === 10).length, 0),
        ])
      )
    : {};
  const maxBullseyes = isBullseyeBlitz ? Math.max(0, ...Object.values(bullseyeCounts)) : 0;

  const allTimeSorted = [...roster].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-8" style={{ backgroundColor: "#1B2417" }}>
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <TargetMark />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "#F5F0E6" }}>
              Forge Cottage Archery
            </h1>
            <p className="text-xs tracking-wide" style={{ color: "#8A9679" }}>
              3 arrows a round · 2, 4, 6, 8 or 10 each · shared live across every device here
            </p>
          </div>
        </div>

        {!hasKv && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "#3A2E1A", color: "#F2C230" }}>
            Running on local dev storage — this won't persist. Add a Redis
            database via Vercel's Storage tab (it'll set a REDIS_URL
            variable automatically) so scores actually stick between
            parties.
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "#3A1A1A", color: "#E8968A" }}>
            {error}
          </div>
        )}

        {/* ACTIVE TOURNAMENT */}
        {tournament?.active ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "#F5F0E6" }}>
                <Flag size={16} style={{ color: "#F2C230" }} /> Round {tournament.round}
                <span className="text-xs font-normal" style={{ color: "#8A9679" }}>
                  {mode === "killer" && `· Killer · ${survivorCount} left`}
                  {mode === "knockout" && `· Knockout · ${survivorCount} left`}
                  {mode === "teamBattle" && "· Team Battle"}
                  {mode === "bullseyeBlitz" && "· Bullseye Blitz"}
                </span>
              </h2>
              <button
                onClick={endTournament}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ backgroundColor: "#D8342B", color: "#F5F0E6" }}
              >
                Finish tournament
              </button>
            </div>

            {isTeamBattle && (
              <div className="flex gap-3 mb-3">
                <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: "#22301D" }}>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: "#8A9679" }}>Team A</div>
                  <div className="text-xl font-bold" style={{ color: "#F2C230" }}>{teamTotals.A}</div>
                </div>
                <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: "#22301D" }}>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: "#8A9679" }}>Team B</div>
                  <div className="text-xl font-bold" style={{ color: "#F2C230" }}>{teamTotals.B}</div>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {tournament.participants.map((p) => {
                const person = rosterById[p.rosterId];
                if (!person) return null;
                const roundTotal = p.currentArrows.reduce((s, v) => s + (v || 0), 0);
                const isLeader =
                  !isElimination && !isTeamBattle && !isBullseyeBlitz &&
                  tournament.round > 1 && p.tournamentTotal === leaderTotal && leaderTotal > 0;
                const isBullseyeLeader =
                  isBullseyeBlitz && tournament.round > 1 && bullseyeCounts[p.rosterId] === maxBullseyes && maxBullseyes > 0;
                return (
                  <Card key={p.rosterId} highlight={isLeader || isBullseyeLeader}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3
                          className="font-semibold text-lg tracking-tight"
                          style={{ color: p.eliminated ? "#6B7563" : "#F5F0E6" }}
                        >
                          {person.name}
                        </h3>
                        {isTeamBattle && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: p.team === "A" ? "#2D93C7" : "#D8342B",
                              color: "#F5F0E6",
                            }}
                          >
                            {p.team}
                          </span>
                        )}
                      </div>
                      {isElimination ? (
                        p.eliminated ? (
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#8A9679" }}>
                            <Skull size={14} /> Out
                          </span>
                        ) : isKillerLives ? (
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: p.lives }).map((_, i) => (
                              <Heart key={i} size={14} fill="#D8342B" style={{ color: "#D8342B" }} />
                            ))}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "#8A9679" }}>In</span>
                        )
                      ) : isBullseyeBlitz ? (
                        <span className="text-xs font-semibold" style={{ color: "#F2C230" }}>
                          🎯 {bullseyeCounts[p.rosterId] || 0}
                        </span>
                      ) : (
                        isLeader && <Trophy size={16} style={{ color: "#F2C230" }} />
                      )}
                    </div>

                    {p.eliminated ? (
                      <p className="text-sm mb-4" style={{ color: "#6B7563" }}>
                        Eliminated round {p.roundHistory.length} — final round score{" "}
                        {p.roundHistory[p.roundHistory.length - 1]?.score ?? 0}
                      </p>
                    ) : (
                      <div className="flex gap-3 mb-4 flex-wrap">
                        {p.currentArrows.map((val, i) => (
                          <ArrowSlot key={i} value={val} arrowNumber={i + 1} onPick={(v) => scoreArrow(p.rosterId, i, v)} />
                        ))}
                      </div>
                    )}

                    <div className="flex items-baseline justify-between pt-3 border-t" style={{ borderColor: "#3E4A35" }}>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-stone-400">
                          {p.eliminated ? "Was scoring" : "This round"}
                        </span>
                        <div className="text-xl font-bold" style={{ color: p.eliminated ? "#6B7563" : "#F2C230" }}>
                          {p.eliminated ? "—" : roundTotal}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-widest text-stone-400">
                          {isElimination ? "Total scored" : isTeamBattle ? "Player total" : "Tournament total"}
                        </span>
                        <div className="text-2xl font-bold" style={{ color: p.eliminated ? "#6B7563" : "#F5F0E6" }}>
                          {p.tournamentTotal}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={endRound}
                disabled={!allScored}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#F2C230", color: "#1B2417" }}
              >
                {isElimination ? "End round — apply eliminations" : `End round ${tournament.round}`} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            {!pickerOpen ? (
              <button
                onClick={() => setPickerOpen(true)}
                disabled={roster.length === 0}
                className="w-full rounded-xl p-5 flex items-center justify-center gap-2 text-sm font-semibold border border-dashed disabled:opacity-40"
                style={{ borderColor: "#F2C230", color: "#F2C230" }}
              >
                <Target size={16} /> Start a tournament
              </button>
            ) : (
              <Card>
                <h2 className="font-semibold mb-3" style={{ color: "#F5F0E6" }}>Tournament mode</h2>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { id: "roundRobin", label: "Round Robin", desc: "Most points after all rounds wins" },
                    { id: "killer", label: "Killer", desc: "3 lives — lowest score each round loses one" },
                    { id: "knockout", label: "Knockout", desc: "No lives — lowest score is out immediately" },
                    { id: "teamBattle", label: "Team Battle", desc: "Two teams, combined scores" },
                    { id: "bullseyeBlitz", label: "Bullseye Blitz", desc: "Most 10s wins, total is the tiebreaker" },
                  ].map((m) => {
                    const on = selectedMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedMode(m.id); setSelectedIds([]); setTeamAssignments({}); }}
                        className="rounded-lg px-3 py-2 text-left border transition-colors"
                        style={{
                          backgroundColor: on ? "#F2C230" : "transparent",
                          borderColor: on ? "#F2C230" : "#3E4A35",
                        }}
                      >
                        <div className="text-sm font-semibold" style={{ color: on ? "#1B2417" : "#F5F0E6" }}>
                          {m.label}
                        </div>
                        <div className="text-[11px]" style={{ color: on ? "#3A2E00" : "#8A9679" }}>
                          {m.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedMode === "teamBattle" ? (
                  <>
                    <h2 className="font-semibold mb-3" style={{ color: "#F5F0E6" }}>Assign teams</h2>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {["A", "B"].map((team) => (
                        <div key={team}>
                          <div
                            className="text-[10px] uppercase tracking-widest mb-1.5 font-semibold"
                            style={{ color: team === "A" ? "#2D93C7" : "#D8342B" }}
                          >
                            Team {team}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {roster.map((p) => {
                              const on = teamAssignments[p.id] === team;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => toggleTeamMember(p.id, team)}
                                  className="px-2.5 py-1 rounded-full text-xs border transition-colors"
                                  style={{
                                    backgroundColor: on ? (team === "A" ? "#2D93C7" : "#D8342B") : "transparent",
                                    color: on ? "#F5F0E6" : "#F5F0E6",
                                    borderColor: on ? "transparent" : "#3E4A35",
                                    opacity: teamAssignments[p.id] && !on ? 0.35 : 1,
                                  }}
                                >
                                  {p.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="font-semibold mb-3" style={{ color: "#F5F0E6" }}>Who's playing tonight?</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {roster.map((p) => {
                        const on = selectedIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => toggleSelected(p.id)}
                            className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                            style={{
                              backgroundColor: on ? "#F2C230" : "transparent",
                              color: on ? "#1B2417" : "#F5F0E6",
                              borderColor: on ? "#F2C230" : "#3E4A35",
                            }}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                    {(selectedMode === "killer" || selectedMode === "knockout") && selectedIds.length === 1 && (
                      <p className="text-xs mb-3" style={{ color: "#D8342B" }}>
                        {selectedMode === "killer" ? "Killer" : "Knockout"} needs at least 2 players.
                      </p>
                    )}
                  </>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={startTournament}
                    disabled={
                      selectedMode === "teamBattle"
                        ? Object.values(teamAssignments).filter((t) => t === "A").length === 0 ||
                          Object.values(teamAssignments).filter((t) => t === "B").length === 0
                        : selectedIds.length === 0 ||
                          ((selectedMode === "killer" || selectedMode === "knockout") && selectedIds.length < 2)
                    }
                    className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-30"
                    style={{ backgroundColor: "#F2C230", color: "#1B2417" }}
                  >
                    {selectedMode === "teamBattle"
                      ? "Start team battle"
                      : `Start with ${selectedIds.length} player${selectedIds.length === 1 ? "" : "s"}`}
                  </button>
                  <button
                    onClick={() => {
                      setPickerOpen(false);
                      setSelectedIds([]);
                      setSelectedMode("roundRobin");
                      setTeamAssignments({});
                    }}
                    className="rounded-lg px-4 py-2 text-sm"
                    style={{ color: "#8A9679" }}
                  >
                    Cancel
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ROSTER + ADD */}
        <div className="mt-8">
          <h2 className="text-xs uppercase tracking-widest mb-2" style={{ color: "#8A9679" }}>
            Roster
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addToRoster()}
              placeholder="Add someone new to Forge Cottage"
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border"
              style={{ backgroundColor: "#26331F", color: "#F5F0E6", borderColor: "#3E4A35" }}
            />
            <button
              onClick={addToRoster}
              className="rounded-lg px-3 py-2 flex items-center gap-1 text-sm font-semibold"
              style={{ backgroundColor: "#F2C230", color: "#1B2417" }}
            >
              <Plus size={16} /> Add
            </button>
          </div>

          {roster.length === 0 ? (
            <p className="text-sm" style={{ color: "#8A9679" }}>
              No one on the roster yet — add the first name above.
            </p>
          ) : (
            <div className="space-y-1">
              {allTimeSorted.map((p, idx) => {
                const prizeChips = [];
                Object.entries(p.prizes || {}).forEach(([mode, tiers]) => {
                  Object.entries(tiers).forEach(([tier, count]) => {
                    if (count > 0) prizeChips.push({ mode, tier, count });
                  });
                });
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: "#22301D" }}
                  >
                    <span className="w-5 text-right font-semibold" style={{ color: "#8A9679" }}>{idx + 1}</span>
                    <span className="flex-1 font-medium" style={{ color: "#F5F0E6" }}>{p.name}</span>
                    {prizeChips.length > 0 && (
                      <span className="flex items-center gap-1 flex-wrap justify-end max-w-[40%]">
                        {prizeChips.map((c, i) => (
                          <span key={i} className="flex items-center gap-0.5 text-xs" style={{ color: "#C9C3B0" }}>
                            <PrizeBadge mode={c.mode} tier={c.tier} size={13} />
                            {c.count}
                          </span>
                        ))}
                      </span>
                    )}
                    <span style={{ color: "#8A9679" }} className="text-xs whitespace-nowrap">
                      {p.tournamentsPlayed} played · best rd {p.bestRound} · {p.bullseyes} bullseyes
                    </span>
                    <span className="font-bold w-14 text-right" style={{ color: "#F2C230" }}>{p.totalScore}</span>
                    <button
                      onClick={() => removeFromRoster(p.id)}
                      className="text-stone-500 hover:text-red-400 transition-colors"
                      aria-label={`Remove ${p.name} from roster`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HISTORY */}
        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs uppercase tracking-widest mb-2" style={{ color: "#8A9679" }}>
              Tournament history
            </h2>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "#22301D" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold" style={{ color: "#F2C230" }}>
                      🏆 {h.winners.join(" & ")}
                    </span>
                    <span className="text-xs" style={{ color: "#8A9679" }}>
                      {
                        {
                          killer: "Killer",
                          knockout: "Knockout",
                          teamBattle: "Team Battle",
                          bullseyeBlitz: "Bullseye Blitz",
                        }[h.mode] || "Round Robin"
                      }{" "}
                      · {new Date(h.endedAt).toLocaleDateString()} · {h.rounds} round{h.rounds === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span style={{ color: "#C9C3B0" }} className="text-xs flex flex-wrap gap-x-3 gap-y-1">
                    {h.results.map((r, ri) => (
                      <span key={ri} className="inline-flex items-center gap-1">
                        <PrizeBadge mode={h.mode} tier={r.tier} size={12} />
                        {r.name}
                        {r.team ? ` (${r.team})` : ""}: {r.total}
                        {r.bullseyes !== undefined ? ` · ${r.bullseyes}🎯` : ""}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEDAL REVEAL */}
        {reveal && (
          <div
            className="medal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(10, 15, 8, 0.75)" }}
            onClick={() => setReveal(null)}
          >
            <div
              className="medal-pop relative w-full max-w-sm rounded-2xl p-6 text-center overflow-hidden"
              style={{ backgroundColor: "#26331F", border: "1px solid #3E4A35" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* rising confetti bits */}
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${8 + Math.random() * 84}%`,
                    top: `${40 + Math.random() * 40}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    fontSize: 14 + Math.random() * 10,
                  }}
                >
                  {["🥇", "🥈", "🥉", "🎯", MODE_PRIZE_ICON[reveal.mode] || "🏆"][i % 5]}
                </span>
              ))}

              <p className="text-xs uppercase tracking-widest mb-2 relative" style={{ color: "#8A9679" }}>
                {MODE_LABELS[reveal.mode] || "Round Robin"} finished
              </p>

              <div className="text-5xl mb-2 relative">
                <PrizeBadge mode={reveal.mode} tier="gold" size={44} />
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight mb-4 relative" style={{ color: "#F5F0E6" }}>
                {reveal.winners.join(" & ")}
              </h2>

              <div className="space-y-1.5 relative">
                {reveal.results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: "#22301D" }}
                  >
                    <span className="flex items-center gap-2">
                      <PrizeBadge mode={reveal.mode} tier={r.tier} size={14} />
                      <span style={{ color: "#F5F0E6" }}>
                        {r.name}
                        {r.team ? ` (Team ${r.team})` : ""}
                      </span>
                    </span>
                    <span style={{ color: "#8A9679" }}>
                      {r.total}
                      {r.bullseyes !== undefined ? ` · ${r.bullseyes}🎯` : ""}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setReveal(null)}
                className="mt-5 rounded-lg px-5 py-2 text-sm font-semibold relative"
                style={{ backgroundColor: "#F2C230", color: "#1B2417" }}
              >
                Nice one!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
