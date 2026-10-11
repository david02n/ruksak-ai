# Review and delegation loop: build plan

Status: draft for David's review. Written 2026-10-11 from the chat and voice sessions of 10 and 11 October.
Harness nodes: `prob-decision-overload`, `opp-ceo-delegation-loop`.

## 1. Purpose

Help David be more effective at Perchpeek and on his own builds by moving him from delivery to decisions.

He states a problem, and the org drafts the plan, proposes owners and writes a hidden acceptance check. David then approves, the org delivers, a separate pass verifies, and the result reports back. What gets measured is decisions made, not tasks done.

## 2. The model

| David (CEO) | The org (Claude, model plus harness) |
|---|---|
| Provide direction and vision | Ideate ways to achieve goals |
| Set goals | Understand direction and vision; seek to validate and invalidate |
| Align plans | Create plans under guidance and known preferences |
| Approve progress | Deliver on plans |

## 3. The loop

1. **Capture.** A voice or typed dump, or a problem stated in any Claude surface. It should take seconds.
2. **Plan.** The org drafts a plan. Each item gets an owner, an output mode, a "done when" line and a hidden check.
3. **Align.** David annotates the plan by voice or typing. Notes are held, nothing fires, and one holistic pass applies them all. This repeats until he's happy.
4. **Approve.** Committing the plan is the act of delegation.
5. **Deliver.** Each item runs through its owner, either a named skill or an agent prompt, via Claude Code (the GitHub Action, or an interactive session).
6. **Verify.** A separate pass gets the hidden check and the delivered output, and nothing else. It returns pass or fail with evidence.
7. **Approve progress.** A short digest: failures and blockers first, then items waiting for review, then auto items already done, with links.

## 4. Principles

- **Plans are always reviewable. Outputs are only reviewed when the item says so.**
- **Nothing lives only in David's head.** Capture must be fast enough to use on a heavy day.
- **The system holds the backlog.** If he ignores it for a week, he comes back to a clear digest, not a pile.
- **Minimum clicks.** Adding a note is one gesture: select, then speak or type, then Enter. Sending for a pass is one button. Accepting is all at once or per change.
- **Works from any machine.** Hosted, with GitHub as the store and no local setup.
- **Offline-first capture.** Notes save locally the instant they're made and sync when the connection returns. A pass needs to be online; capture and annotation never do.
- **Voice or type everywhere.** Both feed the same note field, and neither is the fallback.
- **Not a third workspace.** Work stays in Cowork and Claude Code. The surface is a pane opened from a link and then closed.
- **Every pass closes every note:** applied, declined with a reason, or turned into a question back. This stops notes drifting.
- **Runs on David's Max subscription.** No API key and no server-side LLM.

## 5. Architecture

| Part | What it does | Notes |
|---|---|---|
| **Review-file format** | A standard file for a doc, plan or action list, plus its notes | The real product. Any Claude skill can write and read it. |
| **`ruksak-review` skill** | Generates files in the format; runs a pass (holistic revision, every note resolved); runs the verify pass | Works with no surface. Published as a plugin from this public repo so every repo's Action can install it. |
| **Thin review surface** | Renders the file; anchored notes by voice or type; local autosave; offline; "ready for pass" | Starts from the existing Perchpeek actions review page, generalised. |
| **Store and MCP** | Pointers, versions, note state and workspaces across repos; tools such as `create_document`, `add_note`, `send_for_pass` and `progress_digest` | Ruksak's existing Next.js app, Postgres, Clerk and OAuth MCP. Doc text stays in GitHub. |
| **GitHub Action** | Runs passes and delivery inside the target repo using `CLAUDE_CODE_OAUTH_TOKEN` | Reads that repo's `CLAUDE.md`, skills and memory, so context comes free. |

**Where content lives**

- Docs and plans are markdown in the workspace's GitHub repo.
- A review round is a branch plus a PR.
- Notes are written into the branch as `.review/<doc>.notes.yaml` and removed on merge.
- Ruksak's database holds pointers and state, not document text.

