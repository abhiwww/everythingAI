## What changed

<!-- One paragraph. Link the issue: Closes #123 -->

## Why

<!-- The user/product reason, not the implementation detail. -->

## How to verify

<!-- Exact steps or commands a reviewer can run. -->

## Checklist

- [ ] `tsc --noEmit` clean in every app touched
- [ ] Server tests added/updated and passing
- [ ] `docs/API_CONTRACT.md` updated if a route/field/status changed
- [ ] New numbered migration added (applied migrations untouched)
- [ ] No `.env`, secrets, `node_modules` or build output in the diff
- [ ] Demo labels intact — no unverified "booked/paid/verified" claims
- [ ] Screenshot or GIF attached for UI changes

## Risk and rollback

<!-- What can break, and how do we undo it? -->
