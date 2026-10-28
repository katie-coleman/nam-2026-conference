# Attendees choose their topic interests from the name menu

## What this changes
The attendee menu (opened from the name in the header) gains an **Interests** option. It opens a modal in the style of `ConflictDialog` listing every topic tag as a toggle, the attendee's current interests ticked. Save stores the selection in `users.interests`; an empty selection is allowed and clears it. Reopening the modal, even after a reload, shows the saved ticks. The API rejects anything that is not a topic tag.

## Where
- `server/routes/users.js` — new `PUT /:id/interests`, body `{ interests: string[] }` of tag names (the form `users.interests` and `toUser` already use). 404 unknown user; 400 if `interests` is not an array or any entry is not a `tags.kind = 'topic'` name (tech/audience/vibe names, unknown names). De-duplicate, store comma-joined, return `toUser(row)` via the existing mapper. Statements at module scope beside `follow`/`unfollow`.
- `src/lib/api.js` — `saveInterests(userId, interests)`, the only `fetch` caller.
- `src/lib/store.jsx` — `saveInterests(interests)` on `useConference()`: calls the api, replaces the matching entry in `data.users` (so `currentUser.interests` is live, no refetch), toasts on failure.
- `src/components/InterestsDialog.jsx` — new, modelled on `ConflictDialog` (focus in/out, Escape, scroll lock, backdrop Close) but portalled to `document.body`, since the header is `glass` and would contain a `fixed` child (ui.md Gotchas). Topic tags come from `useConference().tags` filtered by `kind === 'topic'`; each is a `role="checkbox"` button (`data-testid="interest-<slug>"`); Save `data-testid="interests-save"`; dialog `data-testid="interests-dialog"`. Draft state resets from `currentUser.interests` each time it opens.
- `src/components/UserSwitcher.jsx` — an "Interests" row (`data-testid="open-interests"`) in the menu panel, closing the menu and opening the dialog.
- Tests: `tests/api/interests.test.js` (`startApi()` from `tests/api/harness.js`); `tests/interests.spec.js` using `visit`, `momentOn`, `laneFor` from `tests/helpers.js`, with a new `interests.menu` entry in `LANES` giving each project its own attendee (`agenda: false`, no seat booked) — and `tests/api/endpoints.test.js` `covered` list gains `PUT users/:id/interests`. The spec restores the attendee's original interests when done. Docs: `docs/context/seats.md` Routes table and `ui.md` UserSwitcher notes.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Menu has an Interests option that opens the modal | open menu, click `open-interests`, `interests-dialog` visible | spec |
| Modal lists every topic tag, current interests ticked | topic tag count in dialog equals topic tags from `/meta/bootstrap`; no tech/audience/vibe tag; seeded interests are `aria-checked` | spec |
| Saving persists across reload | tick a topic, save, reload with `visit`, reopen: same ticks; `GET /users/:id` interests match | spec + API |
| Empty selection clears | `PUT {interests: []}` → 200 and `interests: []`; spec unticks all, saves, reopens: none ticked | API + spec |
| Only topic tags can be saved | PUT a tech/audience/vibe name, an unknown name, a non-array → 400 and stored interests unchanged; unknown user → 404 | API |
| Tests cover route and modal flow | the files above, clock pinned via `momentOn(0, '07:00')`, own lane | — |

## Decisions
- Interests are sent and stored as tag **names**, matching how `users.interests` is seeded and mapped today — OK?
- The Interests row sits in the menu panel, below the attendee list and above "Workshop talks", for any signed-in attendee — OK?
- Save closes the dialog with a short toast ("Interests saved") rather than staying open — OK?

## Out of scope
Recommended talks, "talks I'm giving" / "signed up for" sections, any ranking or Home use of interests.
