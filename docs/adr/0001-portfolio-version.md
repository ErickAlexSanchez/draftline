# Portfolio version

This repository records the architecture decision behind Draftline: the model call does not happen inside the HTTP request. Context and consequences are in [0002](0002-decision.md).

## Context

Draftline is a portfolio version of a production system. The company's confidentiality policy does not allow the real product to be shown, so the original work cannot be published. This repository is a different version, created only for the portfolio. It follows the same architecture decisions, with a different scope, brand, and data. It is not the client's codebase.

## Decision

Publish this repository as that portfolio version. Keep the employer and the client unnamed. Use the fictional Draftline brand, synthetic workspace data, and the module boundaries described in the technical decision.

## Consequences

- Readers can inspect the job queue, the credit guard, and the ports without seeing production data.
- The scope is smaller than the original system: one tenant, a fake model adapter, and local disk storage.
- A staff engineer can still see where the decision lives, where the module boundary is, and which test protects it.
