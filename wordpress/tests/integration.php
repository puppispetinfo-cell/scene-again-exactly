<?php
require_once "/wordpress/wp-load.php";
if (!defined("ESTATE_CORE_TESTING") || !ESTATE_CORE_TESTING) {
    file_put_contents(
        "/estate-results/wp-probe.json",
        wp_json_encode(["guard" => false, "php" => PHP_VERSION]),
    );
    throw new Exception("Run only in an isolated Playground fixture.");
}
global $wpdb;
$wpdb->query("DELETE FROM " . EstateCore\Store::table());
$wpdb->query("DELETE FROM " . $wpdb->prefix . "estate_audit");
$wpdb->query(
    $wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", "estate_rate_%"),
);
delete_option("estate_schema_version");
EstateCore\Lifecycle::migrate();
$report = [
    "environment" => [
        "wordpress" => get_bloginfo("version"),
        "php" => PHP_VERSION,
        "database" => "WordPress Playground SQLite",
    ],
    "passed" => [],
];
register_shutdown_function(function () {
    global $report;
    $report["lastError"] = error_get_last();
    file_put_contents(
        "/estate-results/wp-integration.json",
        wp_json_encode($report, JSON_PRETTY_PRINT),
    );
});
function check($condition, $name)
{
    global $report;
    if (!$condition) {
        throw new Exception("FAILED: " . $name);
    }
    $report["passed"][] = $name;
}
function api($method, $path, $data = null, $etag = null, $origin = null)
{
    $parts = explode("?", $path, 2);
    $r = new WP_REST_Request($method, "/rivton-core/v1/" . $parts[0]);
    if (isset($parts[1])) {
        parse_str($parts[1], $query);
        $r->set_query_params($query);
    }
    if ($data !== null) {
        $r->set_header("content-type", "application/json");
        $r->set_body(wp_json_encode($data));
    }
    if (str_starts_with($path, "admin/") && get_current_user_id()) {
        $r->set_header("x-wp-nonce", wp_create_nonce("wp_rest"));
    }
    if ($etag) {
        $r->set_header("if-match", $etag);
    }
    if ($origin) {
        $r->set_header("origin", $origin);
    }
    $result = rest_do_request($r);
    if ($result->get_status() >= 400) {
        global $report;
        $report["lastRestError"] = [
            "status" => $result->get_status(),
            "data" => $result->get_data(),
        ];
    }
    return $result;
}
function tag($r)
{
    return $r->get_headers()["ETag"] ?? null;
}
check(class_exists("EstateCore\\Rest"), "plugin loaded");
check((int) get_option("estate_schema_version") === 1, "migration ran");
check(EstateCore\Store::get("configuration") !== null, "configuration persisted");
$before = count(EstateCore\Store::list("category", true, 0, 100));
EstateCore\Lifecycle::migrate();
check(count(EstateCore\Store::list("category", true, 0, 100)) === $before, "migration idempotent");
wp_set_current_user(1);
do_action("rest_api_init");
check(api("GET", "configuration")->get_status() === 200, "public configuration");
$configResponse = api("GET", "admin/configuration");
check($configResponse->get_status() === 200, "admin reads configuration");
$config = $configResponse->get_data()["document"];
check(
    api("PUT", "admin/configuration", $config)->get_status() === 428,
    "configuration requires If-Match",
);
check(
    api("PUT", "admin/configuration", $config, '"wrong"')->get_status() === 412,
    "stale configuration rejected",
);
$config["team"]["image"] = [
    "id" => "test-media",
    "schemaVersion" => 1,
    "revision" => 0,
    "extensions" => [],
    "src" => "https://example.test/test.jpg",
    "alt" => "Test fixture only",
    "width" => 640,
    "height" => 480,
    "kind" => "image",
    "illustrative" => true,
];
$r = api("PUT", "admin/configuration", $config, tag($configResponse));
check($r->get_status() === 200, "configuration validated and saved");
$defaults = json_decode(file_get_contents(ESTATE_CORE_DIR . "/schemas/defaults.json"), true);
$property = $defaults["property"];
$property["title"] = "Integration fixture";
$property["slug"] = "integration-fixture";
$property["images"] = [$config["team"]["image"]];
$r = api("POST", "admin/properties", $property);
check($r->get_status() === 201, "create draft property");
$doc = $r->get_data()["document"];
$id = $doc["id"];
$etag = tag($r);
check(api("GET", "properties/" . $id)->get_status() === 404, "draft excluded from public API");
check(
    count(api("GET", "snapshot")->get_data()["properties"]) === 0,
    "draft excluded from snapshot",
);
$bad = $property;
$bad["slug"] = "unsafe-url";
$bad["images"][0]["src"] = "javascript:alert(1)";
check(api("POST", "admin/properties", $bad)->get_status() === 422, "XSS URL rejected");
$bad = $property;
$bad["slug"] = "unsafe-field";
$bad["adminToken"] = "secret";
check(api("POST", "admin/properties", $bad)->get_status() === 422, "unknown fields rejected");
$bad = $property;
$bad["slug"] = "x' OR 1=1 --";
check(api("POST", "admin/properties", $bad)->get_status() === 422, "SQL injection slug rejected");
check(
    api("GET", "properties/x' OR 1=1")->get_status() === 404,
    "SQL injection resource path rejected",
);
$agentA = wp_insert_user([
    "user_login" => "estate-test-a-" . substr(wp_generate_uuid4(), 0, 8),
    "user_pass" => wp_generate_password(30),
    "role" => "estate_agent",
]);
$agentB = wp_insert_user([
    "user_login" => "estate-test-b-" . substr(wp_generate_uuid4(), 0, 8),
    "user_pass" => wp_generate_password(30),
    "role" => "estate_agent",
]);
wp_set_current_user($agentA);
check(api("GET", "admin/properties/" . $id)->get_status() === 404, "IDOR other owner read denied");
check(
    api("PATCH", "admin/properties/" . $id, $doc, $etag)->get_status() === 404,
    "IDOR other owner update denied",
);
check(api("GET", "admin/configuration")->get_status() === 403, "agent cannot read admin settings");
$own = $property;
$own["slug"] = "own-agent-fixture";
$r = api("POST", "admin/properties", $own);
check($r->get_status() === 201, "agent creates own draft");
$ownId = $r->get_data()["document"]["id"];
$ownTag = tag($r);
check(
    api("POST", "admin/properties/" . $ownId . "/publish", [], $ownTag)->get_status() === 403,
    "agent cannot escalate to publisher",
);
wp_set_current_user($agentB);
check(api("GET", "admin/properties/" . $ownId)->get_status() === 404, "second agent isolated");
wp_set_current_user(1);
$r = api("POST", "admin/properties/" . $id . "/publish", [], $etag);
check($r->get_status() === 200, "publisher publishes property");
$etag = tag($r);
check(api("GET", "properties/" . $id)->get_status() === 200, "published property public");
$report["publishedProperty"] = api("GET", "properties/" . $id)->get_data();
$report["publishedSnapshot"] = api("GET", "snapshot")->get_data();
check(
    count(api("GET", "snapshot")->get_data()["properties"]) === 1,
    "snapshot includes published only",
);
check(
    api("PATCH", "admin/properties/" . $id, $doc, '"stale"')->get_status() === 412,
    "stale property write rejected",
);
$doc = api("GET", "admin/properties/" . $id)->get_data()["document"];
$doc["description"] = "<script>alert(1)</script><b>Plain text</b>";
$r = api("PATCH", "admin/properties/" . $id, $doc, $etag);
check(
    $r->get_status() === 200 && strpos($r->get_data()["document"]["description"], "<") === false,
    "stored text sanitized against XSS",
);
$etag = tag($r);
$r = api("POST", "admin/properties/" . $id . "/duplicate", [], $etag);
check(
    $r->get_status() === 201 &&
        $r->get_data()["document"]["id"] !== $id &&
        $r->get_data()["recordStatus"] === "draft",
    "duplicate gets new ID and draft",
);
$r = api("POST", "admin/properties/" . $id . "/archive", [], $etag);
check($r->get_status() === 200, "archive property");
check(api("GET", "properties/" . $id)->get_status() === 410, "archived property returns 410");
check(
    count(api("GET", "snapshot")->get_data()["properties"]) === 0,
    "archived excluded from snapshot",
);
check(api("GET", "properties?limit=101")->get_status() !== 500, "public listing does not crash");
$r = api("GET", "properties");
check($r->get_status() === 200, "paginated listing available");
$upload = (new EstateCore\Admin())->upload(["name" => "payload.svg", "size" => 100]);
check(isset($upload["error"]), "active SVG upload rejected");
wp_set_current_user(0);
check(api("GET", "admin/properties")->get_status() === 401, "anonymous properties admin denied");
check(api("GET", "admin/leads")->get_status() === 401, "anonymous leads denied");
check(
    api("GET", "admin/audit")->get_status() === 401 ||
        api("GET", "admin/audit")->get_status() === 403,
    "anonymous audit denied",
);
check(
    api("POST", "webhooks/calendly", [])->get_status() === 503,
    "unconfigured webhook fails closed",
);
check(
    api("POST", "submissions", [])->get_status() === 403,
    "submission without allowed origin rejected",
);
wp_set_current_user(1);
$audit = api("GET", "admin/audit");
check(
    $audit->get_status() === 200 && count($audit->get_data()["items"]) > 0,
    "administrative actions audited",
);

