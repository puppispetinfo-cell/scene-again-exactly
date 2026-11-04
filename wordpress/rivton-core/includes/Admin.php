<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Admin
{
    public function __construct()
    {
        add_action("admin_menu", [$this, "menu"]);
        add_action("admin_enqueue_scripts", [$this, "assets"]);
        add_filter("wp_handle_upload_prefilter", [$this, "upload"]);
        add_filter("wp_handle_sideload_prefilter", [$this, "upload"]);
    }
    public function menu(): void
    {
        add_menu_page(
            "RIVTON Core",
            "RIVTON Core",
            "read",
            "estate-core",
            [$this, "screen"],
            "dashicons-building",
            30,
        );
        add_submenu_page(
            "estate-core",
            "Auditoría",
            "Auditoría",
            "estate_view_audit",
            "estate-core-audit",
            [$this, "audit"],
        );
    }
    public function assets($hook): void
    {
        if ($hook !== "toplevel_page_estate-core") {
            return;
        }
        wp_enqueue_media();
        wp_enqueue_script(
            "estate-core-admin",
            plugins_url("../assets/admin.js", __FILE__),
            [],
            ESTATE_CORE_VERSION,
            true,
        );
        wp_enqueue_style(
            "estate-core-admin",
            plugins_url("../assets/admin.css", __FILE__),
            [],
            ESTATE_CORE_VERSION,
        );
        $caps = [];
        foreach (Lifecycle::CAPS as $cap) {
            $caps[$cap] = current_user_can($cap);
        }
        $data = [
            "api" => rest_url(Rest::NS . "/"),
            "nonce" => wp_create_nonce("wp_rest"),
            "schemas" => Schema::all(),
            "defaults" => json_decode(
                file_get_contents(ESTATE_CORE_DIR . "/schemas/defaults.json"),
                true,
            ),
            "caps" => $caps,
        ];
        wp_add_inline_script(
            "estate-core-admin",
            "window.EstateCoreAdmin=" .
                wp_json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) .
                ";",
            "before",
        );
    }
    public function screen(): void
    {
        if (!current_user_can("read")) {
            wp_die(esc_html__("Access denied", "estate-core"));
        }
        echo '<div class="wrap"><h1>RIVTON Core</h1><p>Administración de contenido. React no está conectado todavía. Las notificaciones por email y las integraciones externas no están configuradas.</p><div id="estate-core-admin"></div></div>';
    }
    public function audit(): void
    {
        if (!current_user_can("estate_view_audit")) {
            wp_die(esc_html__("Access denied", "estate-core"));
        }
        global $wpdb;
        $after = isset($_GET["after"]) ? absint($_GET["after"]) : 0;
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM " .
                    $wpdb->prefix .
                    "estate_audit WHERE sequence>%d ORDER BY sequence ASC LIMIT 100",
                $after,
            ),
            ARRAY_A,
        );
        echo '<div class="wrap"><h1>Auditoría</h1><p>Registro de acciones, sin contenido de consultas ni credenciales.</p><table class="widefat"><thead><tr>';
        foreach (["Actor", "Acción", "Recurso", "Revisión", "Estado", "Fecha UTC"] as $label) {
            echo '<th scope="col">' . esc_html($label) . "</th>";
        }
        echo "</tr></thead><tbody>";
        foreach ($rows as $row) {
            echo "<tr>";
            foreach (
                ["actor", "action", "resource_id", "revision", "status", "created_at"]
                as $key
            ) {
                echo "<td>" . esc_html((string) $row[$key]) . "</td>";
            }
            echo "</tr>";
        }
        echo "</tbody></table>";
        if (count($rows) === 100) {
            echo '<a class="button" href="' .
                esc_url(
                    add_query_arg(
                        ["page" => "estate-core-audit", "after" => end($rows)["sequence"]],
                        admin_url("admin.php"),
                    ),
                ) .
                '">Siguientes registros</a>';
        }
        echo "</div>";
    }
    public function upload(array $file): array
    {
        if (
            !current_user_can("estate_edit_properties") &&
            !current_user_can("estate_edit_content") &&
            !current_user_can("estate_manage_settings")
        ) {
            return $file;
        }
        $ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
        if (
            !in_array($ext, ["jpg", "jpeg", "png", "webp", "avif", "mp4"], true) ||
            $file["size"] > 10 * 1024 * 1024
        ) {
            $file["error"] = "Only JPG, PNG, WebP, AVIF or MP4 up to 10 MB are allowed.";
        }
        // WordPress subsequently checks actual MIME/file contents and upload permissions.
        return $file;
    }
}
