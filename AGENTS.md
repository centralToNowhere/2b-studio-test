# About

This is a construction-company CRM. The client uses React, strict TypeScript, Vite, Base UI (`@base-ui/react`) and CSS Modules. Supabase Cloud provides Auth, PostgreSQL and the API. There is no separate Node.js API server; Node.js is used for development and build tooling.

## Locale and UI

Use Russian for the UI and Russian datetime formatting in the Europe/Moscow timezone.
Keep the design minimalistic. Use CSS variables for colors, spacing, border radii, control sizes and modal shadows. Support light/dark themes with a header switch and sm/md/lg/xl breakpoints. Display errors with Toast notifications.

## Client architecture

Use simplified Feature-Sliced Design without widgets. Use React Router for navigation and TanStack Query for all Supabase queries and mutations. Use MobX with mobx-persist for object/task description drafts, isolated by user and record. Clear a draft after a successful save; clear server caches on logout.

Keep API DTO types separate from client models. Use the `@` alias for `/src`. Use strict TypeScript, ESLint and Prettier. Use Playwright to test business rules, including direct API attempts to bypass UI restrictions.

## Screens

1. Email/password login, without public registration.
2. Object list for suppliers.
3. Object details with tasks in a table, filtered by assignee, status and creation date.
4. Task details, permitted action buttons and status history.
5. My tasks for assignees, filtered by creation date and status.

## Domain and roles

The first version serves one company. Each user has exactly one role: `supplier` or `assignee`.

- Supplier: view/create/update/soft-delete all objects and tasks in the company, assign an assignee and perform the supplier status transitions below.
- Assignee: view only tasks assigned to them, their history and related object information. They may change the task status only through allowed transitions and optionally add a comment to that transition. They may not edit task name, description, assignee, author, object or creation date.

Entities:

- Object: name, address, optional description, creation datetime, related tasks.
- Task: name, description, required assignee, current status, author, creation datetime, related object. The task date and date filters mean **creation date**, not deadline or planned work date.
- TaskStatus: datetime, `state` enum, author, relation to Task. Each record is a historical status transition.
- TaskStatusComment: datetime, author, content, relation to TaskStatus. At most one comment is created atomically with a transition. It cannot be appended later, edited or deleted.
- Profile: Auth user, display name and role, administered manually.

TaskStatus and TaskStatusComment are immutable for application users. Authors and timestamps are server-generated. Object and task deletion is soft deletion: data/history are retained; deleted objects and their tasks disappear from working lists and the user API. Restoration is out of scope.

## Status transitions

Follow [the status table](.agents/images/task-statuses-table.png):

| From            | To                                 | Who               | Comment            |
| --------------- | ---------------------------------- | ----------------- | ------------------ |
| Task creation   | New (`new`)                        | Supplier          | —                  |
| New             | In Progress (`in progress`)        | Assigned assignee | Optional           |
| In Progress     | In Review (`on review`)            | Assigned assignee | Optional           |
| In Review       | Accepted (`accepted`)              | Supplier          | Optional           |
| In Review       | Rework Required (`under revision`) | Supplier          | Required, nonblank |
| Rework Required | In Progress                        | Assigned assignee | Optional           |

No other transitions are allowed. Accepted is terminal. Preserve the enum values already present in the cloud schema. Render their labels in Russian.

## Security and backend

Use RLS on every exposed application table. Suppliers are the only role allowed to create/edit/soft-delete objects and tasks. Assignees can read and transition only their assigned tasks. Deny direct client writes to task status/history/comments and profiles. Enforce status transitions and atomic history/comment creation in PostgreSQL RPCs, with explicit identity/role/resource checks in addition to RLS. Prevent stale and concurrent mutations with row locking and versions. Never trust user-editable Auth metadata for role authorization.

Keep secrets in the root `.env`. Only the Supabase URL and publishable key belong in `VITE_` variables. Administrative tokens/passwords must never enter browser bundles or committed files.

Use versioned migrations and sync tested migrations with the cloud database. The original cloud schema is already present; preserve migration history and inspect it before applying baseline SQL. Do not reset the cloud database. Local Supabase may be used/reset for tests.

## Users, testing and delivery

Create cloud users manually in Supabase Dashboard, 2–3 users of each role (default: three). Assign profiles/roles with reviewed administrative SQL. No registration or user-management UI is needed. Local test users may be provisioned automatically.

Deliver the production frontend in `dist`; the user handles hosting. Document SPA fallback requirements. Do not deploy the frontend to an external host.

## Documentation

Maintain Russian user documentation in USER_GUIDE.md. Maintain English technical documentation covering development, user provisioning, migrations, tests and deployment in README.md.
