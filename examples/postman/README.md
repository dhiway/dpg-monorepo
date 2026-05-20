# Postman Files

`examples/postman` contains only the schema-agnostic collection:

- `dpg.postman_collection.json`
- `dpg.local.postman_environment.json`

Use it when one API instance serves one configured `network/domain` and you want a neutral request template. The request bodies intentionally contain placeholder JSON for `item_state` and `requirements_snapshot`; fill those fields from the schema returned by `Network Schemas / Fetch Item Schema`.

## Schema-Specific Collections

Concrete example schemas keep their own collections next to the schema they exercise:

- `examples/schemas/yellow_dot/postman/yellow_dot.postman_collection.json`
- `examples/schemas/yellow_dot/postman/yellow_dot.local.postman_environment.json`
- `examples/schemas/blue_dot/postman/blue_dot.postman_collection.json`
- `examples/schemas/blue_dot/postman/blue_dot.local.postman_environment.json`
- `examples/schemas/inter-network-action/postman/inter_network_action.postman_collection.json`
- `examples/schemas/inter-network-action/postman/inter_network_action.local.postman_environment.json`

Use those collections when you want prefilled schema-valid payloads for the example network.

## Generic Collection Flow

1. Import `dpg.postman_collection.json`.
2. Import `dpg.local.postman_environment.json`.
3. Select `DPG Single Domain Local` in Postman.
4. Set `base_url`, `network`, `domain`, and `item_type`.
5. Run `Auth / Check User`, `Request OTP`, `Verify OTP`, and `Get Session`.
6. Run `Network Schemas / Fetch Item Schema`.
7. Replace placeholder request bodies in `Items` and `Actions And Events` with schema-valid data.

The `Instance-to-Instance Diagnostics` folder is for direct testing of APIs normally called by DPG instances. Normal client flows should use `Items`, `Actions And Events`, and `Network Schemas`.

## Choosing A Collection

- Use `examples/postman` for a generic single-domain API instance.
- Use `examples/schemas/yellow_dot/postman` for the current Yellow Dot schema.
- Use `examples/schemas/blue_dot/postman` for the current Blue Dot schema.
- Use `examples/schemas/inter-network-action/postman` for Yellow Dot to Blue Dot cross-network action calls.
