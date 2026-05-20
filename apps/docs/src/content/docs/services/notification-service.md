---
title: Notification Service
description: Project-specific notification service integration for OTP delivery and future outbound communication flows.
head: []
---

The current DPG deployment uses a Dhiway-specific notification service for outbound notifications.

At present, the main documented usage is OTP delivery for login and verification flows, but the integration is structured so the same service boundary can support broader notification use cases later.

## Responsibility

The notification service is responsible for:

- SMS OTP delivery
- email OTP delivery
- provider-side request signing and transport concerns

DPG itself remains responsible for:

- deciding when a notification should be sent
- generating or verifying OTP state through auth flows
- exposing user-facing auth endpoints

## Monorepo Boundary

The integration boundary lives in `packages/notification`.

That package provides:

- a shared notification client
- signed header helpers
- shared request and response types

The API runtime creates the client from environment configuration and passes it into the auth package instead of letting route handlers call the provider directly.

Service source: [dhiway/notification-service on GitHub](https://github.com/dhiway/notification-service.git).

## Why It Is Treated As A Service

Although this project currently uses a Dhiway-specific provider, notification is not a DPG-specific primitive.

Any provider that can satisfy the same client contract can replace the current one without changing DPG's item, action, schema, or network behavior.

## Runtime Configuration

Current environment variables:

- `NOTIFICATION_SERVICE_ENDPOINT`
- `NOTIFICATION_SERVICE_KEY_ID`
- `NOTIFICATION_SERVICE_SECRET`
- `SMS_TEMPLATE_ID`

When these values are absent, local development can still use test OTP behavior through `CREATE_TEST_OTP=true`.

## Current Flow

1. The UI starts an OTP login flow.
2. The API calls the Better Auth integration.
3. The auth package decides whether an SMS or email OTP must be sent.
4. The notification client sends the outbound request to the configured service.
5. The user receives the OTP and completes verification.

## Replacement Guidance

If the project moves to another provider, preserve these boundaries:

- keep provider auth and signing logic inside the notification client layer
- keep auth routes provider-agnostic
- keep templates and provider identifiers in environment or service config
- avoid embedding vendor request formats directly in route handlers

For package-level details, also see [Notification Package](/packages/notification-package).
