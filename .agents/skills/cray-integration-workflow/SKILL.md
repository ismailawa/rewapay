---
name: cray-integration-workflow
description: >-
  Enforces using docs/cray-api-v1-docs.md for API endpoint references before implementing any feature,
  tracking progress via STATUS.md, and validating tasks against docs/task-checklist.md.
---

# Cray Integration Workflow & Governance Skill

This skill enforces strict adherence to verified Cray v1 API specifications, task tracking, and acceptance criteria throughout the development of the RewaPay Cray integration module.

---

## 1. Mandatory Pre-Implementation Check

Before writing or editing any code for a task:
1. **Consult Official API Docs:** Open and search [cray-api-v1-docs.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/docs/cray-api-v1-docs.md) for the exact endpoint, request method, URL path, payload properties, authentication, and response fixtures. Never guess endpoints, parameter names, or casing.
2. **Consult Task Roadmap:** Check [STATUS.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/STATUS.md) to confirm the current task, open design decisions, and status.
3. **Review Acceptance Criteria:** Review the specific task item in [task-checklist.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/docs/task-checklist.md).

---

## 2. Implementation Execution Standards

- **Step-by-Step Task Pace:** Handle only one task at a time. Do not jump ahead to subsequent tasks without explicit user approval.
- **Strict Endpoint Casing & Spelling:** Ensure exact spelling of provider fields (e.g. `ref_id` for validation session, `customer_reference` for unique client reference, `account_number`, `bank_code`).
- **Cryptographic Request Signing:** Every signed request must format `X-Signature` as `t=<ms>,n=<uuid>,kid=<keyId>,v1=<base64-der-signature>` over the 5-line canonical string.
- **Financial Safety:**
  - Enforce idempotency on every money-movement endpoint.
  - Ambiguous timeouts must keep transactions `PENDING` and trigger requery (`GET /payout/requery/{transaction_id}`); never blind retry.
  - Zero floating-point arithmetic: use `MoneyUtil` (`decimal.js`) and 2-decimal NGN strings.
  - Mask all sensitive data (BVN, NIN, OTP, card data, account numbers) in logs.

---

## 3. Post-Implementation Verification & Checkpoint

After writing code for a task:
1. **Run Unit & Integration Tests:** Execute `npm test` and verify 100% test pass rate.
2. **Verify Build:** Execute `npm run build` to verify clean TypeScript compilation with zero errors.
3. **Update Status & Checklist:**
   - Mark the task completed in [STATUS.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/STATUS.md).
   - Check off acceptance criteria in [task-checklist.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/docs/task-checklist.md).
4. **Git Checkpoint:** Commit the task implementation with clear conventional commit messages.
5. **Report to User:** Present the completed deliverables, test outcomes, and wait for user confirmation before starting the next task.
