---
name: design-philosophy
description: The VS Code design philosophy — a shared Values→Principles→Moves vocabulary for reasoning about UI in design terms instead of raw pixels. Use when designing, building, reviewing, or giving feedback on any visual surface; when deciding a radius, spacing, type role, icon size, border, color, or motion; or when translating a "this feels off" observation into a concrete, principled fix.
---

# VS Code Design Philosophy

This skill is the **canonical VS Code design philosophy** — the single source of truth for how we reason about UI, for both developers and agents.

As more and more of the UI is implemented via agents and tooling, the pixels increasingly take care of themselves, and the scarce, human part becomes the design judgment behind them.

This is about _shifting left_ - talking about UI in design terms, not pixels, and having that conversation early. When something looks off, "this is 8px, should be 6px" fixes one number; "this surface is rounded at the wrong _elevation tier_" names the rule, so the fix lands everywhere and we catch it on a mockup or screenshot rather than in code review. The aim is to agree on _what the UI should be and why_, in language a designer and an engineer can share - the implementation (which token, which file) tends to follow once the design is settled.

---

## How to read this: three layers

The hardest part of any design language is getting from _"this feels off"_ to a clear, shared fix everyone agrees on. This bridges that in three steps, each explaining the one below it:

| Layer          | What it is                                                               | Example                                                                           |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Values**     | what we want people to _feel_, and why it's at stake                     | _Focused_                                                                         |
| **Principles** | evaluative rules you can hold a design up against, phrased as a question | _"One thing leads; the rest supports" - where does the eye go first?_             |
| **Moves**      | the concrete mechanics, each with a rule for _which one and why_         | _demote the secondary panel to a recessed background token / a quieter type role_ |

Read top-down when you're learning the system, and bottom-up when you're fixing a bug: name the **feeling**, find the **principle** it breaks, then reach for the **move** that restores it.

