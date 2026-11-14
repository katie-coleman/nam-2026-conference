# Select several tracks in the schedule filter

## What this changes
The track pills on `/schedule` toggle independently. Clicking a second pill adds it, clicking a selected pill removes it, and with none selected every track shows. The list shows the sessions of all selected tracks, the URL reads `?track=a,b`, selected pills carry `aria-pressed="true"`, and the Grid tab is disabled (naming the track filter) with one or more tracks selected. `GET /api/sessions` accepts `trackSlug=a,b`; one value is the same query as today. `/speakers` is untouched.

## Where
- `server/routes/sessions.js` — the `trackSlug` clause (line ~38): split on `,`, trim, drop empties, push `t.slug IN (?, ?)` with one placeholder per slug. Update the doc comment above the route if needed. Test in `tests/api/endpoints.test.js` (or a new `tests/api/sessions-tracks.test.js` using `tests/api/harness.js`): two slugs return the union of each alone, one slug equals the existing result.
- `src/pages/SchedulePage.jsx` — `filters.track` stays the raw comma string (`params.get('track') ?? ALL`), so `api.getSessions({ trackSlug })`, `qs()` and the `useFetch` deps need no change. Add `selectedTracks = filters.track === ALL ? [] : filters.track.split(',')`. The track pill `onClick` toggles the slug in that array and writes the result joined by `,`; the `All` pill clears it. `active` becomes `selectedTracks.includes(t.slug)`; add `aria-pressed={active}` to each pill (and `All` is pressed when none selected). `set()` encodes commas as `%2C`, so the track write builds the query string by hand (`next.toString().replace(/%2C/g, ',')` passed to `setParams`) to keep the URL literally `?track=a,b`. `BLOCKERS` already treats any non-`all` track as a blocker, so the Grid tab and notice need no change. Active-filter count in `activeKeys` stays one for `track`.
- `tests/schedule.spec.js` — new test in the `Schedule` describe: pick two tracks with sessions on the day from `/bootstrap` and `/sessions`, `visit` the page with `view=list`, click pill 1, then pill 2, asserting after each `waitForResults(page)` that `result-count` equals the API's count for `trackSlug=a`, `a,b`, then click pill 2 off (count for `a`), pill 1 off (count for all), checking `aria-pressed` and the URL each time, and that `view-grid` is disabled with two tracks selected. Read-only, so it needs no data lane.
- `context/engineering-context/schedule.md` — `GET /api/sessions` section: `trackSlug` is a comma-separated `IN` clause; `SchedulePage` section: track handling is multi-valued (toggle pills, literal commas in the URL).

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Second pill adds it; list shows both; URL `?track=a,b` | spec: click two pills, `result-count` equals API count for `a,b`, URL matches `track=a,b` | spec |
| Clicking a selected pill removes it; removing the last shows all | same spec: remove each, count equals API for `a`, then for all | spec |
| `result-count` equals API count after every add and remove | asserted at each of the four steps | spec |
| Selected pills expose `aria-pressed="true"` | spec: `toHaveAttribute('aria-pressed','true')` on selected, `false` on removed | spec |
| Single `?track=a` behaves as before; `endpoints.test.js` passes | API test: `trackSlug=a` result is unchanged and `a,b` is the union; existing file run unchanged | API |
| Grid tab disabled with several tracks, names the track filter | spec: `view-grid` disabled, `title` contains "track filter" with two selected | spec |
| `schedule.md` describes the clause and handling as multi-valued | `npm test` context checks plus review of the doc diff (`node scripts/context.mjs for` the changed files) | review |

## Decisions
- Does the `All` pill stay as a button that clears the selection (rather than being dropped), shown pressed when nothing is selected — OK?
- Is the URL kept as a literal `?track=a,b` (commas unescaped) rather than `%2C`, since the ticket says the URL reads `?track=a,b` — OK?

## Out of scope
`/speakers` track filter, other filters becoming multi-valued, and any change to how many tracks the Grid supports.
