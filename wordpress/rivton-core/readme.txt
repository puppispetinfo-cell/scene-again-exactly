=== RIVTON Core ===
Requires at least: 6.8
Requires PHP: 8.1
Stable tag: 0.3.1
License: GPLv2 or later

Headless real estate administration for independent WordPress installations.

== Installation ==
Upload the ZIP in Plugins > Add New > Upload Plugin, activate, then open RIVTON Core.
The bundled RIVTON intake is reviewed in Importación inicial before applying.
It prepares real business data, editable initial taxonomies and proposed institutional/legal drafts.
No properties are invented or imported. Existing approved visual assets are retained and marked illustrative.
No email, analytics, advertising or Calendly webhook is enabled automatically.
The existing React frontend remains disconnected until Phase 3.

== Storage and removal ==
Data is stored in site-prefixed estate_records, estate_audit, estate_revisions, estate_drafts and estate_draft_versions tables and estate_* options.
Deactivation and uninstall retain data and role capabilities to avoid accidental loss.
Take an encrypted verified backup before updates. Removal of retained data requires an explicit operator procedure.
Network activation is unsupported; use an independent WordPress install per agency.

== Security ==
Private writes require capabilities, resource ownership, a WordPress REST nonce and If-Match.
Public JSON never includes leads or audit records. Plain text only; arbitrary HTML/CSS/JS is not accepted.
Use HTTPS, privileged-user MFA, restrictive infrastructure and backups before production.

== Compatibility ==
Development verification and limitations: docs/rivton/phase-2 in the source repository.
