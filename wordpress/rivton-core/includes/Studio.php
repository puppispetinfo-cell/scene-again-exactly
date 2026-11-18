<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Studio
{
    private Rest $rest;
    public function __construct(Rest $rest)
    {
        $this->rest = $rest;
        add_action("rest_api_init", [$this, "routes"]);
    }
    public function routes(): void
    {
        $r = $this->rest;
        $r->route("/contact-intent", "POST", fn($q) => $this->contact($q), "__return_true");
        $r->route(
            "/admin/dashboard",
            "GET",
            fn($q) => $this->dashboard(),
            fn() => current_user_can("estate_edit_properties") ||
                current_user_can("estate_edit_content") ||
                current_user_can("estate_manage_leads"),
        );
        foreach (
            [
                "pages" => "page",
                "properties" => "property",
                "team" => "team",
                "configuration" => "configuration",
            ]
            as $plural => $kind
        ) {
            $path = "/admin/workspaces/" . $plural . "/(?P<id>[a-zA-Z0-9_-]+)";
            $perm = fn() => $r->permission($kind);
            $r->route($path, "GET", fn($q) => $this->read($kind, $q), $perm);
            $r->route($path, "DELETE", fn($q) => $this->discard($kind, $q), $perm);
            $r->route($path, "PUT", fn($q) => $r->write($kind, $q, null, true), $perm);
            $r->route($path . "/publish", "POST", fn($q) => $this->publish($kind, $q), $perm);
            $r->route(
                $path . "/unpublish",
                "POST",
                fn($q) => $r->transition($kind, $q, "draft"),
                $perm,
            );
            $r->route($path . "/revisions", "GET", fn($q) => $this->history($kind, $q), $perm);
            $r->route($path . "/restore", "POST", fn($q) => $this->restore($kind, $q), $perm);
            $r->route($path . "/preview", "POST", fn($q) => $this->preview($kind, $q), $perm);
        }
        $r->route(
            "/admin/catalog/(?P<kind>properties|pages|locations|features|categories|team|leads)",
            "GET",
            fn($q) => $this->catalog($q),
            fn($q) => $r->permission($this->kind($q["kind"])),
        );
        $r->route(
            "/admin/import/reports",
            "GET",
            function ($q) {
                $items = [];
                foreach (Store::list("import", false, absint($q["after"]), 25) as $row) {
                    $d = Store::document($row);
                    $items[] = [
                        "id" => $row["id"],
                        "createdAt" => $d["createdAt"] ?? $row["created_at"],
                        "rolledBack" => $d["rolledBack"] ?? null,
                        "counts" => array_count_values(
                            array_map(fn($x) => $x["decision"], $d["items"] ?? []),
                        ),
                        "cursor" => $row["sequence"],
                    ];
                }
                return $this->privateResponse([
                    "items" => $items,
                    "nextCursor" => count($items) === 25 ? end($items)["cursor"] : null,
                ]);
            },
            fn() => current_user_can("estate_manage_settings") &&
                current_user_can("estate_manage_integrations") &&
                current_user_can("estate_publish_content") &&
                current_user_can("estate_edit_others"),
        );
        $r->route(
            "/team",
            "GET",
            function ($q) {
                $offset = absint($q["after"]);
                $rows = Store::list("team", true, $offset, 100);
                $items = [];
                foreach ($rows as $row) {
                    $d = Store::document($row);
                    if ($d["visible"] ?? true) {
                        $items[] = $this->rest->redactExtensions($d);
                    }
                }
                return $this->privateResponse([
                    "items" => $items,
                    "nextCursor" => count($rows) === 100 ? end($rows)["sequence"] : null,
                ]);
            },
            "__return_true",
        );
        foreach (["preview", "apply", "rollback"] as $action) {
            $r->route(
                "/admin/import/" . $action,
                "POST",
                fn($q) => Import::request($action, $q),
                fn() => current_user_can("estate_manage_settings") &&
                    current_user_can("estate_manage_integrations") &&
                    current_user_can("estate_publish_content") &&
                    current_user_can("estate_edit_others"),
            );
        }
    }
    private function kind(string $plural): string
    {
        return [
            "properties" => "property",
            "pages" => "page",
            "locations" => "location",
            "categories" => "category",
            "features" => "feature",
            "team" => "team",
            "leads" => "lead",
        ][$plural];
    }
    private function row(string $kind, $q)
    {
        $row = Store::get((string) ($q->get_url_params()["id"] ?? ""));
        if (!$row || $row["kind"] !== $kind) {
            return new \WP_Error("estate_missing", "No encontrado", ["status" => 404]);
        }
        if (!Store::can($row)) {
            return new \WP_Error("estate_forbidden", "Sin permiso para este recurso", [
                "status" => 403,
            ]);
        }
        return $row;
    }
    private function match($q, array $row)
    {
        return $q->get_header("if-match") === Store::etag($row)
            ? true
            : new \WP_Error("estate_conflict", "El contenido cambió. Recargá antes de continuar.", [
                "status" => $q->get_header("if-match") ? 412 : 428,
            ]);
    }
    private function privateResponse($data, $code = 200)
    {
        $r = new \WP_REST_Response($data, $code);
        $r->header("Cache-Control", "no-store");
        return $r;
    }
    public function read(string $kind, $q)
    {
        $row = $this->row($kind, $q);
        return is_wp_error($row) ? $row : Workspace::response($row);
    }
    public function discard(string $kind, $q)
    {
        $row = $this->row($kind, $q);
        if (is_wp_error($row)) {
            return $row;
        }
        $match = $this->match($q, $row);
        if (is_wp_error($match)) {
            return $match;
        }
        $draft = Workspace::pending($row["id"]);
        if (!$draft || $q->get_header("x-draft-revision") !== (string) $draft["revision"]) {
            return Schema::fail("El borrador cambió. Recargá.", 412);
        }
        global $wpdb;
        $wpdb->query("START TRANSACTION");
        $deleted = $wpdb->delete($wpdb->prefix . "estate_drafts", [
            "resource_id" => $row["id"],
            "revision" => $draft["revision"],
        ]);
        if (
            !$deleted ||
            !Store::audit("discard_draft", $row["id"], (int) $draft["revision"], "draft")
        ) {
            $wpdb->query("ROLLBACK");
            return Schema::fail("No se descartó el borrador", 412);
        }
        $wpdb->query("COMMIT");
        return Workspace::response($row);
    }
    public function history(string $kind, $q)
    {
        $row = $this->row($kind, $q);
        if (is_wp_error($row)) {
            return $row;
        }
        $items = Workspace::history($row, $q["after"]);
        return $this->privateResponse([
            "draftItems" => Workspace::draftHistory($row),
            "items" => $items,
            "nextCursor" => count($items) === 100 ? end($items)["sequence"] : null,
        ]);
    }
    public function restore(string $kind, $q)
    {
        $row = $this->row($kind, $q);
        if (is_wp_error($row)) {
            return $row;
        }
        $match = $this->match($q, $row);
        if (is_wp_error($match)) {
            return $match;
        }
        $body = $q->get_json_params();
        if (
            !is_array($body) ||
            array_diff(array_keys($body), ["revision", "source"]) ||
            !is_int($body["revision"] ?? null)
        ) {
            return Schema::fail("Revisión inválida");
        }
        $source = $body["source"] ?? "live";
        if (!in_array($source, ["live", "draft"], true)) {
            return Schema::fail("Origen de revisión inválido");
        }
        $past = Workspace::historical($row, $body["revision"], $source);
        if (!$past) {
            return Schema::fail("Revisión no disponible", 404);
        }
        $document = json_decode($past["document"], true);
        $document["revision"] = (int) $row["revision"];
        $q->set_body(wp_json_encode($document));
        $q->set_header("content-type", "application/json");
        return $this->rest->write($kind, $q, null, true);
    }
    public function publish(string $kind, $q)
    {
        $row = $this->row($kind, $q);
        if (is_wp_error($row)) {
            return $row;
        }
        if (!current_user_can("estate_publish_content")) {
            return new \WP_Error("estate_forbidden", "Se requiere permiso de publicación", [
                "status" => 403,
            ]);
        }
        $match = $this->match($q, $row);
        if (is_wp_error($match)) {
            return $match;
        }
        $draft = Workspace::pending($row["id"]);
        if (
            !$draft ||
            $q->get_header("x-draft-revision") !== (string) $draft["revision"] ||
            (int) $draft["base_revision"] !== (int) $row["revision"]
        ) {
            return new \WP_Error(
                "estate_conflict",
                "Guardá el borrador actual y resolvé los conflictos antes de publicar",
                ["status" => 412],
            );
        }
        $d = json_decode($draft["document"], true);
        $schema = [
            "page" => "pageDefinitionSchema",
            "property" => "propertySchema",
            "team" => "teamMemberSchema",
            "configuration" => "configurationSchema",
        ][$kind];
        if (
            $kind === "configuration" &&
            !current_user_can("estate_manage_integrations") &&
            ($d["integrations"] ?? []) !== (Store::document($row)["integrations"] ?? [])
        ) {
            return new \WP_Error("estate_forbidden", "Integration capability required", [
                "status" => 403,
            ]);
        }
        $checked = Schema::check($schema, $d);
        if (is_wp_error($checked)) {
            return $checked;
        }
        $valid = $this->rest->semantics($kind, $checked, $row);
        if (is_wp_error($valid)) {
            return $valid;
        }
        if (
            in_array($kind, ["page", "property"], true) &&
            (!trim($checked["title"]) || !$checked["slug"])
        ) {
            return Schema::fail("Completá título y URL");
        }
        if ($kind === "property" && empty($checked["images"])) {
            return Schema::fail("Agregá una imagen antes de publicar");
        }
        if ($kind === "page") {
            $checked["status"] = "published";
        }
        $saved = Store::save($kind, $checked, "published", $row);
        if (is_wp_error($saved)) {
            return $saved;
        }
        global $wpdb;
        $wpdb->delete($wpdb->prefix . "estate_drafts", [
            "resource_id" => $row["id"],
            "revision" => $draft["revision"],
        ]);
        return Workspace::response($saved);
    }
    public function preview(string $kind, $q)
    {
        $row = $this->row($kind, $q);
        if (is_wp_error($row)) {
            return $row;
        }
        return $this->privateResponse([
            "schemaVersion" => 1,
            "mode" => "representative",
            "reactConnected" => false,
            "expiresAt" => gmdate("c", time() + 300),
            "resourceId" => $row["id"],
            "revision" => (int) $row["revision"],
            "draftRevision" => (int) (Workspace::pending($row["id"])["revision"] ?? 0),
            "workspace" => Workspace::response($row)->get_data(),
            "authentication" => "WordPress session + REST nonce; no public preview URL",
        ]);
    }
    public function contact($q)
    {
        if (strlen($q->get_body()) > 8192) {
            return Schema::fail("Solicitud demasiado grande", 413);
        }
        if (!$this->rest->originAllowed($q->get_header("origin"))) {
            return Schema::fail("Origen no autorizado", 403);
        }
        $config = Store::document(Store::get("configuration"));
        $forms = $config["forms"] ?? [];
        if (empty($forms["privacyReviewed"])) {
            return Schema::fail(
                "La política de privacidad requiere revisión antes de preparar consultas",
                503,
            );
        }
        $b = $q->get_json_params();
        if (
            !is_array($b) ||
            array_diff(array_keys($b), ["formId", "fields", "consent"]) ||
            !in_array($b["formId"] ?? "", ["contact", "publish-property"], true)
        ) {
            return Schema::fail("Formulario inválido");
        }
        $privacy = $b["consent"] ?? [];
        $revision = $privacy["privacyRevision"] ?? "";
        $parts = is_string($revision) ? explode(":", $revision) : [];
        $policy = Store::get($parts[0] ?? "");
        if (
            ($privacy["accepted"] ?? false) !== true ||
            !$policy ||
            $policy["kind"] !== "page" ||
            $policy["status"] !== "published" ||
            $revision !== $policy["id"] . ":" . $policy["revision"] ||
            !in_array($policy["id"], $config["site"]["legalPageIds"], true)
        ) {
            return Schema::fail("Consentimiento o revisión legal inválidos");
        }
        $fields = $b["fields"] ?? [];
        $allowed = $forms[$b["formId"] === "contact" ? "propertyFields" : "ownerFields"] ?? [];
        if (!is_array($fields) || array_diff(array_keys($fields), $allowed)) {
            return Schema::fail("Campos no admitidos");
        }
        foreach ($fields as $key => $value) {
            if (
                !is_string($value) ||
                strlen($value) > 3000 ||
                sanitize_textarea_field($value) !== $value
            ) {
                return Schema::fail("Campo de consulta inválido");
            }
        }
        if (
            empty($fields["name"]) ||
            empty($fields["phone"]) ||
            (!empty($fields["email"]) && !is_email($fields["email"]))
        ) {
            return Schema::fail("Completá nombre, teléfono y un email válido si lo informás");
        }
        if (
            isset($fields["operation"]) &&
            !in_array($fields["operation"], ["venta", "alquiler"], true)
        ) {
            return Schema::fail("Operación inválida");
        }
        if (!empty($fields["propertyId"])) {
            $property = Store::get($fields["propertyId"]);
            if (
                !$property ||
                $property["kind"] !== "property" ||
                $property["status"] !== "published"
            ) {
                return Schema::fail("Propiedad no disponible", 404);
            }
            $d = Store::document($property);
            $fields["propertyTitle"] = $d["title"];
            $fields["propertyCode"] = $d["code"] ?? "";
        }
        $key =
            "estate_intent_" .
            hash("sha256", ($_SERVER["REMOTE_ADDR"] ?? "unknown") . gmdate("Y-m-d-H"));
        $count = (int) get_transient($key);
        if ($count >= 20) {
            return Schema::fail("Demasiadas solicitudes. Reintentá más tarde.", 429);
        }
        set_transient($key, $count + 1, HOUR_IN_SECONDS);
        $template = $forms[$b["formId"] === "contact" ? "propertyMessage" : "ownerMessage"] ?? "";
        $replace = [];
        foreach (
            [
                "name",
                "phone",
                "email",
                "propertyTitle",
                "propertyCode",
                "message",
                "preferredTime",
                "propertyType",
                "location",
                "operation",
                "description",
            ]
            as $key
        ) {
            $replace["{" . $key . "}"] = $fields[$key] ?? "";
        }
        $text = strtr($template, $replace);
        $phone = $config["site"]["whatsapp"] ?? "";
        if (!preg_match('/^\\d{6,20}$/', $phone)) {
            return Schema::fail("WhatsApp no configurado", 503);
        }
        return $this->privateResponse([
            "schemaVersion" => 1,
            "url" => "https://wa.me/" . $phone . "?text=" . rawurlencode($text),
            "state" => "intent_only",
            "leadStored" => false,
            "messageSent" => false,
            "notice" => $forms["successMessage"] ?? "Revisá y enviá el mensaje en WhatsApp.",
        ]);
    }
    public function catalog($q)
    {
        global $wpdb;
        $kind = $this->kind($q["kind"]);
        foreach (
            [
                "after",
                "search",
                "status",
                "sort",
                "operation",
                "propertyTypeId",
                "cityId",
                "neighborhoodId",
                "agentId",
            ]
            as $key
        ) {
            if ($q[$key] !== null && !is_scalar($q[$key])) {
                return Schema::fail("Parámetro inválido");
            }
        }
        $size = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COALESCE(SUM(LENGTH(document)),0) FROM " .
                    Store::table() .
                    " WHERE kind=%s",
                $kind,
            ),
        );
        if ($size > 4194304) {
            return Schema::fail("El catálogo supera el límite de proyección de esta versión", 413);
        }
        $rows = Store::list($kind, false, 0, 10001);
        if (count($rows) > 10000) {
            return Schema::fail("El catálogo supera 10000 registros", 413);
        }
        $items = [];
        $search = mb_strtolower(sanitize_text_field((string) ($q["search"] ?? "")));
        foreach ($rows as $row) {
            $pending = Workspace::pending($row["id"]);
            $d = Domain::project(
                $kind,
                $pending ? json_decode($pending["document"], true) : Store::document($row),
            );
            $text = mb_strtolower(
                ($d["title"] ?? ($d["label"] ?? ($d["name"] ?? ""))) .
                    " " .
                    ($d["code"] ?? "") .
                    " " .
                    ($d["location"] ?? ""),
            );
            if ($search && !str_contains($text, $search)) {
                continue;
            }
            if ($q["status"] && $row["status"] !== $q["status"]) {
                continue;
            }
            foreach (
                ["operation", "propertyTypeId", "cityId", "neighborhoodId", "agentId"]
                as $key
            ) {
                if ($q[$key] && ($d[$key] ?? "") !== $q[$key]) {
                    continue 2;
                }
            }
            if ($kind === "lead") {
                $d = [
                    "form" => $d["formId"] ?? "",
                    "name" => $d["name"] ?? "",
                    "createdAt" => $d["createdAt"] ?? "",
                ];
            }
            $items[] = [
                "id" => $row["id"],
                "document" => $d,
                "recordStatus" => $row["status"],
                "revision" => (int) $row["revision"],
                "updatedAt" => $pending["updated_at"] ?? $row["updated_at"],
                "hasDraft" => (bool) Workspace::pending($row["id"]),
            ];
        }
        $sort = $q["sort"] ?? "updated-desc";
        if (!in_array($sort, ["updated-desc", "title-asc", "price-asc", "price-desc"], true)) {
            return Schema::fail("Orden inválido");
        }
        usort($items, function ($a, $b) use ($sort) {
            if ($sort === "title-asc") {
                $v = strcmp(
                    $a["document"]["title"] ??
                        ($a["document"]["name"] ?? ($a["document"]["label"] ?? "")),
                    $b["document"]["title"] ??
                        ($b["document"]["name"] ?? ($b["document"]["label"] ?? "")),
                );
            } elseif (str_starts_with($sort, "price")) {
                $pa = $a["document"]["price"] ?? null;
                $pb = $b["document"]["price"] ?? null;
                if (!$pa || !$pb) {
                    $v = ($pa ? 0 : 1) <=> ($pb ? 0 : 1);
                } else {
                    $v = strcmp($pa["currency"], $pb["currency"]);
                    if (!$v) {
                        $v = ($pa["amount"] <=> $pb["amount"]) * ($sort === "price-desc" ? -1 : 1);
                    }
                }
            } else {
                $v = strcmp($b["updatedAt"], $a["updatedAt"]);
            }
            return $v ?: strcmp($a["id"], $b["id"]);
        });
        $offset = absint($q["after"]);
        return $this->privateResponse([
            "items" => array_slice($items, $offset, 25),
            "nextCursor" => count($items) > $offset + 25 ? $offset + 25 : null,
            "sort" => $sort,
        ]);
    }
    public function dashboard()
    {
        global $wpdb;
        $size = (int) $wpdb->get_var(
            "SELECT COALESCE(SUM(LENGTH(document)),0) FROM " .
                Store::table() .
                " WHERE kind IN ('property','lead')",
        );
        if ($size > 4194304) {
            return Schema::fail("El dashboard supera el límite de proyección de esta versión", 413);
        }
        $counts = [
            "total" => 0,
            "published" => 0,
            "draft" => 0,
            "featured" => 0,
            "withdrawn" => 0,
            "incomplete" => 0,
            "newLeads" => null,
            "pendingLeads" => null,
        ];
        if (current_user_can("estate_edit_properties")) {
            foreach (Store::list("property", false, 0, 10001) as $row) {
                if ($row["status"] === "trash") {
                    continue;
                }
                if ($counts["total"] >= 10000) {
                    return Schema::fail("El dashboard supera el límite de catálogo", 413);
                }
                $d = Store::document($row);
                $counts["total"]++;
                if (isset($counts[$row["status"]])) {
                    $counts[$row["status"]]++;
                }
                if (!empty($d["featured"])) {
                    $counts["featured"]++;
                }
                if (($d["status"] ?? "") === "withdrawn" || $row["status"] === "archived") {
                    $counts["withdrawn"]++;
                }
                if (empty($d["images"]) || empty($d["description"]) || empty($d["cityId"])) {
                    $counts["incomplete"]++;
                }
            }
        }
        if (current_user_can("estate_manage_leads")) {
            $counts["newLeads"] = 0;
            $counts["pendingLeads"] = 0;
            foreach (Store::list("lead", false, 0, 10001) as $row) {
                if ($row["status"] === "new") {
                    $counts["newLeads"]++;
                }
                if (in_array($row["status"], ["new", "assigned"], true)) {
                    $counts["pendingLeads"]++;
                }
            }
        }
        $changes = current_user_can("estate_view_audit")
            ? $wpdb->get_results(
                "SELECT action,resource_id,revision,status,created_at FROM {$wpdb->prefix}estate_audit ORDER BY sequence DESC LIMIT 12",
                ARRAY_A,
            )
            : [];
        return $this->privateResponse([
            "counts" => $counts,
            "latestChanges" => $changes,
            "analytics" => "not_configured",
            "email" => "not_configured",
            "scope" => "authorized records only; maximum 10000 per kind",
        ]);
    }
}
