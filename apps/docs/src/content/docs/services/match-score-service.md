---
title: Match Score Service
description: Project-specific match scoring service integration for AI-powered item comparison.
head: []
---

The current DPG deployment uses a Dhiway-specific match scoring service (DPG Scoring) for comparing two items and returning a match score with detailed reasoning.

## Responsibility

The match score service is responsible for:

- Accepting two item snapshots and computing a similarity/ relevance score
- Returning a score band (e.g., Excellent, Good, Moderate, Low)
- Providing confidence level and AI-generated reasoning
- Breaking down match factors into named signals with impact and summary

DPG itself remains responsible for:

- deciding when a match score should be calculated
- normalizing item snapshots into the provider payload
- caching results and presenting them in the UI
- exposing user-facing endpoints (`/api/v1/match-score/calculate`)

## Monorepo Boundary

The integration boundary lives in `packages/match_score`.

That package provides:

- a shared match score client factory (`createMatchScoreClient`)
- provider-specific HMAC-signed transport (`DpgScoringClient`)
- shared request and response types (`MatchScoreRequest`, `MatchScoreResult`)

The API runtime creates the client from environment configuration and uses it in the match score route instead of letting route handlers call the provider directly.

Source: [packages/match_score on GitHub](https://github.com/dhiway/dpg-monorepo/tree/main/packages/match_score).

## Why It Is Treated As A Service

Although this project currently uses a Dhiway-specific provider, match scoring is not a DPG-specific primitive.

Any provider that can satisfy the same client contract (accept two items, return score/band/reasoning/signals) can replace the current one without changing DPG's item, action, schema, or network behavior.

## Runtime Configuration

Current environment variables:

- `MATCH_SCORE_PROVIDER`
- `DPG_SCORING_ENDPOINT`
- `DPG_SCORING_KEY_ID`
- `DPG_SCORING_SECRET`
- `DPG_SCORING_PATH`
- `DPG_SCORING_VERSION`
- `DPG_SCORING_PROMPT_VERSION`

When these values are absent, the API returns `503 MATCH_SCORE_NOT_CONFIGURED` and the UI gracefully disables match score features.

## Current Flow

1. The user browses network items in the UI.
2. The UI checks whether the user has a local profile item to compare against.
3. The user clicks **Calculate Match** on a network item card.
4. The UI sends both item snapshots to `/api/v1/match-score/calculate`.
5. The API validates the request, calls the configured match score provider, and returns the result.
6. The UI caches the result in `localStorage` for 24 hours and displays a score badge.
7. The user clicks the badge to open a modal with detailed reasoning, signals, and an animated progress bar.

## Response Structure

A successful match score response contains:

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Provider identifier |
| `score` | number (optional) | Numeric score (0–1 or 0–10 depending on provider) |
| `band` | string (optional) | Human-readable band label |
| `confidence` | number (optional) | Confidence level (0–1) |
| `reasoning` | string (optional) | AI-generated explanation |
| `signals` | array (optional) | Named match factors with `name`, `impact`, and `summary` |
| `version` | string (optional) | Model version |
| `prompt_version` | string (optional) | Prompt version |
| `model_provider` | string (optional) | Underlying model provider |
| `model` | string (optional) | Model name |

## Replacement Guidance

If the project moves to another provider, preserve these boundaries:

- keep provider auth and signing logic inside the match score client layer
- keep match score routes provider-agnostic
- keep version, prompt, and provider identifiers in environment or service config
- avoid embedding vendor request formats directly in route handlers
- ensure the new provider returns at least `score`, `band`, and `reasoning` for full UI compatibility

For package-level details, also see [Match Score Package](/packages/match-score-package).
