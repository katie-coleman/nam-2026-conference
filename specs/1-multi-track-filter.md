# Select several tracks in the schedule's Track filter

## What this changes
In the `/schedule` filter rail, the Track buttons toggle: each press adds or removes that track, and the list shows talks from any selected track. "All" clears the selection. The URL carries `?track=a,b`, and the API accepts `trackSlug=a,b`. A single `?track=one` link and the single-value API call behave as today.

## Where
- `server/routes/sessions.js` (~line 119) — replace `t.slug = ?` with a split of `trackSlug` on commas into `t.slug IN (?, ?)`; blank entries dropped.
- `src/pages/SchedulePage.jsx` — `filters.track` stays a comma string; add a `toggleTrack(slug)` that splits it, adds or removes the slug, and calls `set('track', list.join(','))` (empty list clears, so `ALL` behaviour and `activeKeys`/`BLOCKERS` are unchanged). Track buttons (~line 74-85): `active = selected.includes(t.slug)`, add `aria-pressed={active}`; the All button gets `aria-pressed={selected.length === 0}`.
- `tests/schedule.spec.js` — new test in the `Schedule` describe using `visit`, `waitForResults`, `conferenceDays` from `tests/helpers.js`, reading counts from `GET /api/sessions?day=&trackSlug=`; add one case to `tests/api/endpoints.test.js` for `trackSlug=a,b`.
- `docs/context/schedule.md` — describe the multi-select track filter.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Two tracks list talks from both; `result-count` matches API for `trackSlug=a,b` | API test: `trackSlug=a,b` returns the union of `a` and `b` (false today: comma value matches nothing); spec asserts `result-count` equals the API count after selecting two | API + spec |
| Deselecting one narrows to the other | spec: click selected track again, `aria-pressed` false, `result-count` equals the API count for the remaining track | spec |
| "All tracks" clears the selection | spec: click All, URL has no `track=`, count equals unfiltered API count | spec |
| `?track=one` unchanged; endpoints test passes | existing `endpoints.test.js` and the "plain empty-state heading" spec keep passing | API + spec |
| Add and remove, checking counts each time | the same spec asserts the count after each add and each remove | spec |
| `docs/context/schedule.md` updated | reviewed in the diff | docs |

## Decisions
- The spec picks a day for the test where at least two tracks have sessions, and compares with the API's counts rather than hard-coding any. OK?
