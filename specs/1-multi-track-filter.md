# Select several tracks at once in the track filter

## What this changes
On `/schedule` the track pills become toggles: clicking a track adds it to the
filter, clicking it again removes it, and the talks from every selected track
show together. The URL carries them as `?track=a,b`; `GET /api/sessions` accepts
`trackSlug=a,b`. "All" clears every selected track, and deselecting the last one
falls back to all tracks. One selected track behaves exactly as today, any
selected track still forces List view, and each pill exposes `aria-pressed`.

## Where
- `server/routes/sessions.js` — the `trackSlug` line (`where.push('t.slug = ?')`): split on `,`, trim, drop empties, push `t.slug IN (?, ?)`; one value gives the same query as today. Test in `tests/api/endpoints.test.js` (its `boot`/`ids` fixtures; two tracks from `boot.tracks`).
- `src/pages/SchedulePage.jsx` — `filters.track` stays the raw comma string (so `qs()`, `api.getSessions` and `BLOCKERS` need no change). Derive `selectedTracks = filters.track === ALL ? [] : filters.track.split(',')`; the track pill `onClick` computes the toggled list and calls `set('track', list.join(','))` (empty list deletes the key via the existing `!value` branch); `active = selectedTracks.includes(t.slug)`; add `aria-pressed={active}` to each track pill and to "All" (`selectedTracks.length === 0`).
- `src/lib/api.js` — no change: `getSessions` already passes `trackSlug` through `qs()`.
- `docs/context/schedule.md` — note in `SchedulePage` / Where-to-change that the track pills are multi-select.
- Spec test in `tests/schedule.spec.js` using `visit`, `waitForResults`, `API`, `conferenceDays`; read-only, so no lane or booking is needed. Counts come from `request.get(`${API}/sessions?day=…&trackSlug=…`)`.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Two tracks show talks from both, `result-count` matches API count for `trackSlug=a,b` | API: `trackSlug=a,b` returns the union of `a` and `b` (false today: matches nothing); spec: click two pills, `result-count` equals the API count for `a,b` | API + spec |
| Deselecting one of two leaves only the other, count matches that track alone | spec: click a, b, then a again; URL is `track=b`, `result-count` equals the API count for `b` | spec |
| "All" clears every track; deselecting the last falls back to all | spec: from two selected, click All, URL has no `track=`; select one, deselect it, URL has no `track=` and count equals the unfiltered count | spec |
| Single track and "all" unchanged; `?track=a` links and `endpoints.test.js` still pass | API: `trackSlug=a` equals today's result; the existing suite stays green (a regression guard, not red today) | API |
| Any selected track still forces List view, Grid disabled, notice shown | spec: with two tracks selected, Grid tab is disabled and `grid-blocked-notice` is visible (the existing blocker is kept; not red today, a guard for the multi-value case) | spec |
| Each pill exposes `aria-pressed` | spec: pill has `aria-pressed="false"`, then `"true"` once clicked (false today: attribute absent) | spec |

## Decisions
- Treat an unknown slug in a comma list as simply matching nothing (no 400), as a single unknown slug does today — OK?
- Mark "All" with `aria-pressed` too (true when no track is selected), as well as the track pills — OK?

## Out of scope
`speakers.js` reads its own `trackSlug`; the speakers page is not changed.
