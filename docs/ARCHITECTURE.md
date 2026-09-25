# Constant architecture

## What Constant is

Constant is a company operating system, not merely a dashboard.

The front end is the cockpit. Underneath it, the system should gradually connect company identity, filing obligations, finance, product operations and scheduled agents into one legible state machine.

The important property is **auditability**: a human should be able to answer what happened, when, why, which source justified it and whether it can be reversed.

## Design rules

### 1. GitHub is code and public operational state, not a filing cabinet

This repository is public. It may contain:

- application code
- automation definitions
- non-sensitive status
- public company metadata
- schemas
- audit summaries
- references to private records

It must not contain:

- credentials or API keys
- bank records
- tax evidence
- private invoices or receipts
- home addresses or personal identifiers
- private correspondence
- access tokens
- raw connected-account payloads

Private records will need a separate authenticated store.

### 2. Sources outrank assumptions

Company numbers, filing dates, tax deadlines, application statuses and financial facts should be populated from an authoritative source or explicitly confirmed by a human.

The correct fallback state is `unknown`, not a plausible guess.

### 3. Automations should be idempotent

A scheduled run should be safe to repeat.

Each worker should:

1. read current state
2. read the authoritative source
3. calculate the smallest necessary change
4. make the change once
5. verify the result
6. write an audit record
7. surface uncertainty rather than manufacturing certainty

### 4. Humans own consequential decisions

Automation can collect, reconcile, prepare, remind and execute pre-authorised routine actions. Material filings, payments, account creation, identity assertions and irreversible steps should retain an explicit approval boundary unless separately authorised.

### 5. The audit log is part of the product

A successful worker run is not complete until its result is legible later.

Audit records should eventually contain:

- worker
- run timestamp
- sources checked
- previous state
- resulting state
- mutations performed
- verification result
- exceptions or uncertainty

## Layers

### Surface

The browser UI under `public/`.

Its job is to make the company understandable in seconds.

### Engine

`server.mjs` is intentionally tiny in v0.1. It establishes the web/API boundary without adding a dependency pile before the operational model is known.

The engine will later host authenticated adapters and orchestration.

### State

`data/` currently contains public, non-sensitive bootstrap state.

This should eventually split into:

- public state safe for Git
- private application state
- append-only audit events
- external authoritative sources

### Workers

Scheduled ChatGPT runs and, where useful, GitHub Actions or server jobs.

The first worker is not a business automation. It is a **capability probe**. We should map the machinery before depending on it.

## Near-term modules

1. Company identity
2. Obligations and filing calendar
3. D-U-N-S / Play Console setup
4. Product register, beginning with Proximity
5. Finance ingestion and reconciliation
6. Tax and accounts readiness
7. Scheduled assurance checks
8. Document/evidence index
9. Decision log
10. Integration health

## A note on scope

Constant should not become an opaque robot director.

The useful version is closer to an aircraft instrument panel: it reduces memory load, exposes drift early, performs boring checks relentlessly and keeps the pilot in possession of the aircraft.
