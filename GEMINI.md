# RewaPay Cray Integration Rules

## Mandatory API Reference
- Before implementing or editing any Cray endpoint, DTO, or provider communication, you **MUST** consult and verify against the official Cray v2 documentation file:
  `/Users/ismailawa/Documents/Projects/rewapay-cray/docs/cray-api-v2-docs.md`
- Verify exact paths (e.g. `/virtual-accounts/create`, `/payout/banks`, `/payout/accounts/validate`, `/payout/disburse`, `/payout/requery/{transaction_id}`, `/checkout/initialize`, `/balance`), field names, query parameter rules, and response shapes.

## Mandatory Task & Progress Tracking
- Always consult `/Users/ismailawa/Documents/Projects/rewapay-cray/STATUS.md` for the current task scope, plan, open decisions, and status.
- Maintain and update the task checklist in `/Users/ismailawa/Documents/Projects/rewapay-cray/docs/task-checklist.md` for tracking task acceptance criteria.
- **Execute tasks strictly one by one.** Never proceed to the next task without user confirmation.
- Ensure 100% test pass rate (`npm test`) and zero compilation errors (`npm run build`) before marking any task completed.

