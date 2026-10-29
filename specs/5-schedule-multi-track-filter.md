# Schedule: filter talks by several tracks at once

## What this changes
On `/schedule` the Track chips become a multi-select: ticking a second track adds it instead of replacing the first, and the list and grid-less results show talks from every ticked track. Chips are toggles (`aria-pressed`); **All** is lit when none is ticked and clears the selection. The choice lives in the URL as `?track=a,b`, so reload and shared links keep it, and an old `?track=a` link means the same as before. `GET /api/sessions?trackSlug=a,b` returns talks from either track; one slug returns exactly what it does today.

## Where
- `server/routes/sessions.js` line 38 — split `trackSlug` on commas (trim, drop empties) and push `t.slug IN (?, ?)`; one value gives the same query shape. API test in `tests/api/endpoints.test.js` (reads the live API with `boot.tracks`; no booking, so no lane): two slugs return the union of the two single-slug results, one slug is unchanged, an unknown slug alongside a real one still returns the real one.
- `src/pages/SchedulePage.jsx` — `filters.track` stays the raw comma string (`api.getSessions` passes it through `qs()`, so `src/lib/api.js` needs no change). Track chips (lines ~163-180): derive `selected = filters.track === ALL ? [] : filters.track.split(',')`; a chip click toggles its slug in that list and calls `set('track', list.join(','))` (empty list deletes the key via `set`); **All** clears. Add `aria-pressed` to each chip. `BLOCKERS` and `activeKeys` already treat any non-ALL track value as one filter, so the grid-to-list fallback and "clear" keep working.
- `tests/schedule.spec.js` — new test using a new read-only lane `schedule.tracks` in `tests/helpers.js` `LANES` (`agenda: false`, an attendee/day pair no other lane pins, per `tests/api/lanes.test.js`), clock pinned with `momentOn(0, MID_SESSION_TIME)`. Opens `?view=list&day=<day>`, picks track A then track B, checks `result-count` equals the API's count for `trackSlug=A,B`, unticks A and checks it equals B's alone, reloads and checks both state and URL, loads `?track=A` directly and checks A is pressed.
- `docs/context/schedule.md` — update `GET /api/sessions` (trackSlug is comma-separated) and `SchedulePage` (track chips toggle, `?track=a,b`).

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Track filter selects more than one track | tick two chips, both `aria-pressed=true` | spec |
| List shows only talks from selected tracks | `result-count` equals API count for `trackSlug=A,B`, and again after unticking A | spec |
| Selection is in the URL, old single-track URL works | URL has `track=A,B`, survives reload; `?track=A` opens with A pressed | spec |
| No track selected shows all tracks | **All** lit with none ticked; count equals unfiltered API count | spec |
| API returns talks from every requested slug, same for one slug | union of single-slug results equals `trackSlug=A,B`; single slug equals today's result | API |

## Decisions
- Is the grid still unavailable while any track is ticked (as for one track today), the list showing instead — OK?
- Does an unknown slug in the list simply match nothing for that slug, rather than a 400 — OK?

## Out of scope
The Speakers page track filter stays single-select (`speakers.js` reads its own params).
