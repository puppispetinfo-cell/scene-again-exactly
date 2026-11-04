<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Rest
{
    public const NS = "rivton-core/v1";
    private const MODELS = [
        "property" => "propertySchema",
        "page" => "pageDefinitionSchema",
        "category" => "propertyCategorySchema",
        "feature" => "propertyFeatureSchema",
        "configuration" => "configurationSchema",
    ];
    public function __construct()
    {
        add_action("rest_api_init", [$this, "routes"]);
        add_filter("rest_pre_serve_request", [$this, "cors"], 30, 4);
        add_filter(
            "rest_post_dispatch",
            function ($response, $server, $request) {
                if (!str_starts_with($request->get_route(), "/" . self::NS . "/")) {
                    return $response;
                }
                $response = rest_ensure_response($response);
                $id = wp_generate_uuid4();
                $response->header("X-Request-ID", $id);
                if ($response->get_status() >= 400) {
                    $data = $response->get_data();
                    if (is_array($data)) {
                        $data["requestId"] = $id;
                        $response->set_data($data);
                    }
                    $response->header("Cache-Control", "no-store");
                }
                return $response;
            },
            20,
            3,
        );
    }
    private function route(string $path, string $method, callable $callback, $permission): void
    {
        register_rest_route(self::NS, $path, [
            "methods" => $method,
            "callback" => function ($request) use ($callback) {
                try {
                    return $callback($request);
                } catch (\Throwable $error) {
                    error_log("Estate Core runtime failure: " . get_class($error));
                    return new \WP_Error("estate_unavailable", "Service temporarily unavailable", [
                        "status" => 503,
                    ]);
                }
            },
            "permission_callback" => function ($request) use ($permission, $path) {
                $grant = call_user_func($permission, $request);
                if (
                    $grant === true &&
                    str_starts_with($path, "/admin/") &&
                    in_array($request->get_method(), ["POST", "PUT", "PATCH", "DELETE"], true) &&
                    !wp_verify_nonce((string) $request->get_header("x-wp-nonce"), "wp_rest")
                ) {
                    return new \WP_Error(
                        "estate_nonce",
                        "A valid WordPress REST nonce is required",
                        ["status" => 403],
                    );
                }
                return $grant;
            },
        ]);
    }
    public function routes(): void
    {
        $public = "__return_true";
        foreach (["snapshot", "configuration", "taxonomies", "pages", "properties"] as $resource) {
            $this->route("/" . $resource, "GET", fn($r) => $this->read($resource, $r), $public);
        }
        $this->route(
            "/properties/(?P<id>[a-zA-Z0-9_-]+)",
            "GET",
            fn($r) => $this->property($r),
            $public,
        );
        foreach (
            [
                "properties" => "property",
                "pages" => "page",
                "categories" => "category",
                "features" => "feature",
                "leads" => "lead",
            ]
            as $plural => $kind
        ) {
            $perm = fn() => $this->permission($kind);
            $this->route("/admin/" . $plural, "GET", fn($r) => $this->listing($kind, $r), $perm);
            if ($kind !== "lead") {
                $this->route("/admin/" . $plural, "POST", fn($r) => $this->write($kind, $r), $perm);
            }
            $this->route(
                "/admin/" . $plural . "/(?P<id>[a-zA-Z0-9_-]+)",
                "GET",
                fn($r) => $this->privateRead($kind, $r),
                $perm,
            );
            $this->route(
                "/admin/" . $plural . "/(?P<id>[a-zA-Z0-9_-]+)",
                "PATCH",
                fn($r) => $this->write($kind, $r),
                $perm,
            );
            if ($kind !== "lead") {
                $this->route(
                    "/admin/" . $plural . "/(?P<id>[a-zA-Z0-9_-]+)/publish",
                    "POST",
                    fn($r) => $this->transition($kind, $r, "published"),
                    $perm,
                );
                $this->route(
                    "/admin/" . $plural . "/(?P<id>[a-zA-Z0-9_-]+)/archive",
                    "POST",
                    fn($r) => $this->transition($kind, $r, "archived"),
                    $perm,
                );
                $this->route(
                    "/admin/" . $plural . "/(?P<id>[a-zA-Z0-9_-]+)/trash",
                    "POST",
                    fn($r) => $this->transition($kind, $r, "trash"),
                    $perm,
                );
                $this->route(
                    "/admin/" . $plural . "/(?P<id>[a-zA-Z0-9_-]+)/duplicate",
                    "POST",
                    fn($r) => $this->duplicate($kind, $r),
                    $perm,
                );
            }
        }
        $this->route(
            "/admin/configuration",
            "GET",
            fn($r) => $this->privateRead("configuration", $r, "configuration"),
            fn() => $this->permission("configuration"),
        );
        $this->route(
            "/admin/configuration",
            "PUT",
            fn($r) => $this->write("configuration", $r, "configuration"),
            fn() => $this->permission("configuration"),
        );
        $this->route(
            "/admin/audit",
            "GET",
            function ($r) {
                global $wpdb;
                return $this->response(
                    [
                        "items" => $wpdb->get_results(
                            $wpdb->prepare(
                                "SELECT * FROM " .
                                    $wpdb->prefix .
                                    "estate_audit WHERE sequence>%d ORDER BY sequence ASC LIMIT 100",
                                absint($r->get_param("after")),
                            ),
                            ARRAY_A,
                        ),
                    ],
                    false,
                );
            },
            fn() => current_user_can("estate_view_audit"),
        );
        $this->route(
            "/admin/insights",
            "GET",
            fn() => new \WP_Error("estate_not_configured", "No analytics provider is connected.", [
                "status" => 503,
            ]),
            fn() => current_user_can("estate_view_insights"),
        );
        $this->route("/submissions", "POST", [$this, "submission"], $public);
        foreach (["calendly", "revalidate"] as $hook) {
            $this->route(
                "/webhooks/" . $hook,
                "POST",
                fn() => new \WP_Error(
                    "estate_integration_disabled",
                    "Integration not configured; no event accepted.",
                    ["status" => 503],
                ),
                "__return_true",
            );
        }
    }
    public function permission(string $kind)
    {
        $cap = [
            "property" => "estate_edit_properties",
            "page" => "estate_edit_content",
            "category" => "estate_manage_settings",
            "feature" => "estate_manage_settings",
            "configuration" => "estate_manage_settings",
            "lead" => "estate_manage_leads",
        ][$kind];
        return current_user_can($cap)
            ? true
            : new \WP_Error("estate_forbidden", "Access denied", [
                "status" => get_current_user_id() ? 403 : 401,
            ]);
    }
    private function response($value, bool $public = true, ?string $etag = null, int $status = 200)
    {
        $r = new \WP_REST_Response(
            Schema::json($public ? $this->redactExtensions($value) : $value),
            $status,
        );
        $r->header("Cache-Control", $public ? "public, max-age=30, must-revalidate" : "no-store");
        if ($etag) {
            $r->header("ETag", $etag);
        }
        return $r;
    }
    private function redactExtensions($value)
    {
        if (!is_array($value)) {
            return $value;
        }
        foreach ($value as $key => $item) {
            $value[$key] = $key === "extensions" ? [] : $this->redactExtensions($item);
        }
        return $value;
    }
    private function body($r)
    {
        if (strlen($r->get_body()) > 262144) {
            return new \WP_Error("estate_size", "Request too large", ["status" => 413]);
        }
        if (stripos((string) $r->get_header("content-type"), "application/json") !== 0) {
            return new \WP_Error("estate_content_type", "JSON required", ["status" => 415]);
        }
        $v = $r->get_json_params();
        return is_array($v) ? $v : Schema::fail("JSON object required", 400);
    }
    private function current(string $kind, $r, ?string $fixed = null)
    {
        $row = Store::get($fixed ?? (string) ($r->get_url_params()["id"] ?? ""));
        if (!$row || $row["kind"] !== $kind || !Store::can($row)) {
            return new \WP_Error("estate_not_found", "Resource unavailable", ["status" => 404]);
        }
        return $row;
    }
    private function match($r, array $row)
    {
        $header = $r->get_header("if-match");
        if (!$header) {
            return new \WP_Error("estate_precondition", "If-Match required", ["status" => 428]);
        }
        return hash_equals(Store::etag($row), $header)
            ? true
            : new \WP_Error("estate_conflict", "Reload the latest revision", ["status" => 412]);
    }
    public function privateRead(string $kind, $r, ?string $fixed = null)
    {
        $row = $this->current($kind, $r, $fixed);
        return is_wp_error($row)
            ? $row
            : $this->response(
                [
                    "document" => Store::document($row),
                    "recordStatus" => $row["status"],
                    "owner" => (int) $row["owner"],
                ],
                false,
                Store::etag($row),
            );
    }
    public function listing(string $kind, $r)
    {
        $rows = Store::list($kind, false, absint($r->get_param("after")), 100);
        return $this->response(
            [
                "items" => array_map(
                    fn($row) => [
                        "id" => $row["id"],
                        "title" =>
                            Store::document($row)["title"] ??
                            (Store::document($row)["label"] ?? $row["id"]),
                        "recordStatus" => $row["status"],
                        "revision" => (int) $row["revision"],
                    ],
                    $rows,
                ),
                "nextCursor" => count($rows) === 100 ? (string) end($rows)["sequence"] : null,
            ],
            false,
        );
    }
    public function write(string $kind, $r, ?string $fixed = null)
    {
        $old = null;
        if ($fixed || isset($r->get_url_params()["id"])) {
            $old = $this->current($kind, $r, $fixed);
            if (is_wp_error($old)) {
                return $old;
            }
            $m = $this->match($r, $old);
            if (is_wp_error($m)) {
                return $m;
            }
        }
        $body = $this->body($r);
        if (is_wp_error($body)) {
            return $body;
        }
        if ($kind === "lead") {
            if (array_diff(array_keys($body), ["state"])) {
                return Schema::fail("Only lead state may be changed");
            }
            if (!in_array($body["state"] ?? "", ["new", "assigned", "contacted", "closed"], true)) {
                return Schema::fail("Invalid lead state");
            }
            $row = Store::save("lead", Store::document($old), $body["state"], $old);
            return is_wp_error($row)
                ? $row
                : $this->response(
                    ["id" => $row["id"], "recordStatus" => $row["status"]],
                    false,
                    Store::etag($row),
                );
        }
        $body["id"] = $old["id"] ?? "new";
        $body["revision"] = $old ? (int) $old["revision"] : 0;
        $body["schemaVersion"] = 1;
        if ($kind === "property") {
            $body["updatedAt"] = gmdate("Y-m-d\TH:i:s\Z");
            if (!empty($body["propertyTypeId"])) {
                $type = Store::get($body["propertyTypeId"]);
                if (!$type || $type["kind"] !== "category" || $type["status"] !== "published") {
                    return Schema::fail("Unknown property type");
                }
                $term = Store::document($type);
                if ($term["kind"] !== "type") {
                    return Schema::fail("Expected a property type category");
                }
                $family = $term["legacyType"] ?? $term["slug"];
                if (
                    !in_array(
                        $family,
                        ["casa", "departamento", "terreno", "local", "oficina"],
                        true,
                    )
                ) {
                    return Schema::fail(
                        "Configure the compatibility family for this property type",
                    );
                }
                $body["type"] = $family;
                $body["categoryIds"] = array_values(
                    array_unique(array_merge($body["categoryIds"] ?? [], [$type["id"]])),
                );
            }
        }
        if (isset($body["slug"]) && $body["slug"] === "") {
            $body["slug"] = "draft-" . wp_generate_uuid4();
        }
        $checked = Schema::check(self::MODELS[$kind], $body);
        if (is_wp_error($checked)) {
            return $checked;
        }
        $semantic = $this->semantics($kind, $checked, $old);
        if (is_wp_error($semantic)) {
            return $semantic;
        }
        // Saving a published document changes public content and requires publisher capability too.
        if (
            $old &&
            $old["status"] === "published" &&
            !current_user_can("estate_publish_content") &&
            in_array($kind, ["property", "page"], true)
        ) {
            return new \WP_Error(
                "estate_forbidden",
                "Publishing capability required to edit published content",
                ["status" => 403],
            );
        }
        if (
            $kind === "configuration" &&
            !current_user_can("estate_manage_integrations") &&
            ($checked["integrations"] ?? []) !== (Store::document($old)["integrations"] ?? [])
        ) {
            return new \WP_Error("estate_forbidden", "Integration capability required", [
                "status" => 403,
            ]);
        }
        if (isset($checked["slug"]) && !$checked["slug"]) {
            $checked["slug"] = "draft-" . wp_generate_uuid4();
        }
        $status =
            $old["status"] ??
            (in_array($kind, ["configuration", "category", "feature"], true)
                ? "published"
                : "draft");
        if ($kind === "page") {
            $checked["status"] =
                $status === "published"
                    ? "published"
                    : ($status === "archived"
                        ? "archived"
                        : "draft");
        }
        $row = Store::save($kind, $checked, $status, $old);
        return is_wp_error($row)
            ? $row
            : $this->response(
                ["document" => Store::document($row), "recordStatus" => $row["status"]],
                false,
                Store::etag($row),
                $old ? 200 : 201,
            );
    }
    private function semantics(string $kind, array $d, ?array $old)
    {
        if ($kind === "property") {
            foreach ($d["images"] as $image) {
                if ($image["kind"] !== "image") {
                    return Schema::fail("Gallery entries must be images");
                }
            }
            foreach (
                ["categoryIds" => "category", "featureIds" => "feature"]
                as $field => $expected
            ) {
                foreach ($d[$field] as $id) {
                    $row = Store::get($id);
                    if (!$row || $row["kind"] !== $expected || $row["status"] !== "published") {
                        return Schema::fail("Unknown taxonomy reference");
                    }
                }
            }
            if ($d["calendly"]["enabled"] && empty($d["calendly"]["url"])) {
                return Schema::fail("Calendly URL required when enabled");
            }
        }
        if ($kind === "page") {
            $ids = array_column($d["sections"], "id");
            if (count($ids) !== count(array_unique($ids))) {
                return Schema::fail("Duplicate section IDs");
            }
        }
        if (in_array($kind, ["category", "feature"], true) && empty(trim($d["label"]))) {
            return Schema::fail("Taxonomy label required");
        }
        if ($kind === "category" && !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $d["slug"])) {
            return Schema::fail("Invalid taxonomy slug");
        }
        if (
            $kind === "category" &&
            $d["kind"] === "type" &&
            !in_array($d["slug"], ["casa", "departamento", "terreno", "local", "oficina"], true) &&
            empty($d["legacyType"])
        ) {
            return Schema::fail("A custom property type needs a compatibility family");
        }
        if (
            $kind === "category" &&
            $d["kind"] === "operation" &&
            !in_array($d["slug"], ["venta", "alquiler"], true)
        ) {
            return Schema::fail("Operation URL keys are reserved");
        }
        if ($kind === "configuration") {
            foreach (
                [
                    "gtm" => "containerId",
                    "ga4" => "measurementId",
                    "googleAds" => "accountId",
                    "meta" => "pixelId",
                    "searchConsole" => "verification",
                ]
                as $integration => $field
            ) {
                if (
                    $d["integrations"][$integration]["enabled"] &&
                    empty($d["integrations"][$integration][$field])
                ) {
                    return Schema::fail("Integration identifier required");
                }
            }
            if ($d["integrations"]["meta"]["serverEventsEnabled"]) {
                return Schema::fail("Server conversions are not configured in this release");
            }
            foreach ($d["filters"] as $filter) {
                $allowed = [
                    "operacion" => ["tabs", "select"],
                    "tipo" => ["select"],
                    "ubicacion" => ["text"],
                    "precioMax" => ["select", "number"],
                    "moneda" => ["select"],
                    "superficieMin" => ["number"],
                    "dormitorios" => ["select", "number"],
                    "banos" => ["select", "number"],
                    "piscina" => ["checkbox"],
                    "caracteristicas" => ["multiselect"],
                    "orden" => ["select"],
                ];
                if (!in_array($filter["presentation"], $allowed[$filter["key"]], true)) {
                    return Schema::fail("Unsupported filter presentation");
                }
                $known = [
                    "operacion" => ["venta", "alquiler"],
                    "moneda" => ["USD", "ARS"],
                    "orden" => ["recientes", "precio-asc", "precio-desc"],
                ];
                if (isset($known[$filter["key"]])) {
                    foreach ($filter["options"] as $option) {
                        if (!in_array($option["value"], $known[$filter["key"]], true)) {
                            return Schema::fail("Unknown compatibility filter value");
                        }
                    }
                }
                if ($filter["key"] === "tipo") {
                    foreach ($filter["options"] as $option) {
                        if (
                            in_array(
                                $option["value"],
                                ["casa", "departamento", "terreno", "local", "oficina"],
                                true,
                            )
                        ) {
                            continue;
                        }
                        $found = false;
                        foreach (Store::list("category", true, 0, 1001) as $category) {
                            $term = Store::document($category);
                            if (
                                $term["kind"] === "type" &&
                                ($term["slug"] === $option["value"] ||
                                    $category["id"] === $option["value"])
                            ) {
                                $found = true;
                            }
                        }
                        if (!$found) {
                            return Schema::fail("Unknown property type filter option");
                        }
                    }
                }
            }
            $keys = array_column($d["filters"], "key");
            if (count($keys) !== count(array_unique($keys))) {
                return Schema::fail("Duplicate filter key");
            }
            foreach ($d["filters"] as $filter) {
                $values = array_column($filter["options"], "value");
                if (count($values) !== count(array_unique($values))) {
                    return Schema::fail("Duplicate filter option");
                }
            }
            $locations = array_column($d["menus"], "location");
            if (count($locations) !== count(array_unique($locations))) {
                return Schema::fail("Duplicate menu location");
            }
            foreach ($d["menus"] as $menu) {
                $ids = array_column($menu["items"], "id");
                if (count($ids) !== count(array_unique($ids))) {
                    return Schema::fail("Duplicate navigation ID");
                }
            }
        }
        if (in_array($kind, ["property", "page", "category"], true) && !empty($d["slug"])) {
            global $wpdb;
            $existing = $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT id FROM " . Store::table() . " WHERE kind=%s AND slug=%s AND id<>%s",
                    $kind,
                    $d["slug"],
                    $old["id"] ?? "",
                ),
            );
            if ($existing) {
                return new \WP_Error("estate_slug_conflict", "Slug already used", [
                    "status" => 409,
                ]);
            }
        }
        return true;
    }
    public function transition(string $kind, $r, string $status)
    {
        $row = $this->current($kind, $r);
        if (is_wp_error($row)) {
            return $row;
        }
        $m = $this->match($r, $row);
        if (is_wp_error($m)) {
            return $m;
        }
        if (
            ($status === "published" || $row["status"] === "published") &&
            !current_user_can("estate_publish_content")
        ) {
            return new \WP_Error("estate_forbidden", "Publishing capability required", [
                "status" => 403,
            ]);
        }
        $d = Store::document($row);
        if (
            $status === "published" &&
            in_array($kind, ["property", "page"], true) &&
            (empty($d["title"]) || empty($d["slug"]))
        ) {
            return Schema::fail("Title and slug required before publishing");
        }
        if ($status === "published" && $kind === "property" && empty($d["images"])) {
            return Schema::fail("A gallery image is required before publishing");
        }
        if (in_array($kind, ["category", "feature"], true) && $status !== "published") {
            foreach (Store::list("property", true, 0, 10001) as $property) {
                $document = Store::document($property);
                if (
                    in_array(
                        $row["id"],
                        $document[$kind === "category" ? "categoryIds" : "featureIds"],
                        true,
                    )
                ) {
                    return new \WP_Error(
                        "estate_reference_in_use",
                        "Published properties reference this taxonomy",
                        ["status" => 409],
                    );
                }
            }
        }
        $semantic = $this->semantics($kind, $d, $row);
        if (is_wp_error($semantic)) {
            return $semantic;
        }
        if ($kind === "page") {
            $d["status"] =
                $status === "published"
                    ? "published"
                    : ($status === "archived"
                        ? "archived"
                        : "draft");
        }
        $saved = Store::save($kind, $d, $status, $row);
        return is_wp_error($saved)
            ? $saved
            : $this->response(
                ["document" => Store::document($saved), "recordStatus" => $status],
                false,
                Store::etag($saved),
            );
    }
    public function duplicate(string $kind, $r)
    {
        $row = $this->current($kind, $r);
        if (is_wp_error($row)) {
            return $row;
        }
        $m = $this->match($r, $row);
        if (is_wp_error($m)) {
            return $m;
        }
        $d = Store::document($row);
        $d["slug"] = ($d["slug"] ?? "copy") . "-" . substr(wp_generate_uuid4(), 0, 8);
        if ($kind === "page") {
            $d["status"] = "draft";
        }
        $new = Store::save($kind, $d, "draft");
        return is_wp_error($new)
            ? $new
            : $this->response(
                ["document" => Store::document($new), "recordStatus" => "draft"],
                false,
                Store::etag($new),
                201,
            );
    }
    private function config(): array
    {
        return Store::document(Store::get("configuration"));
    }
    private function publicDoc(array $row): array
    {
        $d = Store::document($row);
        if ($row["kind"] === "page") {
            $d["sections"] = array_values(
                array_filter(
                    $d["sections"],
                    fn($section) => $section["visible"] &&
                        ($section["responsive"]["mobile"]["visible"] ||
                            $section["responsive"]["desktop"]["visible"]),
                ),
            );
        }
        if ($row["kind"] === "property") {
            $d["amenities"] = [];
            foreach ($d["featureIds"] as $id) {
                $f = Store::get($id);
                if ($f && $f["status"] === "published") {
                    $d["amenities"][] = Store::document($f)["label"];
                }
            }
        }
        return $d;
    }
    public function property($r)
    {
        $row = Store::get((string) ($r->get_url_params()["id"] ?? ""));
        if (
            !$row ||
            $row["kind"] !== "property" ||
            !in_array($row["status"], ["published", "archived"], true)
        ) {
            return new \WP_Error("estate_not_found", "Property unavailable", ["status" => 404]);
        }
        if ($row["status"] === "archived" || Store::document($row)["status"] === "withdrawn") {
            return new \WP_Error("estate_gone", "Property withdrawn", ["status" => 410]);
        }
        return $this->response($this->publicDoc($row), true, Store::etag($row));
    }
    public function read(string $resource, $r)
    {
        $config = $this->config();
        $etag = '"content-' . Store::revision() . '"';
        if ($r->get_header("if-none-match") === $etag) {
            return $this->response(null, true, $etag, 304);
        }
        if ($resource === "configuration") {
            $public = $config;
            foreach ($public["menus"] as &$menu) {
                $menu["items"] = array_values(
                    array_filter($menu["items"], fn($item) => $item["visible"]),
                );
            }
            unset($menu);
            return $this->response($public, true, $etag);
        }
        if ($resource === "taxonomies") {
            return $this->response(
                [
                    "schemaVersion" => 1,
                    "categories" => array_map(
                        fn($x) => $this->publicDoc($x),
                        Store::list("category", true, 0, 1000),
                    ),
                    "features" => array_map(
                        fn($x) => $this->publicDoc($x),
                        Store::list("feature", true, 0, 1000),
                    ),
                    "filters" => $config["filters"],
                ],
                true,
                $etag,
            );
        }
        if ($resource === "pages") {
            global $wpdb;
            $row = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT * FROM " . Store::table() . " WHERE kind=%s AND status=%s AND slug=%s",
                    "page",
                    "published",
                    (string) $r->get_param("slug"),
                ),
                ARRAY_A,
            );
            return $row
                ? $this->response($this->publicDoc($row), true, $etag)
                : new \WP_Error("estate_not_found", "Page not published", ["status" => 404]);
        }
        foreach (
            ["operacion", "tipo", "ubicacion", "moneda", "categoria", "orden", "cursor"]
            as $key
        ) {
            $value = $r->get_param($key);
            if ($value !== null && (!is_string($value) || strlen($value) > 2048)) {
                return Schema::fail("Invalid query parameter: " . $key, 400);
            }
        }
        foreach (["precioMax", "dormitorios", "banos", "superficieMin"] as $key) {
            $value = $r->get_param($key);
            if (
                $value !== null &&
                (!is_numeric($value) || !is_finite((float) $value) || $value < 0)
            ) {
                return Schema::fail("Invalid numeric filter", 400);
            }
        }
        $features = $r->get_param("caracteristicas");
        if (is_string($features)) {
            $features = json_decode($features, true);
        }
        if (
            $r->get_param("caracteristicas") !== null &&
            (!is_array($features) ||
                count($features) > 50 ||
                count(
                    array_filter(
                        $features,
                        fn($value) => is_string($value) &&
                            preg_match('/^[a-zA-Z0-9_-]{1,128}$/', $value),
                    ),
                ) !== count($features))
        ) {
            return Schema::fail("Invalid feature filter", 400);
        }
        $limit =
            $r->get_param("limit") === null
                ? 25
                : filter_var($r->get_param("limit"), FILTER_VALIDATE_INT, [
                    "options" => ["min_range" => 1, "max_range" => 100],
                ]);
        if ($limit === false) {
            return Schema::fail("Limit must be 1..100", 400);
        }
        global $wpdb;
        $budget = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT COUNT(*) AS total, COALESCE(SUM(LENGTH(document)),0) AS bytes FROM " .
                    Store::table() .
                    " WHERE kind=%s AND status=%s",
                "property",
                "published",
            ),
            ARRAY_A,
        );
        if ((int) $budget["total"] > 10000 || (int) $budget["bytes"] > 4000000) {
            return new \WP_Error(
                "estate_catalog_limit",
                "Catalog exceeds the bounded v1 query adapter",
                ["status" => 413],
            );
        }
        $cache = "estate_catalog_" . Store::revision();
        $rows = get_transient($cache);
        if ($rows === false) {
            $rows = Store::list("property", true, 0, 10001);
            set_transient($cache, $rows, 60);
        }
        if (count($rows) > 10000) {
            return new \WP_Error(
                "estate_catalog_limit",
                "Catalog exceeds v1 bounded projection; use a database query adapter",
                ["status" => 413],
            );
        }
        if ($resource === "properties") {
            $offset = 0;
            $cursor = (string) ($r->get_param("cursor") ?? "");
            if ($cursor !== "") {
                $decoded = base64_decode($cursor, true);
                $parts = $decoded === false ? [] : explode(":", $decoded);
                if (count($parts) !== 2 || !ctype_digit($parts[0]) || !ctype_digit($parts[1])) {
                    return Schema::fail("Invalid cursor", 400);
                }
                if ((int) $parts[0] !== Store::revision()) {
                    return new \WP_Error(
                        "estate_cursor_changed",
                        "Catalog changed; restart pagination",
                        ["status" => 409],
                    );
                }
                $offset = (int) $parts[1];
            }
            $documents = [];
            foreach ($rows as $row) {
                $d = $this->publicDoc($row);
                if ($d["status"] !== "withdrawn" && $this->matches($d, $r)) {
                    $documents[] = $d;
                }
            }
            $sort = $r->get_param("orden") ?? "recientes";
            if (!in_array($sort, ["recientes", "precio-asc", "precio-desc"], true)) {
                return Schema::fail("Invalid sort", 400);
            }
            usort($documents, function ($a, $b) use ($sort) {
                if ($sort === "recientes") {
                    return strcmp($b["publishedAt"], $a["publishedAt"]) ?:
                        strcmp($a["id"], $b["id"]);
                }
                if ($a["price"] === null || $b["price"] === null) {
                    return ($a["price"] === null ? 1 : 0) <=> ($b["price"] === null ? 1 : 0);
                }
                $currency = strcmp($a["price"]["currency"], $b["price"]["currency"]);
                if ($currency) {
                    return $currency;
                }
                return $sort === "precio-asc"
                    ? $a["price"]["amount"] <=> $b["price"]["amount"]
                    : $b["price"]["amount"] <=> $a["price"]["amount"];
            });
            $page = array_slice($documents, $offset, $limit);
            return $this->response(
                [
                    "schemaVersion" => 1,
                    "items" => $page,
                    "nextCursor" =>
                        $offset + $limit < count($documents)
                            ? base64_encode(Store::revision() . ":" . ($offset + $limit))
                            : null,
                ],
                true,
                $etag,
            );
        }
        if (count($rows) > 10000) {
            return new \WP_Error("estate_snapshot_limit", "Use paginated resources", [
                "status" => 413,
            ]);
        }
        if (empty($config["team"]["image"])) {
            return new \WP_Error(
                "estate_configuration_incomplete",
                "Configure the institutional image before enabling the legacy snapshot",
                ["status" => 503],
            );
        }
        $properties = [];
        foreach ($rows as $row) {
            $d = $this->publicDoc($row);
            if ($d["status"] === "withdrawn") {
                continue;
            }
            $legacy = array_intersect_key(
                $d,
                array_flip([
                    "id",
                    "slug",
                    "title",
                    "operation",
                    "type",
                    "price",
                    "bedrooms",
                    "bathrooms",
                    "lotArea",
                    "coveredArea",
                    "location",
                    "code",
                    "amenities",
                    "featureIds",
                    "description",
                    "images",
                    "featured",
                    "featuredOrder",
                    "publishedAt",
                    "whatsapp",
                ]),
            );
            if ($d["calendly"]["enabled"] && !empty($d["calendly"]["url"])) {
                $legacy["calendlyUrl"] = $d["calendly"]["url"];
            }
            $properties[] = $legacy;
        }
        $legacyFilters = $config["filters"];
        foreach ($legacyFilters as &$filter) {
            if ($filter["key"] === "tipo") {
                $filter["options"] = array_values(
                    array_filter(
                        $filter["options"],
                        fn($option) => in_array(
                            $option["value"],
                            ["casa", "departamento", "terreno", "local", "oficina"],
                            true,
                        ),
                    ),
                );
            }
        }
        unset($filter);
        $snapshot = [
            "schemaVersion" => 1,
            "revision" => (string) Store::revision(),
            "properties" => $properties,
            "settings" => array_intersect_key(
                $config["site"],
                array_flip(["whatsapp", "email", "phone", "address", "socials"]),
            ),
            "team" => $config["team"],
            "theme" => $config["theme"],
            "filters" => $legacyFilters,
        ];
        if (strlen(wp_json_encode($snapshot)) > 2000000) {
            return new \WP_Error("estate_snapshot_limit", "Use paginated resources", [
                "status" => 413,
            ]);
        }
        return $this->response($snapshot, true, $etag);
    }
    private function matches(array $d, $r): bool
    {
        foreach (
            ["operacion" => "operation", "tipo" => "type", "moneda" => "currency"]
            as $key => $field
        ) {
            $v = $r->get_param($key);
            if (
                $v !== null &&
                $v !== "" &&
                ($key === "moneda" ? $d["price"]["currency"] ?? "" : $d[$field] ?? "") !== $v
            ) {
                if ($key !== "tipo") {
                    return false;
                }
                $term = isset($d["propertyTypeId"]) ? Store::get($d["propertyTypeId"]) : null;
                if (!$term || (Store::document($term)["slug"] !== $v && $term["id"] !== $v)) {
                    return false;
                }
            }
        }
        $location = (string) ($r->get_param("ubicacion") ?? "");
        if (
            $location !== "" &&
            stripos(
                remove_accents($d["title"] . " " . ($d["location"] ?? "")),
                remove_accents($location),
            ) === false
        ) {
            return false;
        }
        foreach (["precioMax", "dormitorios", "banos", "superficieMin"] as $key) {
            $n = $r->get_param($key);
            if ($n === null || $n === "") {
                continue;
            }
            if (!is_numeric($n) || $n < 0) {
                return false;
            }
            if (
                $key === "precioMax" &&
                (!$d["price"] ||
                    $d["price"]["currency"] !== ($r->get_param("moneda") ?? "USD") ||
                    $d["price"]["amount"] > $n)
            ) {
                return false;
            }
            if ($key === "dormitorios" && ($d["bedrooms"] ?? 0) < $n) {
                return false;
            }
            if ($key === "banos" && ($d["bathrooms"] ?? 0) < $n) {
                return false;
            }
            if ($key === "superficieMin" && ($d["coveredArea"] ?? ($d["lotArea"] ?? 0)) < $n) {
                return false;
            }
        }
        if (
            in_array($r->get_param("piscina"), ["true", "1", true], true) &&
            !in_array("feature-pool", $d["featureIds"], true) &&
            !in_array("Piscina", $d["amenities"], true)
        ) {
            return false;
        }
        $features = $r->get_param("caracteristicas");
        if (is_string($features)) {
            $features = json_decode($features, true);
        }
        if ($features !== null) {
            if (!is_array($features) || count($features) > 50) {
                return false;
            }
            foreach ($features as $id) {
                if (!is_string($id) || !in_array($id, $d["featureIds"], true)) {
                    return false;
                }
            }
        }
        $category = $r->get_param("categoria");
        if ($category !== null && !in_array($category, $d["categoryIds"], true)) {
            return false;
        }
        return true;
    }
    public function submission($r)
    {
        if (strlen($r->get_body()) > 16384) {
            return new \WP_Error("estate_size", "Submission too large", ["status" => 413]);
        }
        if (!$this->originAllowed($r->get_header("origin"))) {
            return new \WP_Error("estate_origin", "Origin not authorized", ["status" => 403]);
        }
        $body = $this->body($r);
        if (is_wp_error($body)) {
            return $body;
        }
        $lead = Schema::check("leadSubmissionSchema", $body);
        if (is_wp_error($lead)) {
            return $lead;
        }
        if (!in_array($lead["formId"], ["contact", "publish-property"], true)) {
            return Schema::fail("Unknown form");
        }
        if (!empty($lead["propertyId"])) {
            $property = Store::get($lead["propertyId"]);
            if (
                !$property ||
                $property["kind"] !== "property" ||
                $property["status"] !== "published"
            ) {
                return Schema::fail("Property unavailable");
            }
        }
        $policy = explode(":", $lead["consent"]["privacyRevision"], 2);
        $privacy = Store::get($policy[0]);
        if (
            !$privacy ||
            $privacy["kind"] !== "page" ||
            $privacy["status"] !== "published" ||
            (string) $privacy["revision"] !== ($policy[1] ?? "") ||
            !in_array($privacy["id"], $this->config()["site"]["legalPageIds"], true)
        ) {
            return Schema::fail("An approved published privacy policy revision is required");
        }
        $id = "lead-" . $lead["idempotencyKey"];
        $hash = hash("sha256", wp_json_encode($lead));
        $existing = Store::get($id);
        if ($existing) {
            if (!hash_equals(Store::document($existing)["_requestHash"] ?? "", $hash)) {
                return new \WP_Error(
                    "estate_idempotency_conflict",
                    "Idempotency key already used",
                    ["status" => 409],
                );
            }
            return $this->response(
                [
                    "submissionId" => $id,
                    "status" => "accepted",
                    "notificationStatus" => "not_configured",
                ],
                false,
                null,
                202,
            );
        }
        $ip = $_SERVER["REMOTE_ADDR"] ?? "unknown";
        $bucket =
            "estate_rate_" .
            gmdate("YmdHi") .
            "_" .
            hash_hmac("sha256", $ip . "|minute", wp_salt("nonce"));
        add_option($bucket, 0, "", "no");
        global $wpdb;
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$wpdb->options} SET option_value=CAST(option_value AS UNSIGNED)+1 WHERE option_name=%s",
                $bucket,
            ),
        );
        $hits = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT option_value FROM {$wpdb->options} WHERE option_name=%s",
                $bucket,
            ),
        );
        if ($hits > 5) {
            $response = new \WP_REST_Response(
                ["code" => "estate_rate_limit", "message" => "Please retry later"],
                429,
            );
            $response->header("Retry-After", "60");
            return $response;
        }
        $hour =
            "estate_rate_" .
            gmdate("YmdH") .
            "00_" .
            hash_hmac("sha256", $ip . "|" . $lead["formId"] . "|hour", wp_salt("nonce"));
        add_option($hour, 0, "", "no");
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$wpdb->options} SET option_value=CAST(option_value AS UNSIGNED)+1 WHERE option_name=%s",
                $hour,
            ),
        );
        if (
            (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT option_value FROM {$wpdb->options} WHERE option_name=%s",
                    $hour,
                ),
            ) > 20
        ) {
            return new \WP_Error("estate_rate_limit", "Hourly submission limit reached", [
                "status" => 429,
            ]);
        }
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s AND option_name<%s",
                "estate_rate_%",
                "estate_rate_" . gmdate("YmdHi", time() - 7200),
            ),
        );
        $lead["_requestHash"] = $hash;
        $lead["notificationStatus"] = "not_configured";
        $saved = Store::save("lead", $lead, "new", null, $id);
        if (is_wp_error($saved)) {
            return $saved;
        }
        return $this->response(
            [
                "submissionId" => $id,
                "status" => "accepted",
                "notificationStatus" => "not_configured",
            ],
            false,
            null,
            202,
        );
    }
    private function originAllowed(?string $origin): bool
    {
        if (!$origin) {
            return false;
        }
        $config = $this->config();
        $origins = [];
        foreach ([home_url("/"), $config["site"]["domain"]] as $url) {
            $p = wp_parse_url($url);
            $origins[] =
                ($p["scheme"] ?? "") .
                "://" .
                ($p["host"] ?? "") .
                (isset($p["port"]) ? ":" . $p["port"] : "");
        }
        return in_array($origin, $origins, true);
    }
    public function cors($served, $result, $request, $server)
    {
        if (!str_starts_with($request->get_route(), "/" . self::NS . "/")) {
            return $served;
        }
        header_remove("Access-Control-Allow-Origin");
        header_remove("Access-Control-Allow-Credentials");
        $origin = get_http_origin();
        $private = str_contains($request->get_route(), "/admin/");
        if (!$private && $origin && $this->originAllowed($origin)) {
            header("Access-Control-Allow-Origin: " . $origin);
            header("Vary: Origin", false);
            header("Access-Control-Allow-Headers: Content-Type, If-None-Match");
        }
        return $served;
    }
}
