---
title: DOT Example Schemas
description: Walkthrough of the Yellow Dot education network config and its domain schemas.
head: []
---

# DOT Example Schemas

`packages/schemas/src/dot_examples/` contains a worked example of a DOT network — the "Yellow Dot" education network. These files are the canonical reference for what a complete network config looks like in practice.

## File Layout

| File | What it defines |
|------|----------------|
| `network.json` | Top-level network config — domains, instances, and actions |
| `domain.json` | Student profile schema |
| `learner_domain.json` | Learner (seeker) profile schema |
| `tutor_counsellor_domain.json` | Tutor/counsellor (provider) profile schema |
| `learner_tutor_action.json` | A connect action with a remote `$ref` requirement schema |
| `index.ts` | Re-exports `educationNetwork` from `network.json` |

## Network Config (`network.json`)

The top-level document wires everything together.

```json
{
  "name": "yellow_dot",
  "domains": [
    { "name": "student_profile", "default_item_schemas": { "profile": { "$ref": "./domain.json" } } },
    { "name": "learner_profile",  "default_item_schemas": { "profile": { "$ref": "./learner_domain.json" } } },
    { "name": "tutor_counsellor_profile", "default_item_schemas": { "profile": { "$ref": "./tutor_counsellor_domain.json" } } },
    { "name": "coaching_center",  "default_item_schemas": { "profile": { "..." } } }
  ],
  "instances": [ "..." ],
  "actions": {
    "connect": {
      "interactions": [ "..." ]
    }
  }
}
```

Each domain's `default_item_schemas.profile` is a `$ref` to its own file. The UI engine resolves these at runtime.

The `connect` action defines 12 bidirectional interaction pairs across the 4 domains.

## Student Profile Schema (`domain.json`)

Represents a student registering on the network.

| Property | Type | Private | Notes |
|----------|------|---------|-------|
| `student_id` | string | — | Unique identifier |
| `full_name` | string | — | Display name |
| `date_of_birth` | string (date) | yes | Not shown on public cards |
| `grade` | string | — | e.g. "Grade 10" |
| `email` | string (email) | yes | Not shown on public cards |
| `phone` | string | yes | Not shown on public cards |
| `address` | object | yes | Street, city, pincode |
| `guardian` | object | yes | Guardian name + contact |
| `academic_details` | object | — | Board, subjects, scores |

## Learner Profile Schema (`learner_domain.json`)

Represents a learner looking for tuition or counselling.

| Property | Type | Notes |
|----------|------|-------|
| `learner_id` | string | Unique identifier |
| `pincode` | string | Used for map geocoding |
| `grade_band` | string | e.g. "6-8", "9-10" |
| `capability_band` | string | e.g. "beginner", "advanced" |
| `academic_stream` | string | Science / Commerce / Arts |
| `service_type` | string | Tuition / counselling |
| `subject_or_domain` | string | Specific subject requested |

## Tutor / Counsellor Profile Schema (`tutor_counsellor_domain.json`)

Represents a provider offering tutoring or counselling services.

| Property | Type | Notes |
|----------|------|-------|
| `provider_id` | string | Unique identifier |
| `pincode` | string | Used for map geocoding |
| `coverage_radius_km` | number | Geographic coverage |
| `provider_type` | string | "tutor" or "counsellor" |
| `domain_specialisations` | array | List of subject areas |
| `credentials` | object | Qualifications and certifications |
| `target_grade_band` | string | Grade range served |

## Privacy Convention

Mark a property as private by adding `"private": true` at the property level:

```json
{
  "properties": {
    "phone": {
      "type": "string",
      "private": true
    }
  }
}
```

The UI engine's `filterSchemaByPrivacy` and `filterDataBySchema` functions use this flag to:

- hide private fields on public cards
- exclude private data from map markers
- show all fields in the profile edit form (`PrivacyMode = 'all'`)

## Action Schema (`learner_tutor_action.json`)

A connect action references a remote requirement schema:

```json
{
  "from_domain": "learner_profile",
  "to_domain": "tutor_counsellor_profile",
  "requirement_schema": {
    "$ref": "https://registry.example.com/learner-tutor-connect-v1.json"
  }
}
```

The UI engine resolves the `$ref` at runtime and feeds the resolved schema into `SchemaForm` inside the `ActionModal`.

## Using the Example in Code

```ts
import { educationNetwork } from '@dpg/schemas';

// educationNetwork is the parsed network.json object
// $ref fields are not pre-resolved here — use resolveNetworkRefs from the UI engine
```

For server-side use, `fetchSchema` from `@dpg/schemas` can load and resolve the network config from a URL (see [Schemas Package](/packages/schemas-and-registry)).
