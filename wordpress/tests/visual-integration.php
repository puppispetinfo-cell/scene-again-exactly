<?php
if (!defined("ESTATE_CORE_TESTING") || !getenv("ESTATE_WP_ROOT")) {
    throw new Exception("Isolated native fixture only");
}
require_once getenv("ESTATE_WP_ROOT") . "/wp-load.php";
wp_set_current_user(1);
global $wpdb;
$results = [
    "environment" => [
        "wordpress" => get_bloginfo("version"),
        "php" => PHP_VERSION,
        "database" => $wpdb->get_var("SELECT VERSION()"),
    ],
    "passed" => [],
    "success" => false,
];
register_shutdown_function(function () use (&$results) {
    $results["lastError"] = error_get_last();
    file_put_contents(
        getenv("ESTATE_RESULTS") . "/wp-visual-integration.json",
        wp_json_encode($results, JSON_PRETTY_PRINT),
    );
});
function vc($ok, $message)
{
    global $results;
    if (!$ok) {
        throw new Exception("FAILED: " . $message);
    }
    $results["passed"][] = $message;
}
function vr($method, $path, $body = null, $etag = null, $draft = 0)
{
    $q = new WP_REST_Request($method, "/rivton-core/v1/" . $path);
    $q->set_header("x-wp-nonce", wp_create_nonce("wp_rest"));
    if (in_array($path, ["contact-intent", "submissions"], true)) {
        $q->set_header("origin", untrailingslashit(home_url()));
    }
    $q->set_header("content-type", "application/json");
    $q->set_header("x-draft-revision", (string) $draft);
    if ($etag) {
        $q->set_header("if-match", $etag);
    }
    if ($body !== null) {
        $q->set_body(wp_json_encode($body));
    }
    return rest_do_request($q);
}
function vt($r)
{
    return $r->get_headers()["ETag"] ?? null;
}
function vd($r)
{
    return $r->get_data()["document"] ?? [];
}
// Fresh fixture records only; never a customer environment.
$wpdb->query("DELETE FROM " . EstateCore\Store::table());
$wpdb->query("DELETE FROM " . $wpdb->prefix . "estate_revisions");
$wpdb->query("DELETE FROM " . $wpdb->prefix . "estate_drafts");
$wpdb->query("DELETE FROM " . $wpdb->prefix . "estate_draft_versions");
delete_option("estate_schema_version");
delete_option("estate_import_baselines");
EstateCore\Lifecycle::migrate();
vc((int) get_option("estate_schema_version") === 3, "clean install migration 3");
$p = vr("POST", "admin/import/preview", []);
vc($p->get_status() === 200, "bundled intake validates and preview maps real records");
$plan = $p->get_data();
vc(
    !is_file(ESTATE_CORE_DIR . "/profiles/rivton-intake.json") &&
        is_file(ESTATE_CORE_DIR . "/profiles/rivton-intake.php"),
    "intake is packaged behind PHP guard instead of publicly readable JSON",
);
vc(
    count(array_filter($plan["items"], fn($i) => $i["decision"] === "conflict")) === 0,
    "clean initial profile maps known defaults without spurious conflicts",
);
vc(
    count($plan["items"]) >= 40,
    "preview includes institutional pages team types and editable amenities",
);
$apply = vr("POST", "admin/import/apply", ["token" => $plan["token"], "approved" => true]);
vc($apply->get_status() === 200, "approved intake persists real records and native media");
$reportId = $apply->get_data()["reportId"];
$c = vr("GET", "admin/configuration");
$config = vd($c);
vc(
    $config["site"]["email"] === "rivtongroup@gmail.com" &&
        $config["site"]["whatsapp"] === "5493513437509",
    "confirmed contact preloaded",
);
vc(
    empty($config["forms"]["leadStorageApproved"]) && empty($config["forms"]["privacyReviewed"]),
    "lead storage and consent approvals disabled by default",
);
vc(
    count(EstateCore\Store::list("team", false, 0, 100)) === 4,
    "four team members without invented roles or photos",
);
vc(
    count(EstateCore\Store::list("property", true, 0, 100)) === 0,
    "profile never creates invented properties",
);
$page = EstateCore\Store::get("page-home");
$home = EstateCore\Store::document($page);
vc(
    $page["status"] === "draft" &&
        $home["sections"][0]["scenes"][0]["title"] === "Encontrá\ntu propiedad.",
    "approved home text preserved in coordinated draft scenes",
);
vc(
    str_starts_with($home["sections"][0]["scenes"][0]["media"]["id"], "wp-media-"),
    "approved existing scene image registered in WP media",
);
$again = vr("POST", "admin/import/preview", [])->get_data();
$unchanged = array_filter($again["items"], fn($i) => $i["decision"] === "unchanged");
vc(count($unchanged) >= 35, "second import detects unchanged entities instead of duplicating");
$beforeCount = (int) $wpdb->get_var("SELECT COUNT(*) FROM " . EstateCore\Store::table());
$replay = vr("POST", "admin/import/apply", ["token" => $again["token"], "approved" => true]);
vc($replay->get_status() === 200, "reapplying unchanged import succeeds without duplicates");
vc(
    (int) $wpdb->get_var("SELECT COUNT(*) FROM " . EstateCore\Store::table()) === $beforeCount + 1,
    "idempotent replay adds only its audit report",
);
$badLead = vr("POST", "submissions", []);
vc($badLead->get_status() !== 202, "unapproved lead storage never accepts a submission");
$draftBackup = vr("GET", "admin/workspaces/pages/page-home/revisions")->get_data();
// Protected workspace and publish/restore.
$w = vr("GET", "admin/workspaces/pages/page-home");
vc($w->get_status() === 200, "workspace reads actual page document");
$doc = vd($w);
$doc["sections"][0]["content"]["title"] = "Workspace fixture";
$doc["sections"][0]["overrides"]["mobile"] = ["title" => "Mobile fixture", "height" => 480];
$save = vr("PUT", "admin/workspaces/pages/page-home", $doc, vt($w), 0);
vc($save->get_status() === 200, "workspace saves independent draft with responsive override");
vc(
    EstateCore\Store::document(EstateCore\Store::get("page-home"))["sections"][0]["content"][
        "title"
    ] !== "Workspace fixture",
    "saving draft leaves live record untouched",
);
vc(
    vr("PUT", "admin/workspaces/pages/page-home", $doc, vt($w), 0)->get_status() === 412,
    "concurrent draft write rejected",
);
$pub = vr("POST", "admin/workspaces/pages/page-home/publish", [], vt($save), 1);
vc($pub->get_status() === 200, "saved workspace publishes through validated API");
$pubRev = EstateCore\Store::get("page-home")["revision"];
$q = new WP_REST_Request("GET", "/rivton-core/v1/pages");
$q->set_query_params(["slug" => "/"]);
$public = rest_do_request($q);
vc($public->get_status() === 200, "published home accessible through public pages API");
$doc = vd($pub);
$doc["sections"][0]["content"]["title"] = "New secret draft";
unset($doc["sections"][0]["overrides"]["mobile"]);
$s2 = vr("PUT", "admin/workspaces/pages/page-home", $doc, vt($pub), 0);
vc($s2->get_status() === 200, "published page accepts unpublished working copy");
vc(
    EstateCore\Store::document(EstateCore\Store::get("page-home"))["sections"][0]["content"][
        "title"
    ] === "Workspace fixture",
    "private working title never replaces public title",
);
$history = vr("GET", "admin/workspaces/pages/page-home/revisions")->get_data();
vc(count($history["items"]) >= 2, "revision history contains durable version snapshots");
$restored = vr(
    "POST",
    "admin/workspaces/pages/page-home/restore",
    ["revision" => (int) $pubRev],
    vt($pub),
    1,
);
vc(
    $restored->get_status() === 200 &&
        vd($restored)["sections"][0]["content"]["title"] === "Workspace fixture",
    "restore revision creates recoverable draft",
);
$dh = vr("GET", "admin/workspaces/pages/page-home/revisions")->get_data()["draftItems"];
vc(count($dh) >= 2, "every saved workspace has recoverable draft history");
$restoreDraft = vr(
    "POST",
    "admin/workspaces/pages/page-home/restore",
    ["revision" => (int) $dh[0]["revision"], "source" => "draft"],
    vt($pub),
    2,
);
vc(
    $restoreDraft->get_status() === 200,
    "historical draft can be restored independently of publication",
);
$prev = vr("POST", "admin/workspaces/pages/page-home/preview", []);
vc(
    $prev->get_status() === 200 && $prev->get_data()["reactConnected"] === false,
    "protected preview explicitly identifies representative renderer",
);
wp_set_current_user(0);
vc(
    vr("GET", "admin/workspaces/pages/page-home")->get_status() !== 200,
    "anonymous cannot read workspace",
);
vc(
    vr("GET", "admin/workspaces/pages/page-home/revisions")->get_status() !== 200,
    "anonymous cannot read version documents",
);
vc(vr("POST", "admin/import/preview", [])->get_status() !== 200, "anonymous cannot preview import");
wp_set_current_user(1);
// Geographic hierarchy and typed feature relationships.
$defaults = json_decode(file_get_contents(ESTATE_CORE_DIR . "/schemas/defaults.json"), true);
$geo = function ($name, $level, $parent = null) use ($defaults) {
    $d = $defaults["location"];
    $d["name"] = $name;
    $d["slug"] = sanitize_title($name);
    $d["level"] = $level;
    if ($parent) {
        $d["parentId"] = $parent;
    }
    $r = vr("POST", "admin/locations", $d);
    if ($r->get_status() !== 201) {
        throw new Exception(wp_json_encode($r->get_data()));
    }
    $id = vd($r)["id"];
    $pub = vr("POST", "admin/locations/" . $id . "/publish", [], vt($r));
    vc($pub->get_status() === 200, "publish " . $level . " fixture");
    return $pub;
};
$province = $geo("QA Province", "province");
$city = $geo("QA City", "city", vd($province)["id"]);
$area = $geo("QA Area", "neighborhood", vd($city)["id"]);
$bad = $defaults["location"];
$bad["name"] = "Invalid";
$bad["slug"] = "invalid";
$bad["level"] = "neighborhood";
$bad["parentId"] = vd($province)["id"];
vc(
    vr("POST", "admin/locations", $bad)->get_status() === 422,
    "incorrect geographic parent rejected",
);
$property = $defaults["property"];
$property["title"] = "Visual QA property";
$property["slug"] = "visual-qa-property";
$property["provinceId"] = vd($province)["id"];
$property["cityId"] = vd($city)["id"];
$property["neighborhoodId"] = vd($area)["id"];
$property["attributes"] = ["feature-bedrooms" => 3, "feature-pool" => true];
$property["featureIds"] = ["feature-bedrooms", "feature-pool"];
$property["images"] = [$home["sections"][0]["scenes"][0]["media"]];
$prop = vr("POST", "admin/properties", $property);
vc($prop->get_status() === 201, "property persists typed attributes and geographic references");
$pid = vd($prop)["id"];
$pw = vr("GET", "admin/workspaces/properties/" . $pid);
$pd = vd($pw);
$pd["description"] = "Private draft fixture";
$pd["title"] = "Pending workspace property";
$ps = vr("PUT", "admin/workspaces/properties/" . $pid, $pd, vt($pw), 0);
$searchQ = new WP_REST_Request("GET", "/rivton-core/v1/admin/catalog/properties");
$searchQ->set_header("x-wp-nonce", wp_create_nonce("wp_rest"));
$searchQ->set_query_params(["search" => "Pending workspace property"]);
$searchResult = rest_do_request($searchQ);
vc(
    $searchResult->get_status() === 200 && count($searchResult->get_data()["items"]) === 1,
    "private catalog finds a title saved only in its workspace",
);
$copy = vr("POST", "admin/properties/" . $pid . "/duplicate", [], vt($pw), 1);
vc(
    $copy->get_status() === 201 &&
        vd($copy)["title"] === "Pending workspace property" &&
        vd($copy)["id"] !== $pid,
    "duplicate explicitly copies latest saved workspace to independent ID",
);
vc(
    $copy->get_data()["recordStatus"] === "draft",
    "workspace duplicate never publishes automatically",
);
vr("POST", "admin/properties/" . vd($copy)["id"] . "/trash", [], vt($copy));
$live = vr("GET", "admin/properties/" . $pid);
$ld = vd($live);
$ld["title"] = "Concurrent live property";
$live = vr("PATCH", "admin/properties/" . $pid, $ld, vt($live));
vc(
    $live->get_status() === 200 &&
        vr("PUT", "admin/workspaces/properties/" . $pid, $pd, vt($live), 1)->get_status() === 412,
    "stale workspace cannot silently rebase over changed live record",
);
$discarded = vr("DELETE", "admin/workspaces/properties/" . $pid, null, vt($live), 1);
vc(
    $discarded->get_status() === 200 && !$discarded->get_data()["hasDraft"],
    "authorized discard reloads live version without deleting history",
);
vc(
    count(
        vr("GET", "admin/workspaces/properties/" . $pid . "/revisions")->get_data()["draftItems"],
    ) >= 1,
    "discarded draft remains recoverable in history",
);