require "/estate-tests/unit.php";
wp_set_current_user(1);
$page = $defaults["page"];
$page["title"] = "Integration consent fixture";
$page["slug"] = "integration-consent";
$section = $defaults["section"];
$section["id"] = "test-section";
$section["content"] = ["body" => "TEST FIXTURE ONLY"];
$page["sections"] = [$section];
$r = api("POST", "admin/pages", $page);
check($r->get_status() === 201, "create structured page");
$pageId = $r->get_data()["document"]["id"];
check(api("GET", "pages?slug=integration-consent")->get_status() === 404, "draft page is private");
$r = api("POST", "admin/pages/" . $pageId . "/publish", [], tag($r));
check($r->get_status() === 200, "publish structured page");
$policyRevision = $pageId . ":" . $r->get_data()["document"]["revision"];
check(
    api("GET", "pages?slug=integration-consent")->get_status() === 200,
    "published page available by slug",
);
$c = api("GET", "admin/configuration");
$data = $c->get_data()["document"];
$data["site"]["legalPageIds"] = [$pageId];
$saved = api("PUT", "admin/configuration", $data, tag($c));
check($saved->get_status() === 200, "administrator approves privacy reference");
$origin = untrailingslashit(home_url());
$_SERVER["REMOTE_ADDR"] = "192.0.2.17";
$lead = [
    "idempotencyKey" => wp_generate_uuid4(),
    "formId" => "contact",
    "name" => "Integration fixture",
    "email" => "fixture@example.test",
    "message" => "Automated test, not a real inquiry",
    "consent" => ["privacyRevision" => $policyRevision, "accepted" => true],
    "honeypot" => "",
];
$bad = $lead;
$bad["honeypot"] = "bot";
check(api("POST", "submissions", $bad, null, $origin)->get_status() === 422, "honeypot rejected");
$bad = $lead;
$bad["recipient"] = "attacker@example.test";
check(
    api("POST", "submissions", $bad, null, $origin)->get_status() === 422,
    "recipient injection rejected",
);
$bad = $lead;
$bad["consent"]["accepted"] = false;
check(
    api("POST", "submissions", $bad, null, $origin)->get_status() === 422,
    "missing consent rejected",
);
check(
    api("POST", "submissions", $lead, null, "https://evil.test")->get_status() === 403,
    "unapproved submission origin rejected",
);
$rev = EstateCore\Store::revision();
$sent = api("POST", "submissions", $lead, null, $origin);
check($sent->get_status() === 202, "lead persisted");
$leadId = $sent->get_data()["submissionId"];
check(
    $sent->get_data()["notificationStatus"] === "not_configured",
    "no false email delivery claim",
);
check(
    EstateCore\Store::revision() === $rev,
    "private lead does not invalidate public catalog revision",
);
$retry = api("POST", "submissions", $lead, null, $origin);
check(
    $retry->get_status() === 202 && $retry->get_data()["submissionId"] === $leadId,
    "submission replay idempotent",
);
$changed = $lead;
$changed["message"] = "Different request";
check(
    api("POST", "submissions", $changed, null, $origin)->get_status() === 409,
    "idempotency payload conflict rejected",
);
for ($i = 0; $i < 5; $i++) {
    $next = $lead;
    $next["idempotencyKey"] = wp_generate_uuid4();
    $limited = api("POST", "submissions", $next, null, $origin);
}
check($limited->get_status() === 429, "submission rate limit enforced");
wp_set_current_user(0);
check(
    api("GET", "properties/" . $leadId)->get_status() === 404,
    "lead cannot be read through public property route",
);
check(
    api("GET", "admin/leads/" . $leadId)->get_status() === 401,
    "anonymous private lead read denied",
);
wp_set_current_user($agentA);
check(
    api("GET", "admin/leads/" . $leadId)->get_status() === 403,
    "property agent cannot read lead PII",
);
wp_set_current_user(1);
$private = api("GET", "admin/leads/" . $leadId);
check($private->get_status() === 200, "authorized lead read");
$r = api("PATCH", "admin/leads/" . $leadId, ["state" => "contacted"], tag($private));
check($r->get_status() === 200, "lead state updated with concurrency check");
$before = EstateCore\Store::get($id);
$a = EstateCore\Store::save("property", EstateCore\Store::document($before), "archived", $before);
$b = EstateCore\Store::save("property", EstateCore\Store::document($before), "archived", $before);
check(!is_wp_error($a) && is_wp_error($b), "atomic compare-and-swap rejects second stale writer");

