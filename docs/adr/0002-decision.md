# Model calls leave the request

The portfolio context for this decision is in [0001](0001-portfolio-version.md).

## Context

A draft request can spend model time and model budget. Doing that work inside the HTTP handler couples the response time to the provider, makes cancellation clumsy, and lets a request with no credits still reach the model. The product also shows a list of work and the text of saved briefs, which can be cached, while a job that is still generating cannot.

## Decision

`POST /jobs` inserts a row with status `queued` and returns the job id. It does not receive a `ModelGateway`. A separate worker claims the row, moves it to `running`, and then to `succeeded` or `failed`.

Before the worker calls the model, `planGeneration` checks the tenant credit balance. A balance below the cost marks the job `failed` with `insufficient_credits`. That path does not call the model and does not write a file. When the balance covers the cost, the worker calls `ModelGateway`, writes the text through `ObjectStorage`, and debits the credits in the same database transaction that marks the job `succeeded`.

Postgres stores tenants, users, sessions, drafts, and jobs. A user's role is a column. A job stores the prompt, the status, and the object key. The queue is the `jobs` table, claimed with `FOR UPDATE SKIP LOCKED`. React follows a job with TanStack Query: lists and saved drafts use a 60 second `staleTime`, and the job detail uses `staleTime: 0` and refetches until the status is terminal. The HTTP cache matches that split: `private, max-age=60` for lists and drafts, `no-store` for job detail.

This portfolio version has one tenant. `FakeModelGateway` and `DiskObjectStorage` implement the ports. The composition root in `packages/composition` is the only place that chooses those adapters.

## Consequences

- The enqueue response stays a database write. Generation can be slow, retried, or refused without holding the request open.
- A viewer cannot enqueue or save a draft. The role check is in the domain, and the HTTP edge maps it to 403.
- A balance below the cost fails closed. The integration test sets that balance to zero and fails if the model is called or a file remains.
- Lists and drafts can sit in a private cache. Generation status cannot.
- Out of this version: several models, token streaming, real billing, and vector search.
