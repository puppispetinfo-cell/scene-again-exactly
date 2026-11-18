<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Workspace
{
    public static function migrate(): void
    {
        if ((int) get_option("estate_schema_version", 0) >= 3) {
            return;
        }
        global $wpdb;
        require_once ABSPATH . "wp-admin/includes/upgrade.php";
        $collate = $wpdb->get_charset_collate();
        dbDelta("CREATE TABLE {$wpdb->prefix}estate_revisions (
 sequence bigint(20) unsigned NOT NULL AUTO_INCREMENT,
 resource_id varchar(64) NOT NULL,
 revision bigint(20) unsigned NOT NULL,
 actor bigint(20) unsigned NOT NULL,
 status varchar(20) NOT NULL,
 document longtext NOT NULL,
 created_at datetime NOT NULL,
 PRIMARY KEY  (sequence),
 UNIQUE KEY resource_revision (resource_id,revision)
) $collate;");
        dbDelta("CREATE TABLE {$wpdb->prefix}estate_drafts (
 resource_id varchar(64) NOT NULL,
 base_revision bigint(20) unsigned NOT NULL,
 revision bigint(20) unsigned NOT NULL,
 actor bigint(20) unsigned NOT NULL,
 document longtext NOT NULL,
 updated_at datetime NOT NULL,
 PRIMARY KEY  (resource_id)
) $collate;");
        dbDelta("CREATE TABLE {$wpdb->prefix}estate_draft_versions (
 sequence bigint(20) unsigned NOT NULL AUTO_INCREMENT,
 resource_id varchar(64) NOT NULL,
 actor bigint(20) unsigned NOT NULL,
 document longtext NOT NULL,
 created_at datetime NOT NULL,
 PRIMARY KEY  (sequence),
 KEY resource_id (resource_id)
) $collate;");
        $after = 0;
        do {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM " .
                        Store::table() .
                        " WHERE sequence>%d ORDER BY sequence LIMIT 100",
                    $after,
                ),
                ARRAY_A,
            );
            foreach ($rows as $row) {
                self::capture($row);
                $after = (int) $row["sequence"];
            }
        } while (count($rows) === 100);
        update_option("estate_schema_version", 3, false);
    }
    public static function capture(array $row): bool
    {
        if ($row["kind"] === "lead") {
            return true;
        }
        global $wpdb;
        $exists = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT sequence FROM {$wpdb->prefix}estate_revisions WHERE resource_id=%s AND revision=%d",
                $row["id"],
                $row["revision"],
            ),
        );
        if ($exists) {
            return true;
        }
        return (bool) $wpdb->insert($wpdb->prefix . "estate_revisions", [
            "resource_id" => $row["id"],
            "revision" => $row["revision"],
            "actor" => get_current_user_id(),
            "status" => $row["status"],
            "document" => $row["document"],
            "created_at" => gmdate("Y-m-d H:i:s"),
        ]);
    }
    public static function pending(string $id): ?array
    {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$wpdb->prefix}estate_drafts WHERE resource_id=%s", $id),
            ARRAY_A,
        );
    }
    public static function save(?array $row, array $document, $request)
    {
        if (!$row) {
            return Schema::fail("Create the record before saving a workspace");
        }
        global $wpdb;
        $old = self::pending($row["id"]);
        $expected = (int) $request->get_header("x-draft-revision");
        if ($old && (int) $old["base_revision"] !== (int) $row["revision"]) {
            return new \WP_Error(
                "estate_base_conflict",
                "La publicación cambió desde este borrador. Revisá el historial y descartá o conciliá la versión anterior.",
                ["status" => 412],
            );
        }
        if ($expected !== (int) ($old["revision"] ?? 0)) {
            return new \WP_Error(
                "estate_draft_conflict",
                "El borrador cambió. Recargá antes de guardar.",
                ["status" => 412],
            );
        }
        $data = [
            "base_revision" => (int) $row["revision"],
            "revision" => $expected + 1,
            "actor" => get_current_user_id(),
            "document" => wp_json_encode($document),
            "updated_at" => gmdate("Y-m-d H:i:s"),
        ];
        $wpdb->query("START TRANSACTION");
        $ok = $old
            ? $wpdb->update($wpdb->prefix . "estate_drafts", $data, [
                "resource_id" => $row["id"],
                "revision" => $expected,
            ])
            : $wpdb->insert(
                $wpdb->prefix . "estate_drafts",
                array_merge(["resource_id" => $row["id"]], $data),
            );
        if (!$ok || !Store::audit("draft", $row["id"], $data["revision"], "draft")) {
            $wpdb->query("ROLLBACK");
            return new \WP_Error(
                "estate_draft_conflict",
                "No se guardó el borrador. Recargá y reintentá.",
                ["status" => 412],
            );
        }
        if (
            !$wpdb->insert($wpdb->prefix . "estate_draft_versions", [
                "resource_id" => $row["id"],
                "actor" => get_current_user_id(),
                "document" => wp_json_encode($document),
                "created_at" => gmdate("Y-m-d H:i:s"),
            ])
        ) {
            $wpdb->query("ROLLBACK");
            return Schema::fail("No se pudo conservar la versión de borrador", 503);
        }
        $wpdb->query("COMMIT");
        return self::response($row);
    }
    public static function response(array $row)
    {
        $draft = self::pending($row["id"]);
        $response = new \WP_REST_Response(
            [
                "schemaVersion" => 1,
                "document" => $draft
                    ? json_decode($draft["document"], true)
                    : Store::document($row),
                "recordStatus" => $row["status"],
                "draftRevision" => (int) ($draft["revision"] ?? 0),
                "baseRevision" => (int) ($draft["base_revision"] ?? $row["revision"]),
                "hasDraft" => (bool) $draft,
                "preview" => ["mode" => "representative", "reactConnected" => false],
            ],
            200,
        );
        $response->header("Cache-Control", "no-store");
        $response->header("ETag", Store::etag($row));
        return $response;
    }
    public static function history(array $row, $after = 0): array
    {
        global $wpdb;
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT sequence,revision,actor,status,created_at,'live' AS source FROM {$wpdb->prefix}estate_revisions WHERE resource_id=%s AND sequence>%d ORDER BY sequence LIMIT 100",
                $row["id"],
                absint($after),
            ),
            ARRAY_A,
        );
    }
    public static function draftHistory(array $row): array
    {
        global $wpdb;
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT sequence,sequence AS revision,actor,'draft' AS status,created_at,'draft' AS source FROM {$wpdb->prefix}estate_draft_versions WHERE resource_id=%s ORDER BY sequence DESC LIMIT 100",
                $row["id"],
            ),
            ARRAY_A,
        );
    }
    public static function historical(array $row, int $revision, string $source = "live"): ?array
    {
        global $wpdb;
        if ($source === "draft") {
            return $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT * FROM {$wpdb->prefix}estate_draft_versions WHERE resource_id=%s AND sequence=%d",
                    $row["id"],
                    $revision,
                ),
                ARRAY_A,
            );
        }
        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}estate_revisions WHERE resource_id=%s AND revision=%d",
                $row["id"],
                $revision,
            ),
            ARRAY_A,
        );
    }
}
