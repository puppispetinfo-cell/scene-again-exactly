<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Lifecycle
{
    public const CAPS = [
        "estate_edit_properties",
        "estate_edit_content",
        "estate_publish_content",
        "estate_edit_others",
        "estate_manage_settings",
        "estate_manage_integrations",
        "estate_manage_leads",
        "estate_view_audit",
        "estate_view_insights",
    ];
    public static function activate($network_wide = false): void
    {
        if ($network_wide) {
            wp_die("Use independent site installations; network activation is not supported.");
        }
        self::migrate();
    }
    public static function migrate(): void
    {
        if ((int) get_option("estate_schema_version", 0) >= 1) {
            return;
        }
        global $wpdb;
        require_once ABSPATH . "wp-admin/includes/upgrade.php";
        $collate = $wpdb->get_charset_collate();
        dbDelta(
            "CREATE TABLE " .
                $wpdb->prefix .
                "estate_records (
 sequence bigint(20) unsigned NOT NULL AUTO_INCREMENT,
 id varchar(64) NOT NULL,
 kind varchar(20) NOT NULL,
 slug varchar(191) NOT NULL DEFAULT '',
 owner bigint(20) unsigned NOT NULL DEFAULT 0,
 status varchar(20) NOT NULL,
 revision bigint(20) unsigned NOT NULL DEFAULT 1,
 document longtext NOT NULL,
 created_at datetime NOT NULL,
 updated_at datetime NOT NULL,
 PRIMARY KEY  (sequence),
 UNIQUE KEY stable_id (id),
 UNIQUE KEY kind_slug (kind,slug),
 KEY kind_status (kind,status),
 KEY kind_owner (kind,owner)
) $collate;",
        );
        dbDelta(
            "CREATE TABLE " .
                $wpdb->prefix .
                "estate_audit (
 sequence bigint(20) unsigned NOT NULL AUTO_INCREMENT,
 actor bigint(20) unsigned NOT NULL,
 action varchar(30) NOT NULL,
 resource_id varchar(64) NOT NULL,
 revision bigint(20) unsigned NOT NULL,
 status varchar(20) NOT NULL,
 created_at datetime NOT NULL,
 PRIMARY KEY  (sequence)
) $collate;",
        );
        add_option("estate_installation_id", wp_generate_uuid4(), "", "no");
        add_option("estate_content_revision", 1, "", "no");
        $role = get_role("administrator");
        foreach (self::CAPS as $cap) {
            $role->add_cap($cap);
        }
        $roles = [
            "estate_agent" => ["estate_edit_properties"],
            "estate_editor" => ["estate_edit_properties", "estate_edit_content"],
            "estate_publisher" => [
                "estate_edit_properties",
                "estate_edit_content",
                "estate_publish_content",
                "estate_edit_others",
            ],
            "estate_manager" => [
                "estate_manage_leads",
                "estate_edit_others",
                "estate_view_insights",
            ],
        ];
        foreach ($roles as $name => $caps) {
            add_role(
                $name,
                ucwords(str_replace("_", " ", $name)),
                array_fill_keys(
                    array_merge(
                        $name === "estate_manager" ? ["read"] : ["read", "upload_files"],
                        $caps,
                    ),
                    true,
                ),
            );
        }
        $defaults = json_decode(
            file_get_contents(ESTATE_CORE_DIR . "/schemas/defaults.json"),
            true,
        );
        if (!Store::get("configuration")) {
            $config = $defaults["configuration"];
            $profileName = defined("ESTATE_CORE_PROFILE")
                ? sanitize_key(ESTATE_CORE_PROFILE)
                : "rivton";
            $profileFile = ESTATE_CORE_DIR . "/profiles/" . $profileName . ".json";
            $profile = is_file($profileFile)
                ? json_decode(file_get_contents($profileFile), true)
                : ["name" => get_option("blogname")];
            $config["site"]["name"] = $profile["name"];
            $config["site"]["domain"] = home_url("/");
            $config["site"]["id"] = get_option("estate_installation_id");
            $config["id"] = "configuration";
            $config["revision"] = 1;
            $wpdb->insert(Store::table(), [
                "id" => "configuration",
                "kind" => "configuration",
                "slug" => "configuration",
                "owner" => get_current_user_id(),
                "status" => "published",
                "revision" => 1,
                "document" => wp_json_encode($config),
                "created_at" => gmdate("Y-m-d H:i:s"),
                "updated_at" => gmdate("Y-m-d H:i:s"),
            ]);
        }
        foreach (
            [
                "venta" => "Venta",
                "alquiler" => "Alquiler",
                "casa" => "Casa",
                "departamento" => "Departamento",
                "terreno" => "Terreno",
                "local" => "Local",
                "oficina" => "Oficina",
            ]
            as $slug => $label
        ) {
            $id = "category-" . $slug;
            if (Store::get($id)) {
                continue;
            }
            $doc = array_merge($defaults["category"], [
                "id" => $id,
                "revision" => 1,
                "slug" => $slug,
                "label" => $label,
                "kind" => in_array($slug, ["venta", "alquiler"], true) ? "operation" : "type",
            ]);
            $wpdb->insert(Store::table(), [
                "id" => $id,
                "kind" => "category",
                "slug" => $slug,
                "owner" => get_current_user_id(),
                "status" => "published",
                "revision" => 1,
                "document" => wp_json_encode($doc),
                "created_at" => gmdate("Y-m-d H:i:s"),
                "updated_at" => gmdate("Y-m-d H:i:s"),
            ]);
        }
        if (!Store::get("feature-pool")) {
            $doc = array_merge($defaults["feature"], [
                "id" => "feature-pool",
                "revision" => 1,
                "label" => "Piscina",
            ]);
            $wpdb->insert(Store::table(), [
                "id" => "feature-pool",
                "kind" => "feature",
                "slug" => "feature-pool",
                "owner" => get_current_user_id(),
                "status" => "published",
                "revision" => 1,
                "document" => wp_json_encode($doc),
                "created_at" => gmdate("Y-m-d H:i:s"),
                "updated_at" => gmdate("Y-m-d H:i:s"),
            ]);
        }
        foreach (
            [
                "home" => ["/", "Home"],
                "about" => ["nosotros", "Nosotros"],
                "contact" => ["contacto", "Contacto"],
                "publish" => ["publicar", "Publicar"],
                "faq" => ["preguntas-frecuentes", "Preguntas frecuentes"],
                "privacy" => ["privacidad", "Política de privacidad"],
                "terms" => ["terminos", "Términos y condiciones"],
                "cookies" => ["cookies", "Cookies"],
            ]
            as $key => $page
        ) {
            $id = "page-" . $key;
            if (Store::get($id)) {
                continue;
            }
            $doc = array_merge($defaults["page"], [
                "id" => $id,
                "revision" => 1,
                "slug" => $page[0],
                "title" => $page[1],
            ]);
            $wpdb->insert(Store::table(), [
                "id" => $id,
                "kind" => "page",
                "slug" => $page[0],
                "owner" => get_current_user_id(),
                "status" => "draft",
                "revision" => 1,
                "document" => wp_json_encode($doc),
                "created_at" => gmdate("Y-m-d H:i:s"),
                "updated_at" => gmdate("Y-m-d H:i:s"),
            ]);
        }
        update_option("estate_schema_version", 1, false);
    }
}
