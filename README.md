# Forge Cottage Archery

Shared live scoreboard for the garden archery nights. 3 arrows a round, each
worth 2/4/6/8/10. Anyone at Forge Cottage can add themselves to the roster,
start a tournament, and score arrows from their own phone or the one
tablet on the table - it all polls the same shared state every 4 seconds.

Every player keeps lifetime stats: tournaments played, tournaments won,
best single round, all-time total score, and bullseye (10s) count.

## How it's built

Next.js (App Router) + a tiny set of API routes + Redis for storage, same
shape as your usual client sites: GitHub repo -> Vercel auto-deploy ->
Cloudflare domain.

There's no login - it's open by design, for you and guests.

## Deploy steps

1. **Push this folder to a new GitHub repo** (e.g. `darrenclare/forge-cottage-archery`),
   same as your other projects.
2. **Import it into Vercel** as a new project pointing at that repo. Framework
   preset will auto-detect as Next.js.
3. **Add a Redis database** so scores actually persist:
   - In the Vercel dashboard, go to your project -> Storage -> Create Database
     (or Marketplace -> search "Upstash"/"Redis") -> follow the prompts.
   - Connect it to this project. Vercel will inject either
     `KV_REST_API_URL` / `KV_REST_API_TOKEN` or
     `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` as environment
     variables - the app checks for both, so either naming works.
   - Redeploy after connecting it (env vars only apply to new deployments).
4. **Point your Cloudflare domain at it**, same as always (e.g.
   `archery.forgecottage.co.uk`), via Vercel's domain settings.

Without step 3, the app still runs but falls back to in-memory storage that
resets every time the server restarts - fine for a quick local preview,
not for real use. The app shows a small banner on-screen if it detects
this ("Running on local dev storage...") so it's obvious if the Redis
connection isn't set up yet.

## Local preview

```
npm install
npm run dev
```

Visit http://localhost:3000. Data won't persist between restarts unless
you also set the Redis env vars locally (pull them with `vercel env pull`
once the project is linked).

## Notes on how scoring works

- **Roster** is permanent - it's the full history of everyone who's ever
  played, with their lifetime stats.
- **Tournament** is the live, in-progress thing - pick who's playing
  tonight from the roster, then each round everyone scores 3 arrows.
  "End round" locks it in and starts fresh arrows. "Finish tournament"
  crowns whoever has the highest total, updates everyone's lifetime
  stats, and archives the result to history.
- Ties for the win are both credited a win - no tiebreaker built in, since
  that wasn't specified. Easy to add a sudden-death round later if you
  want one.
