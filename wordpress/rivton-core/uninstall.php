<?php
// Retain catalog, leads, roles and audit by default. Uninstall is deliberately non-destructive.
if (!defined("WP_UNINSTALL_PLUGIN")) {
    exit();
}
// Explicit removal requires an administrator-reviewed export/retention procedure, not a public URL.
