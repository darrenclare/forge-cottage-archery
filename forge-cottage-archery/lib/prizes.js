// Each tournament mode has its own themed prize. Tier (gold/silver/bronze)
// maps to placement. Team Battle only ever produces two placements since
// there are only two teams, so it has no bronze tier.

const PRIZE_TIERS = {
  roundRobin: ["gold", "silver", "bronze"],
  killer: ["gold", "silver", "bronze"],
  knockout: ["gold", "silver", "bronze"],
  teamBattle: ["gold", "silver"],
  bullseyeBlitz: ["gold", "silver", "bronze"],
};

function emptyPrizes() {
  return {
    roundRobin: { gold: 0, silver: 0, bronze: 0 },
    killer: { gold: 0, silver: 0, bronze: 0 },
    knockout: { gold: 0, silver: 0, bronze: 0 },
    teamBattle: { gold: 0, silver: 0 },
    bullseyeBlitz: { gold: 0, silver: 0, bronze: 0 },
  };
}

module.exports = { PRIZE_TIERS, emptyPrizes };
