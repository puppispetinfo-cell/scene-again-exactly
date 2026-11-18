<?php
// Demonstration fixture only. This is not an installer or an operator import command.
if (!defined("ESTATE_CORE_TESTING") || !getenv("ESTATE_WP_ROOT")) {
    throw new Exception("Isolated QA only");
}
require getenv("ESTATE_WP_ROOT") . "/wp-load.php";
if (
    wp_get_environment_type() !== "local" ||
    DB_HOST !== "127.0.0.1:3309" ||
    !preg_match('/^(rivton_qa|estate_qa_[0-9]+)$/', DB_NAME)
) {
    throw new Exception("Not an authorized local fixture");
}
wp_set_current_user(1);
global $wpdb;
foreach (
    ["estate_records", "estate_audit", "estate_revisions", "estate_drafts", "estate_draft_versions"]
    as $suffix
) {
    $wpdb->query("DELETE FROM " . $wpdb->prefix . $suffix);
}
delete_option("estate_schema_version");
delete_option("estate_import_baselines");
EstateCore\Lifecycle::migrate();
$preview = EstateCore\Import::preview();
if (is_wp_error($preview)) {
    throw new Exception($preview->get_error_message());
}
$result = EstateCore\Import::apply($preview->get_data()["token"], true);
if (is_wp_error($result)) {
    throw new Exception($result->get_error_message());
}
$config = EstateCore\Store::document(EstateCore\Store::get("configuration"));
$report = [
    "success" => true,
    "version" => ESTATE_CORE_VERSION,
    "environment" => "isolated local WordPress / MariaDB",
    "company" => $config["site"]["name"],
    "email" => $config["site"]["email"],
    "whatsapp" => $config["site"]["whatsapp"],
    "address" => $config["site"]["address"],
    "hours" => $config["company"]["hours"],
    "team" => array_map(
        fn($row) => EstateCore\Store::document($row)["name"],
        EstateCore\Store::list("team", false, 0, 100),
    ),
    "properties" => count(EstateCore\Store::list("property", false, 0, 100)),
    "pages" => count(EstateCore\Store::list("page", false, 0, 100)),
    "homeStatus" => EstateCore\Store::get("page-home")["status"],
    "sceneCount" => count(
        EstateCore\Store::document(EstateCore\Store::get("page-home"))["sections"][0]["scenes"],
    ),
    "leadStorageApproved" => $config["forms"]["leadStorageApproved"],
    "privacyReviewed" => $config["forms"]["privacyReviewed"],
    "source" => "bundled user intake; no test properties",
];
if (
    count($report["team"]) !== 4 ||
    $report["properties"] !== 0 ||
    $report["sceneCount"] !== 3 ||
    $report["email"] !== "rivtongroup@gmail.com"
) {
    throw new Exception("Profile demonstration failed");
}
file_put_contents(
    getenv("ESTATE_RESULTS") . "/wp-profile-demo.json",
    wp_json_encode($report, JSON_PRETTY_PRINT),
);
echo "Real RIVTON profile applied in local demo; no property fixtures.";
