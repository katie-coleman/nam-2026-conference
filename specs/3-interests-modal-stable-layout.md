# Interests modal: topic buttons must not move or reorder when ticked

## What this changes
In the Interests modal, ticking or unticking a topic no longer moves anything. Today a ticked topic gains a check icon, grows wider, and the wrapped rows of topics reflow. After this, every topic button reserves the check icon's space whether ticked or not, so each button keeps its position and size on desktop and phone. A ticked topic stays clearly marked by its violet border, tint and text colour, and the check icon, which appears in the reserved space. Order is unchanged (it follows the `tags` order from `/bootstrap`, which is fixed). Save and Cancel sit below the topic group and so stay put once no row can wrap differently.

## Where
- `src/components/InterestsDialog.jsx` — the topic button: replace `{on && <Icon name="check" className="size-3" />}` with an always-rendered icon, `invisible` when not ticked, so the width is constant.
- `tests/helpers.js` — add lane `'interests.layout'` to `LANES` (desktop sofia day 3, mobile jonas day 3, both `agenda: false`; a different attendee from `interests.menu` so the two specs do not race on one attendee's interests, and `tests/unit/lanes.test.js` still passes).
- `tests/interests.spec.js` — new test using `laneFor('interests.layout', testInfo)`, `momentOn(0, '07:00')` to pin the clock, `visit`; restores the original interests in `finally` as the existing test does.
- `docs/context/ui.md` — the switcher paragraph on `InterestsDialog` gains one clause: a topic button's size is the same ticked or not.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Ticking and unticking does not change any topic button's position or size, desktop and mobile | New spec records every `interest-<slug>` bounding box, ticks one, asserts all boxes are equal, unticks, asserts equal again. False on main: the ticked button gains width and the following buttons shift | browser spec (desktop and mobile projects) |
| Same order before and after ticking, after saving, and on reopen | Same spec reads the `data-testid` sequence of the topic buttons before ticking, after ticking, and after save, reload and reopen, and asserts it equals the `/bootstrap` topic order | browser spec |
| A ticked topic is still clearly distinguishable | Existing `aria-checked="true"` assertions stay; the new spec asserts the ticked button's computed `border-color` differs from an unticked one's | browser spec |
| Save and Cancel do not move while topics are ticked | Same spec records the `interests-save` and Cancel boxes before and after ticking and asserts equality. On main this can already hold; it pins the criterion rather than proving a change | browser spec |
| A browser spec covers it, own attendee, pinned clock | The spec itself, with its own lane and `momentOn` | browser spec |

## Decisions
- Reserve space for the check icon on every button (always rendered, hidden when unticked), rather than drop the icon and mark state by colour and border alone — OK?
- Unticked buttons become one icon width (about 18px) wider than today, so more topics may wrap onto extra rows — OK?

## Out of scope
Which topics are offered, how interests are saved, the My Agenda page.