### Review-file format (v0 draft, to be reconciled with the existing actions-review format)

```yaml
# .review/launch-plan.notes.yaml
target: plans/launch-plan.md
base_sha: <commit the notes were made against>
status: draft | ready | in_pass | proposed | applied
notes:
  - id: n1
    anchor: { quote: "launch in Q1", section: "Timeline" }
    kind: note | add | cut | replace | question
    body: "Q1 is unrealistic, move to Q2 and say why"
    input: voice | type
    resolution: applied | declined | question   # written by the pass
    reply: "Moved to Q2, cited hiring gap"         # written by the pass
```

Plan items carry:

```yaml
- id: p3
  title: Draft pricing page copy
  owner: me | skill:<name> | agent:<prompt-file>
  output: auto | review
  done_when: "Page states three tiers with prices and one CTA"
  check_ref: <id of hidden check, stored outside the build branch>
  status: planned | delegated | delivered | verified | failed
```

### Hidden acceptance checks

- Written or approved when the plan is approved, and stored where the builder can't read them: the Ruksak store or a separate private checks repo.
- The verify pass alone receives the check and the output.
- Code items use real tests. Docs and plans use a rubric of checkable statements, for example "every claim is cited" or "no commitments David didn't approve".
- Caveat: a rubric graded by a model catches missing pieces and obvious faking, not subtle errors. Prefer hard checks wherever an item allows one.

## 6. Build stages

Each stage ships with its own hidden check, so we dogfood the method while building it.

| # | Stage | Done when |
|---|---|---|
| 0 | **Recover the existing surface.** Pull the Perchpeek actions-review page and its format from `perchpeek-agent`. | Its format and features are documented here, and v0 above is reconciled with it. |
| 1 | **Format and skill** | Inside Cowork, with no surface, a plan with 5 notes goes through one pass and every note comes back resolved. |
| 2 | **Thin review surface:** render, anchored notes, voice or type, local autosave, offline, ready for pass | Annotate offline, reconnect, nothing is lost. Each note takes one gesture. |
| 3 | **Store, MCP and GitHub Action** | Annotate on one machine, the pass runs without opening Claude, and the result is reviewable on another machine. |
| 4 | **Delegation:** owner and output mode per item; send each item to a skill or agent prompt | A committed plan with mixed owners runs. Auto items land without David; review items come back. |
| 5 | **Verify pass and progress digest** | A deliberately faked delivery fails its hidden check and appears at the top of the digest. |
| 6 | **Workspaces:** `perchpeek-agent` plus 02N and personal repos | The same surface reviews a Perchpeek action list and an 02N plan. |

## 7. Housekeeping before stage 3

- Confirm ruksak.ai is live and healthy on Railway, and that Railway auto-deploys from `main`.
- Move test scripts to Node 22. `--experimental-strip-types` fails on Node 20.
- Add a Dockerfile for portability to AWS later.
- Keep it as a single Next.js app, with logic in a service layer and thin routes, so it can split later if needed.
- Reconnect the Ruksak MCP to Claude.

## 8. Open items

- **Existing actions-review surface:** its location, format and features. It couldn't be read from this session because `perchpeek-agent` is private. This is stage 0.
- **Where 02N and personal notes live:** an existing repo, or a new private `david02n/notes`.
- **Perchpeek content passing through 02N-hosted Ruksak** and David's personal subscription: check employer policy. Mitigation: keep doc text in GitHub only.
- **Harness Builder visualisation:** out of scope. Store plans and links so its flow view could read them later.
- **GitHub Actions minutes on private repos,** and subscription usage per pass: monitor once stage 3 runs.

## 9. Out of scope

- Visualisation and flow views (Harness Builder).
- A standalone app that becomes a workspace.
- A server-side LLM or API key.
- Rich-text editing. Markdown plus notes covers it.
