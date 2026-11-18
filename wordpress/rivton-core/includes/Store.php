<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Store
{
    public static bool $batch = false;
    public static function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . "estate_records";
    }
    public static function revision(): int
    {
        return (int) get_option("estate_content_revision", 1);
    }
    public static function invalidate(): void
    {
        global $wpdb;
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$wpdb->options} SET option_value=CAST(option_value AS UNSIGNED)+1 WHERE option_name=%s",
                "estate_content_revision",
            ),
        );
        wp_cache_delete("estate_content_revision", "options");
    }
    public static function get(string $id)
    {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM " . self::table() . " WHERE id=%s", $id),
            ARRAY_A,
        );
    }
    public static function list(
        string $kind,
        bool $public = false,
        int $after = 0,
        int $limit = 50,
    ): array {
        global $wpdb;
        $sql = "SELECT * FROM " . self::table() . " WHERE kind=%s AND sequence>%d";
        $args = [$kind, $after];
        if ($public) {
            $sql .= " AND status=%s";
            $args[] = "published";
        } elseif (
            !current_user_can("estate_edit_others") &&
            in_array($kind, ["property", "page", "team", "lead"], true)
        ) {
            $sql .= " AND owner=%d";
            $args[] = get_current_user_id();
        }
        $sql .= " ORDER BY sequence ASC LIMIT %d";
        $args[] = $limit;
        return $wpdb->get_results($wpdb->prepare($sql, $args), ARRAY_A);
    }
    public static function document(array $row): array
    {
        return json_decode($row["document"], true) ?: [];
    }
    public static function etag(array $row): string
    {
        return '"' . $row["id"] . ":" . $row["revision"] . '"';
    }
    public static function save(
        string $kind,
        array $document,
        string $status = "draft",
        ?array $old = null,
        ?string $newId = null,
    ) {
        global $wpdb;
        if (
            !in_array(
                $status,
                [
                    "draft",
                    "published",
                    "archived",
                    "trash",
                    "new",
                    "assigned",
                    "contacted",
                    "closed",
                ],
                true,
            )
        ) {
            return Schema::fail("Invalid record status");
        }
        $id = $old["id"] ?? ($newId ?? wp_generate_uuid4());
        $rev = $old ? (int) $old["revision"] + 1 : 1;
        $document["id"] = $id;
        $document["schemaVersion"] = 1;
        $document["revision"] = $rev;
        $row = [
            "id" => $id,
            "kind" => $kind,
            "slug" => $document["slug"] ?? $id,
            "owner" => $old ? (int) $old["owner"] : get_current_user_id(),
            "status" => $status,
            "revision" => $rev,
            "document" => wp_json_encode($document),
            "updated_at" => gmdate("Y-m-d H:i:s"),
        ];
        if (!self::$batch) {
            $wpdb->query("START TRANSACTION");
        }
        if ($old) {
            $ok = $wpdb->update(self::table(), $row, [
                "id" => $id,
                "revision" => (int) $old["revision"],
            ]);
            if (!$ok) {
                $wpdb->query("ROLLBACK");
                return new \WP_Error(
                    "estate_conflict",
                    "The record changed. Reload before saving.",
                    ["status" => 412],
                );
            }
        } else {
            $row["created_at"] = $row["updated_at"];
            if (!$wpdb->insert(self::table(), $row)) {
                $wpdb->query("ROLLBACK");
                return new \WP_Error("estate_storage", "Could not save record", ["status" => 503]);
            }
        }
        if (!Workspace::capture($row)) {
            $wpdb->query("ROLLBACK");
            return new \WP_Error("estate_storage", "Revision persistence failed", [
                "status" => 503,
            ]);
        }
        if (!self::audit($old ? "update" : "create", $id, $rev, $status)) {
            $wpdb->query("ROLLBACK");
            return new \WP_Error("estate_storage", "Audit persistence failed", ["status" => 503]);
        }
        if (
            $kind !== "lead" &&
            ($status === "published" || ($old["status"] ?? "") === "published")
        ) {
            self::invalidate();
        }
        if (!self::$batch) {
            $wpdb->query("COMMIT");
        }
        return self::get($id);
    }
    public static function audit(string $action, string $id, int $revision, string $status): bool
    {
        global $wpdb;
        return (bool) $wpdb->insert($wpdb->prefix . "estate_audit", [
            "actor" => get_current_user_id(),
            "action" => $action,
            "resource_id" => $id,
            "revision" => $revision,
            "status" => $status,
            "created_at" => gmdate("Y-m-d H:i:s"),
        ]);
    }
    public static function can(array $row, string $action = "edit"): bool
    {
        $cap =
            [
                "property" => "estate_edit_properties",
                "page" => "estate_edit_content",
                "lead" => "estate_manage_leads",
                "category" => "estate_manage_settings",
                "feature" => "estate_manage_settings",
                "configuration" => "estate_manage_settings",
                "location" => "estate_manage_settings",
                "team" => "estate_edit_content",
            ][$row["kind"]] ?? "do_not_allow";
        return current_user_can($cap) &&
            ((int) $row["owner"] === get_current_user_id() ||
                current_user_can("estate_edit_others") ||
                in_array($row["kind"], ["category", "feature", "location", "configuration"], true));
    }
}
