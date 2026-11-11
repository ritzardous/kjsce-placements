# Security policy

## Reporting a vulnerability

Do not report exploitable vulnerabilities, credentials or personal data in public issues or pull requests.

If the repository's GitHub Security tab offers **Report a vulnerability**, use that private reporting channel. Its availability has not been verified. Otherwise use an already-established private maintainer channel to request a secure reporting route. No dedicated security email/contact is currently documented; maintainers must designate one. Do not guess an address or publish the exploit while seeking contact.

Provide the affected commit/deployment, a minimal reproduction with synthetic data, expected/observed behavior, impact and any safe mitigation. Remove tokens, private keys and student information. Avoid changing or downloading other people's data to demonstrate impact.

## Supported versions and response

The repository has no documented release support matrix or guaranteed response SLA. Reports should identify the exact revision and configuration; the current default-branch implementation is the starting point for triage, not a promise of maintained historical releases. Maintainers must confirm supported versions and response ownership before publishing commitments.

Coordinate a fix and disclosure timing privately where possible. Do not assume a bug bounty, embargo length or incident-response team exists. Credential exposure requires separate revocation/rotation through the credential owner; deleting a public file alone does not revoke access.

## Security documentation

Read [security architecture](docs/security.md), [authentication](docs/authentication.md), [database boundaries](docs/database.md) and [deployment](docs/deployment.md). Configured controls must be deployed and verified; documentation does not certify the live service. Pending policy decisions are tracked in [maintainer decisions](docs/maintainer-decisions.md).
