<?php
/**
 * Plugin Name: RIVTON Core
 * Description: Versioned real estate content, administration and public REST API.
 * Version: 0.3.1
 * Requires at least: 6.8
 * Requires PHP: 8.1
 * License: GPL-2.0-or-later
 * Text Domain: estate-core
 */
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
define("ESTATE_CORE_VERSION", "0.3.1");
define("ESTATE_CORE_DIR", __DIR__);
foreach (
    ["Schema", "Store", "Lifecycle", "Workspace", "Domain", "Import", "Rest", "Studio", "Admin"]
    as $module
) {
    require_once __DIR__ . "/includes/" . $module . ".php";
}
register_activation_hook(__FILE__, [Lifecycle::class, "activate"]);
register_deactivation_hook(__FILE__, function () {
    /* Content intentionally retained. */
});
add_action("plugins_loaded", function () {
    Lifecycle::migrate();
    $rest = new Rest();
    new Studio($rest);
    if (is_admin()) {
        new Admin();
    }
});