$category = $defaults["category"];
$category["slug"] = "duplex";
$category["label"] = "Duplex fixture";
$category["kind"] = "type";
$category["legacyType"] = "casa";
$r = api("POST", "admin/categories", $category);
check($r->get_status() === 201, "create configurable custom property type");
$customType = $r->get_data()["document"]["id"];
$categoryTag = tag($r);
$custom = $property;
$custom["slug"] = "custom-type-fixture";
$custom["propertyTypeId"] = $customType;
$r = api("POST", "admin/properties", $custom);
check(
    $r->get_status() === 201 &&
        $r->get_data()["document"]["propertyTypeId"] === $customType &&
        $r->get_data()["document"]["type"] === "casa",
    "custom type persists stable ID and legacy family",
);
$customId = $r->get_data()["document"]["id"];
$r = api("POST", "admin/properties/" . $customId . "/publish", [], tag($r));
check($r->get_status() === 200, "publish custom property type");
check(
    count(api("GET", "properties?tipo=duplex")->get_data()["items"]) === 1,
    "search by configured type slug",
);
check(
    api("POST", "admin/categories/" . $customType . "/archive", [], $categoryTag)->get_status() ===
        409,
    "taxonomy in use cannot be archived",
);
$c = api("GET", "admin/configuration");
$config = $c->get_data()["document"];
foreach ($config["filters"] as &$filter) {
    if ($filter["key"] === "tipo") {
        $filter["options"][] = ["value" => "duplex", "label" => "Duplex fixture"];
    }
}
unset($filter);
check(
    api("PUT", "admin/configuration", $config, tag($c))->get_status() === 200,
    "custom property type accepted in configured filters",
);
$nonceRequest = new WP_REST_Request("POST", "/rivton-core/v1/admin/properties");
$nonceRequest->set_header("content-type", "application/json");
$nonceRequest->set_body(wp_json_encode($property));
check(
    rest_do_request($nonceRequest)->get_status() === 403,
    "private mutation requires valid REST nonce",
);
$report["pluginHashes"] = [];
foreach (
    new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator(ESTATE_CORE_DIR, FilesystemIterator::SKIP_DOTS),
    )
    as $file
) {
    if ($file->isFile()) {
        $report["pluginHashes"][
            substr($file->getPathname(), strlen(ESTATE_CORE_DIR) + 1)
        ] = hash_file("sha256", $file->getPathname());
    }
}
$report["success"] = true;
$report["snapshot"] = api("GET", "snapshot")->get_data();
file_put_contents(
    "/estate-results/wp-integration.json",
    wp_json_encode($report, JSON_PRETTY_PRINT),
);
echo wp_json_encode([
    "passed" => count($report["passed"]),
    "environment" => $report["environment"],
]);