> **Worked example - a busy panel**
>
> - **See:** a panel feels busy and keeps pulling your eye off the editor.
> - **Feeling:** not _Calm_, not _Focused_.
> - **Principle:** breaks _Quiet at rest_ (it carries a permanent fill it shouldn't) and _One thing leads_ (secondary chrome competing with the editor).
> - **Move:** drop the panel to a recessed/transparent background token, reveal its border only on hover, and demote its labels to a quieter type role.

---

## The values: what we design for

These four values name what we want people to _feel_ using VS Code - they're the top layer, the thing every principle and move below is ultimately in service of. Learn them and you can describe almost any bug. Each is a _feeling_ the UI should give; each is upheld by one or more **principles** below. Reach for the value first, the principle second, the move last.

| Value          | Means                                                                                | When it's broken it feels…                    | Principles |
| -------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- | ---------- |
| **Calm**       | quiet at rest, uncluttered; room to breathe; soft, not sharp; plain-spoken and human | busy, noisy, cramped, jagged, cryptic, shouty | 1, 2, 3    |
| **Focused**    | clear hierarchy; one thing leads, the rest supports                                  | flat, samey, the eye has nowhere to go        | 4, 5       |
| **Consistent** | everything sits on the same ramps and tiers                                          | random, off-grid, drifting                    | 5, 6       |
| **Delightful** | small moments that _do a job_ - guide, confirm, orient                               | lifeless, abrupt, or gimmicky                 | 7          |

> Say _"this feels noisy, it's not **Calm**"_ before _"the background should be transparent."_ The value points everyone at the same principle.

### Why these four?

It's fair to ask: who would ever _want_ a UI that isn't calm, focused, consistent, and delightful? That's exactly the point. These aren't differentiators we're claiming over other products - they're the qualities most **under threat in a tool like ours**, and naming them is how we defend them. We chose them because they're the values VS Code is structurally inclined to _lose_:

- **Calm** is the first casualty of an IDE. VS Code is information-dense and lived in for hours; every feature team has a good reason to add one more affordance, and the sum is noise. Calm is the value that pushes back on our own gravity.
- **Focused** matters because our surfaces are _deep_. A screen full of equally-weighted, equally-valid controls is the default failure mode of a power tool. Naming focus forces us to decide what leads.
- **Consistent** has the largest surface area to defend. VS Code is built by many hands over many years; drift is the natural state. Consistency is less an aspiration than a maintenance discipline.
- **Delightful** is the one we deliberately **ration**. It earns its place only by doing a job (Principle 7). We name it not to add more polish but to keep it honest, so delight guides and confirms rather than decorates.

And each value names a real **tension**, not a free win - which is what makes it a choice worth stating rather than a platitude:

- **Calm** trades against **density** - how much do we surface at rest?
- **Focused** trades against **equal access** - what do we demote so one thing can lead?
- **Consistent** trades against the **genuinely special case** - when is a difference earned rather than drift?
- **Delightful** trades against **restraint** - when does a flourish cross into noise?

So the useful question isn't _"would we ever not want these?"_ but _"which one is this surface trading away, and did we mean to?"_ When a value really must yield - say, a critical warning that _should_ break calm to seize attention - that's a deliberate, named exception, not a reason to drop the value.

---

## Principles

Principles are **evaluative**: each one is a question you can ask of any surface, and the answer tells you whether the design is right - independent of any pixel value. They're grouped by the value they uphold.

---

### Calm

#### 1. Quiet at rest, present on intent

> **Ask:** _is anything shouting when nothing is happening?_

Chrome should recede until you engage it. A surface carrying a permanent fill, border, or focus ring it hasn't earned is competing with the user's content for attention it doesn't need. The modern look is **restrained**: things reveal themselves _on intent_ - hover, focus, interaction - and sit quietly otherwise.

When this is wrong it sounds like _"this is loud at rest / should be quiet until hover"_ or _"the focus ring is firing on click"_ - a behavioral description, not a color value.

_Carried out by:_ [reveal-on-intent behaviors](#reveal-on-intent), [one stroke](#one-stroke), [theme color](#theme-color).

#### 2. Room to breathe

> **Ask:** _does this feel cramped, tight, or jagged?_

Calm UI is generous and soft. Space isn't wasted; it's what lets the eye rest and groups things without drawing a single line. Edges are rounded rather than sharp. When a surface feels boxed-in or busy, the fix is usually more breathing room on the spacing ramp, not smaller content.

_Carried out by:_ [the spacing ramp](#spacing-ramp), [elevation tiers](#elevation-tiers) (rounded, not sharp).

#### 3. The interface explains itself, plainly and kindly

> **Ask:** _could someone understand this at a glance, without guessing?_

The UI should read like a person talking. Prefer a word to a mystery glyph; write in sentence case; keep the tone human. A lone unlabeled icon, or a Title-Cased Marketing Headline, makes the user work harder than they should - never cryptic, never shouting.

_Carried out by:_ [words & casing](#words-casing).

> **Worked example - a boxed-in toolbar**
>
> - **See:** a toolbar sits on a solid filled bar, separator lines between every button, the buttons pushed up against each other.
> - **Feeling:** not _Calm_ - busy and boxed-in.
> - **Principle:** breaks _Quiet at rest_ (the fill and separators are permanent chrome that hasn't earned its place) and _Room to breathe_ (buttons jammed together).
> - **Move:** let the bar read transparent at rest, drop the separators (one stroke - and here the answer is _no_), and space the buttons out on the ramp.

### Focused

#### 4. One thing leads; the rest supports

> **Ask:** _where does the eye go first - and is anything secondary competing with it?_

Every view should have a clear **center of attention** - the one thing the eye should land on first. Keep secondary information _out_ of that spot: demote it with a quieter type role, a recessed surface, or a smaller icon, so the thing that matters leads and everything else supports it. A view where everything has equal weight is _flat_ - the eye has nowhere to go.

_Carried out by:_ [type roles](#type-ramp), [elevation tiers](#elevation-tiers), [icon size by context](#icon-sizes).

#### 5. Elevation is encoded, not eyeballed

> **Ask:** _does this surface's roundness match how far it floats above what's beneath it?_

How rounded - and how raised - a surface is _means something_: it tells you where the surface sits in the stack. A floating overlay reads as more rounded than a control sitting flat inside a pane. Radius is chosen by the surface's role in the hierarchy, never by taste. (This serves both **Focused** and **Consistent**.)

_Carried out by:_ [elevation tiers](#elevation-tiers), [reveal-on-intent](#reveal-on-intent) (scroll shadows).

> **Worked example - a flat settings row**
>
> - **See:** a settings row shows its label, its help text, and a "Reset" action all at the same size and weight.
> - **Feeling:** not _Focused_ - flat; the eye doesn't know where to land.
> - **Principle:** breaks _One thing leads_ - nothing is the center of attention.
> - **Move:** lift the label to the leading type role, demote the help text to `body2`, and make "Reset" a quiet secondary action so the row reads top-down.

### Consistent

#### 6. Sameness signals sameness

> **Ask:** _do two like things look identical - and is any difference here intentional?_

Equivalent elements must look equivalent, because they pull from the same named scale. When two similar things differ, that difference should _mean_ something; accidental drift is the enemy. This is why every size, radius, weight, and color is a **named token with a role**, not a literal - the literal is only ever a stand-in for the token it lands on.

_Carried out by:_ every move below - they _are_ the shared scales. See especially [design tokens](#design-tokens), [the spacing ramp](#spacing-ramp), [the type ramp](#type-ramp), [icon sizes](#icon-sizes), [one stroke](#one-stroke).

> **Worked example - two mismatched dialogs**
>
> - **See:** two dialogs open side by side; one has 8px corners, the other 6px - both are floating overlays.
> - **Feeling:** not _Consistent_ - the UI feels like it's drifting.
> - **Principle:** breaks _Sameness signals sameness_ (two equivalent surfaces look different for no reason) and _Elevation is encoded_ (an overlay belongs on the Outer tier).
> - **Move:** point both at the Outer radius token; the 6px was a literal someone typed instead of naming the tier.

### Delightful

#### 7. Delight earns its keep

> **Ask:** _what does this help the user do?_

Motion, reveals, and finishing touches are welcome - but each must **do a job**: guide the eye, confirm an action, orient the user, or smooth a jump. If there's no answer to the question, it's decoration, and decoration reads as noise (back to **Calm**). Keep it subtle, short, and interruptible; honor `prefers-reduced-motion`; never animate for its own sake.

A delight bug sounds like _"this transition is doing nothing for me"_ (cut it) or _"this jump is disorienting - it needs a functional transition"_ (add one) - not a duration or easing value to fiddle with.

_Carried out by:_ [reveal-on-intent behaviors](#reveal-on-intent).

> **Worked example - a bouncing panel**
>
> - **See:** a side panel slides in with a 600ms bounce every time you toggle it.
> - **Feeling:** not _Delightful_ (gimmicky) and not _Calm_ (slow and shouty).
> - **Principle:** breaks _Delight earns its keep_ - the bounce isn't doing a job, and the toggle is already obvious.
> - **Move:** if nothing needs orienting, cut the animation; if the panel's arrival genuinely needs explaining, replace it with a short, subtle, interruptible fade that honors `prefers-reduced-motion`.

---

## The moves: the mechanical toolbox

Moves are the **concrete mechanics** - the tokens, ramps, and tiers. On their own they're just lists of allowed values; what makes each one usable is the **decision rule** that says _which value, and why_, plus the **principle** it serves. When you reach for a move, lead with the rule, not the literal.

This is the one section that touches implementation - and even here, the goal is to keep the _conversation_ about design. Treat the Moves as the **shared vocabulary that lets an agreed design be built consistently**, not as the opening move in a review. Reach for them _after_ you've named the feeling and the principle, never instead of it.

The size and font tokens live in [`baseSizes.ts`](../../../src/vs/platform/theme/common/sizes/baseSizes.ts); the full reference is in [design-tokens.instructions.md](../../instructions/design-tokens.instructions.md).

<a id="design-tokens"></a>

### Tokens are the source of truth, not the pixel

Design-system spacing, radii, type roles, and colors should use a named token or ramp where one exists. Raw literals remain valid for structural measurements.

- **Decision rule:** when something looks wrong, find the token it should be expressing and reason about _that_ - not the literal.
- **Serves:** _Sameness signals sameness_ (6).

> An `8px` corner isn't "8px." It's an **Outer surface radius** that someone typed as a literal. Name the role and the fix follows.

<a id="elevation-tiers"></a>

### Elevation tiers - round by role, not by literal

Corner radius encodes **how far a surface floats above the one beneath it**. Every rounded thing belongs to exactly one tier:

| Tier        | Radius | Token                          | What it is                                                   |
| ----------- | ------ | ------------------------------ | ------------------------------------------------------------ |
| **Control** | 4px    | `--vscode-cornerRadius-small`  | interactible elements - buttons, inputs, list rows, tabs     |
| **Inner**   | 6px    | `--vscode-cornerRadius-medium` | non-control containers sitting _inside_ a surface            |
| **Outer**   | 8px    | `--vscode-cornerRadius-large`  | floating / overlay surfaces - menus, hovers, dialogs, toasts |

Pills (radius ≈ half the height) are **fully round** (`--vscode-cornerRadius-circle`), not "a big radius."

- **Decision rule:** pick the tier by the surface's **role in the stack**, not by how the corner looks. A bug here sounds like _"this overlay is rounded at the control tier,"_ never _"this needs more border-radius."_
- **Serves:** _Elevation is encoded_ (5), _Room to breathe_ (2).

<a id="spacing-ramp"></a>

### The spacing ramp - on-scale or off-scale

Padding, margin, and gap come from the **spacing ramp** (0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40).

- **Decision rule:** a value either lands _on_ the ramp or it doesn't. Off-scale values (3, 5, 7, 14, 26…) break the rhythm; snap to the nearest step, ties rounding up. Report rhythm bugs as _"this is off the spacing ramp,"_ not _"add a couple of pixels."_
- **Serves:** _Room to breathe_ (2), _Sameness signals sameness_ (6).

<a id="type-ramp"></a>

### The type ramp - roles and two weights, not free sizes

Text styles are **roles**, not arbitrary sizes: `heading1–3`, `body1–2`, `label1–3`. There are exactly **two weights** - `regular` (400) and `semiBold` (600). There is no medium (500). "Strong" is not a bigger size; it is the _same role token at `semiBold`_.

- **Decision rule:** choose the role by the text's **rank in the hierarchy**, not by eyeballing a size. A heading that looks weak is _"the wrong type role"_ or _"missing the semiBold weight,"_ not _"bump the font to 14."_ A `500` anywhere is **off the ramp**.
- **Serves:** _One thing leads_ (4), _Sameness signals sameness_ (6).

<a id="icon-sizes"></a>

### Icon sizes - two sizes, chosen by context

Codicons are **16px (base)** or **12px (compact)** - nothing in between; `14px` is always a bug. At the compact size, also swap to the `*Compact` glyph (`Codicon.close` → `Codicon.closeCompact`) so the icon is _optically_ tuned, not just scaled.

- **Decision rule:** size tracks the **density and rank of the context**. Use **base (16px)** for standalone or primary actions and comfortable click targets; use **compact (12px)** for dense rows, inline glyphs, and secondary chrome where the icon rides alongside text. So the answer to "16 or 12?" is _"what is this icon's role here?"_ - not a taste call. Say _"this icon should be compact,"_ not _"shrink it a bit."_
- **Serves:** _One thing leads_ (4), _Sameness signals sameness_ (6).

<a id="one-stroke"></a>

### One stroke

The standard border/separator stroke is **1px** (`--vscode-strokeThickness`).

- **Decision rule:** whether an ordinary border is present is a **yes/no** decision. Preserve thicker semantic or accessibility strokes, such as focus indicators.
- **Serves:** _Quiet at rest_ (1), _Sameness signals sameness_ (6).

<a id="theme-color"></a>

### Color comes from the theme

Every color is a `--vscode-*` theme token, so the UI tracks the active theme and high-contrast modes.

- **Decision rule:** a hardcoded hex is a bug by construction. Color bugs are _"wrong theme token"_ (or _"a token that disappears in light/HC"_), never a hex value to nudge.
- **Serves:** _Quiet at rest_ (1), _Sameness signals sameness_ (6).

<a id="reveal-on-intent"></a>

### Reveal-on-intent behaviors

Chrome that used to carry a permanent fill now reads transparent at rest and only reveals on interaction. Each behavior also _does a job_, so they pull double duty:

- `commandCenter` - transparent at rest; shows its background/border on hover, so a pointer _confirms_ the thing it's over.
- `statusBar` - neutralized to the window; only the **background** changes on hover, the foreground stays put.
- `keyboardFocusOnly` - the focus ring appears for **keyboard** focus (`:focus-visible`), not on mouse click, so the affordance shows exactly when it's useful.
- `scrollShadows` - content _fades_ under a surface edge instead of being cut at a hard line, so you feel there's _more_ beyond the fold.

- **Serves:** _Quiet at rest_ (1), _Delight earns its keep_ (7), and (scroll shadows) _Elevation is encoded_ (5).

<a id="words-casing"></a>

### Words & casing

**Prefer a text label to an icon.** A word is read; an icon is _guessed_. Reach for a glyph only when its meaning is near-universal (close, search) or space is genuinely scarce - otherwise label the thing, or pair icon + label when you need both recognition and recall. A lone mystery glyph is the bug, not a badly-chosen one: _"this action is unlabeled - give it a word,"_ not _"find a clearer icon."_

**Write in sentence case.** Labels, buttons, menus, and messages capitalize the first word and proper nouns only - _"Start new session,"_ not _"Start New Session."_ It's calmer, friendlier, and quicker to scan. Report it as _"this is Title Case - make it sentence case,"_ a tone fix, not a reword.

> **⚠️ Known conflict - reconcile later.** This sentence-case guidance is the intended modern-UI direction, but it **contradicts** the repo-wide coding guideline that mandates title-style capitalization for command labels, buttons, and menu items (see [coding-guidelines.instructions.md](../../instructions/coding-guidelines.instructions.md), "UI labels"). The two conventions have not yet been reconciled. Until they are, **follow the existing title-case rule for shipped, non-experimental UI**, and apply sentence case only within surfaces that have explicitly adopted the modern UI direction. TODO: agree a single casing convention and update whichever doc loses.

- **Serves:** _The interface explains itself_ (3).

---

## The phrasebook: describe the bug, name the principle

Lead with the **role / tier / ramp**, not the number - then name the principle so the fix lands everywhere, not just here. The number is a symptom.

| ❌ Don't say                             | ✅ Do say                                                                                                             | Principle                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| "border-radius should be 6, not 8"       | "this is an **Inner** surface rounded at the **Outer** tier"                                                          | 5 · Elevation               |
| "this menu corner is too sharp"          | "this **overlay** should be on the **Outer** radius tier"                                                             | 5 · Elevation               |
| "add 2px of padding"                     | "this content is **off the spacing ramp** / needs ramp breathing room"                                                | 2 · Room to breathe         |
| "make this 14px"                         | "this should use the **`label1` / `body1` type role**"                                                                | 4 · One thing leads         |
| "the title looks thin"                   | "the heading is **missing the `semiBold` weight**"                                                                    | 4 · One thing leads         |
| "font-weight 500 here"                   | "**500 is off the ramp** - snap to `semiBold` (600)"                                                                  | 6 · Sameness                |
| "shrink this icon a touch"               | "this icon should be the **compact (12px) size + `*Compact` glyph**"                                                  | 4 · One thing leads         |
| "this icon is 14px"                      | "codicons are **16 or 12 only** - pick base or compact"                                                               | 6 · Sameness                |
| "this ordinary border is too thick"      | "standard borders are **one stroke (1px)** - this should/shouldn't have one; preserve thicker focus/semantic strokes" | 1 · Quiet at rest           |
| "change this grey hex"                   | "this is the **wrong theme token** / it **vanishes in light/HC**"                                                     | 6 · Sameness                |
| "the command center has a box around it" | "chrome should be **quiet at rest, reveal on hover**"                                                                 | 1 · Quiet at rest           |
| "the focus outline shows when I click"   | "the ring is **keyboard-focus only** (`:focus-visible`)"                                                              | 1 · Quiet at rest           |
| "the list is cut off at the bottom"      | "the surface is **missing its scroll-shadow fade**"                                                                   | 7 · Delight / 5 · Elevation |
| "the pane header has a line / hard edge" | "pane headers are **rounded, separator-less section titles**"                                                         | 1 · Quiet at rest           |

---

## Giving and receiving feedback

**Describe the design, not the pixel.** When you name the rule that's broken, the fix lands everywhere it's broken - not just in the one spot you happened to notice.

When something looks wrong, say it in this order:

1. **The feeling** - which of the four values is it missing? _Calm, Focused, Consistent, Delightful._
2. **The surface** - what and where? _"the sidebar pane header," "the Save dialog."_
3. **The principle it breaks** - the rule behind the feeling.
4. **The move that would fix it** - the mechanic that restores it.
5. **Only then, if useful, the number** - _"shows 4px, looks like it wants 6px."_

> **Example** "The activity bar doesn't feel **Calm** - it's loud at rest. The icons carry a permanent fill that's competing with the editor (_Quiet at rest, present on intent_). Could the fill reveal on hover instead? It reads about 2px too tight as well, but the fill is the real thing."

### Lead with the feeling, not the fix

The word points everyone at the same principle, even before anyone agrees on a pixel:

| Say this first                                                | Not this                          |
| ------------------------------------------------------------- | --------------------------------- |
| "this doesn't feel **Calm** - it's noisy at rest"             | "make the background transparent" |
| "this isn't **Focused** - the eye has nowhere to land"        | "make the title bigger"           |
| "this feels **inconsistent** - these two dialogs don't match" | "change the radius to 6"          |
| "this transition isn't **Delightful**, it's just decoration"  | "make the animation faster"       |

### What makes feedback hard to act on

These aren't wrong, they're just _incomplete_ - they fix one spot and drift back out of sync:

- **A bare number.** _"This should be 6px."_ Which token? Why? Name the role and the fix lands everywhere.
- **A taste claim with no rule.** _"I don't like this corner."_ Tie it to a value or principle so it's a shared standard, not a preference.
- **A fix with no feeling.** _"Make it transparent."_ Maybe - but say what's wrong first (_"it's loud at rest"_), so we fix the cause, not just this instance.
- **Several things at once.** Split _"this panel is busy, off-grid, and the icon's wrong"_ into three, each with its own value.

### Practical notes

- **Attach the surface.** A screenshot or a short clip (for motion) plus the name of the view beats a paragraph of description. Circle the spot.
- **One observation per thread.** Keep each piece of feedback to a single surface + value, so it can be discussed and resolved on its own.
- **Light vs. dark vs. high-contrast.** If something only breaks in one theme, say so - that usually points at a _theme token_ problem, not a color choice.
- **Reduced motion.** For animation feedback, note whether you have `prefers-reduced-motion` on; a transition should still make sense without it.