vc(str_contains(vd($prop)["location"], "QA Area"), "location label derives from linked hierarchy");
$property["slug"] = "invalid-typed";
$property["attributes"]["feature-bedrooms"] = "three";
vc(
    vr("POST", "admin/properties", $property)->get_status() === 422,
    "numeric feature rejects arbitrary string",
);
vc(
    vr("POST", "admin/locations/" . vd($city)["id"] . "/archive", [], vt($city))->get_status() ===
        409,
    "linked location cannot be archived even with draft properties",
);
$cityDoc = vd($city);
$cityDoc["name"] = "QA Renamed City";
$renamed = vr("PATCH", "admin/locations/" . $cityDoc["id"], $cityDoc, vt($city));
vc(
    $renamed->get_status() === 200 && vd($renamed)["id"] === $cityDoc["id"],
    "renaming geography preserves stable reference ID",
);
// A separate approved fixture import can be rolled back without touching unrelated entities.
$extra = require ESTATE_CORE_DIR . "/profiles/rivton-intake.php";
$extra["approved_business_data"]["team_names"][] = "Import Recovery QA";
$previewExtra = vr("POST", "admin/import/preview", ["intake" => $extra])->get_data();
$importExtra = vr("POST", "admin/import/apply", [
    "token" => $previewExtra["token"],
    "approved" => true,
]);
vc($importExtra->get_status() === 200, "supplemental intake applies only corresponding new entity");
$undo = vr("POST", "admin/import/rollback", [
    "reportId" => $importExtra->get_data()["reportId"],
    "approved" => true,
]);
vc(
    $undo->get_status() === 200 &&
        EstateCore\Store::get("team-import-recovery-qa")["status"] === "trash",
    "import backup restores prior state and retains new entity ID as trash",
);
vc(
    EstateCore\Store::get($pid)["kind"] === "property",
    "import recovery preserves unrelated property",
);
$unknown = $defaults["section"];
$unknown["type"] = "script";
$badPage = $defaults["page"];
$badPage["slug"] = "bad-section-type";
$badPage["sections"] = [$unknown];
vc(
    vr("POST", "admin/pages", $badPage)->get_status() === 422,
    "unregistered section component rejected",
);
$badMedia = $defaults["property"];
$badMedia["slug"] = "forged-media";
$badMedia["images"] = [$home["sections"][0]["scenes"][0]["media"]];
$badMedia["images"][0]["id"] = "wp-media-999999999";
vc(
    vr("POST", "admin/properties", $badMedia)->get_status() === 422,
    "forged native media reference rejected",
);
vc(
    vr("POST", "contact-intent", [])->get_status() === 503,
    "WhatsApp intent disabled until privacy review",
);
$policy = $defaults["page"];
$policy["title"] = "QA Consent Policy";
$policy["slug"] = "qa-policy";
$pr = vr("POST", "admin/pages", $policy);
$pr = vr("POST", "admin/pages/" . vd($pr)["id"] . "/publish", [], vt($pr));
$policyId = vd($pr)["id"];
$cc = vr("GET", "admin/configuration");
$cd = vd($cc);
$cd["forms"]["privacyReviewed"] = true;
$cd["site"]["legalPageIds"] = [$policyId];
$configured = vr("PUT", "admin/configuration", $cd, vt($cc));
vc($configured->get_status() === 200, "authorized reviewer configures privacy policy reference");
$intent = [
    "formId" => "publish-property",
    "fields" => [
        "name" => "QA contact",
        "phone" => "3510000000",
        "email" => "qa@example.invalid",
        "operation" => "venta",
        "location" => "QA only",
        "propertyType" => "Casa",
        "description" => "Fixture only",
    ],
    "consent" => ["accepted" => true, "privacyRevision" => $policyId . ":" . vd($pr)["revision"]],
];
$prepared = vr("POST", "contact-intent", $intent);
vc(
    $prepared->get_status() === 200 &&
        str_starts_with($prepared->get_data()["url"], "https://wa.me/5493513437509?text="),
    "WhatsApp message uses editable template and validated fixed destination",
);
vc(
    $prepared->get_data()["state"] === "intent_only" &&
        !$prepared->get_data()["leadStored"] &&
        !$prepared->get_data()["messageSent"],
    "WhatsApp intent does not pretend delivery or stored lead",
);
$intent["fields"]["name"] = "<script>alert(1)</script>";
vc(
    vr("POST", "contact-intent", $intent)->get_status() === 422,
    "WhatsApp intent rejects unsafe field markup",
);
// Client changes survive later imports; stale plan rejects all mutations.
$c = vr("GET", "admin/configuration");
$modified = vd($c);
$modified["site"]["email"] = "client-edited@example.invalid";
$edited = vr("PUT", "admin/configuration", $modified, vt($c));
vc($edited->get_status() === 200, "client edit stored after import");
$third = vr("POST", "admin/import/preview", [])->get_data();
$conflict = array_filter(
    $third["items"],
    fn($i) => $i["id"] === "configuration" && $i["decision"] === "conflict",
);
vc(count($conflict) === 1, "reimport detects client modification and refuses overwrite");
vc(
    vr("POST", "admin/import/rollback", [
        "reportId" => $reportId,
        "approved" => true,
    ])->get_status() === 409,
    "rollback refuses to overwrite later client edits",
);
$dash = vr("GET", "admin/dashboard");
vc(
    $dash->get_status() === 200 && $dash->get_data()["counts"]["total"] === 1,
    "dashboard computes actual property total",
);
vc(
    $dash->get_data()["analytics"] === "not_configured",
    "dashboard has no invented traffic metrics",
);
$agent = wp_create_user(
    "visual-agent-" . time(),
    wp_generate_password(),
    "visual-agent-" . time() . "@example.invalid",
);
(new WP_User($agent))->set_role("estate_agent");
wp_set_current_user($agent);
vc(
    vr("GET", "admin/workspaces/properties/" . $pid)->get_status() === 403,
    "agent cannot access another owner workspace by ID",
);
vc(vr("POST", "admin/import/preview", [])->get_status() === 403, "agent cannot escalate to import");
wp_set_current_user(1);
$teamRow = EstateCore\Store::get("team-maximiliano-carpio");
$teamDoc = EstateCore\Store::document($teamRow);
$teamDoc["extensions"] = ["privateNotes" => "QA private extension"];
$teamSaved = vr(
    "PATCH",
    "admin/team/" . $teamRow["id"],
    $teamDoc,
    EstateCore\Store::etag($teamRow),
);
$teamPublished = vr("POST", "admin/team/" . $teamRow["id"] . "/publish", [], vt($teamSaved));
$publicTeam = vr("GET", "team");
vc(
    $teamPublished->get_status() === 200 &&
        !str_contains(wp_json_encode($publicTeam->get_data()), "privateNotes"),
    "public team endpoint redacts unregistered extensions",
);
add_role("qa_settings_publisher", "QA settings publisher", [
    "read" => true,
    "estate_manage_settings" => true,
    "estate_publish_content" => true,
    "estate_edit_others" => true,
]);
$restricted = wp_create_user(
    "settings-" . time(),
    wp_generate_password(),
    "settings-" . time() . "@example.invalid",
);
(new WP_User($restricted))->set_role("qa_settings_publisher");
wp_set_current_user($restricted);
$cw = vr("GET", "admin/workspaces/configuration/configuration");
$restrictedDoc = vd($cw);
$restrictedDoc["integrations"]["gtm"]["enabled"] = true;
$restrictedDoc["integrations"]["gtm"]["containerId"] = "GTM-ABC123";
vc(
    vr(
        "PUT",
        "admin/workspaces/configuration/configuration",
        $restrictedDoc,
        vt($cw),
        $cw->get_data()["draftRevision"],
    )->get_status() === 403,
    "configuration workspace cannot bypass integration capability",
);
wp_set_current_user(1);
$results["documents"] = [
    "home" => vd(vr("GET", "admin/pages/page-home")),
    "property" => vd(vr("GET", "admin/properties/" . $pid)),
    "location" => vd(vr("GET", "admin/locations/" . $cityDoc["id"])),
];
$results["success"] = true;
echo wp_json_encode([
    "passed" => count($results["passed"]),
    "environment" => $results["environment"],
]);
