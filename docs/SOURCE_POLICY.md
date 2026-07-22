# Source registry and collection policy

Cyber Chronicle never fetches arbitrary URLs supplied by a reader, article, or AI model. The collector receives only records from the approved source registry.

## Admission workflow

1. Confirm the publisher controls the source and that the feed URL is current.
2. Record the source type, authority tier, attribution, permitted use, polling interval, response limit, robots mode, terms URL, and explicit redirect aliases.
3. Create the registry record in a disabled state.
4. Run the validation endpoint. It requires HTTPS and verifies that the primary host and every redirect alias resolve only to globally routable addresses.
5. Enable the source only after a human reviews the validation result and policy metadata.
6. Revalidate on every actual connection and every redirect; prior validation is not trusted as a permanent network decision.

Unknown licensing defaults to `metadata_only`. Public accessibility is not treated as permission to republish full source text.

## Initial candidate

The initial disabled candidate is Google Project Zero's official Atom feed. It was selected as a narrow specialist research source for validating the feed pipeline, not as sufficient corroboration for independent publication.

No candidate is enabled automatically by seeding the registry.

## Collector rules

- HTTPS only for production registry entries.
- Exact host comparison; suffix and substring matches are forbidden.
- URL credentials, unsafe schemes, unregistered ports, HTTPS downgrades, redirect loops, non-public IP space, environment proxies, cookies, compressed responses, oversized bodies, and unexpected media types are rejected.
- Each redirect is resolved and validated again.
- Raw bytes are hashed and stored before parsing.
- DTDs, entities, malformed XML, and excessive entry counts quarantine the source artifact from normalization.
- Error records contain bounded error codes and types, never attacker-controlled response bodies.
- A repeated retrieval remains visible as another fetch record even when its immutable artifact is reused.

## Production activation blockers

The laptop gate is not permission for unattended production collection. Production activation additionally requires:

- PostgreSQL migration and constraint tests against a real server;
- parser subprocess/container isolation with CPU, memory, wall-time, file, and network limits;
- operating-system or container egress rules denying private and metadata networks;
- robots and terms snapshot monitoring;
- rate-limit and retry policy tests against controlled network fixtures;
- backup/restore and append-only audit verification.
