# Postman Files

Files:

- `dpg.postman_collection.json`
- `dpg.local.postman_environment.json`

## What This Collection Does

- runs the unified OTP auth flow
- stores the returned session token in `auth_token`
- stores the raw `set-cookie` header in `session_cookie`
- stores user fields in variables:
  - `user_id`
  - `user_email`
  - `user_phone`
  - `user_display_name`
- includes item, action, event, ownership fetch, and network schema requests

Postman should also keep the Better Auth session cookie in its cookie jar automatically for the same host.

## Recommended Order

1. `Auth / Check User`
2. `Auth / Request OTP`
3. `Auth / Verify OTP`
4. `Auth / Get Session`
5. `Network Schemas / Fetch Concrete Item Schema`
6. `Items / Create Item`
7. `Items / Fetch My Local Items`
8. `Actions / Fetch My Actions`
9. `Actions / Perform Action`
10. `Actions / Perform Network Action` for internal target-instance testing only
11. `Events / Fetch My Events`
12. `Events / Store Event`

## About Schema Import

Partially possible.

What works well:

- you can call `GET /api/v1/network/schema/:network/:domain/:itemType`
- you can call `GET /api/v1/network/schemas`
- those responses help the user inspect the schema before filling payloads

What Postman does not do well by default:

- it does not automatically turn your runtime JSON Schema into a live request form for `item_state`, `requirements_snapshot`, or `event_payload`

So in the current collection:

- schema fetch requests are included
- request bodies are prefilled with example payloads
- variables are used where possible

## Action Payload Notes

- `Actions / Perform Action` is the public source-instance API
- `Actions / Fetch My Actions` filters directly on stored `source_item_owner` and `target_item_owner`
- it sends the selected target item's `item_instance_url`
- it does not send `source_instance_url`; the service derives that from its own runtime config
- `Actions / Perform Network Action` is the internal target-instance API for direct server-to-server testing
- `Events / Fetch My Events` filters directly on stored `source_item_owner` and `target_item_owner`
- `Events / Store Event` now uses the latest event contract with owner ids, `origin_instance_domain`, `action_status`, `update_count`, and item instance URLs

If you want, a next step is to generate a second collection variant that embeds more concrete payload examples for `yellow_dot` and `blue_dot`.
