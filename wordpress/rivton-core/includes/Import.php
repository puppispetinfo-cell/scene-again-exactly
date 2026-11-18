<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Import
{
    private static function hash(array $d): string
    {
        unset($d["revision"], $d["updatedAt"]);
        return hash("sha256", wp_json_encode($d));
    }
    public static function request(string $action, $q)
    {
        if (strlen($q->get_body()) > 131072) {
            return Schema::fail("Archivo demasiado grande", 413);
        }
        $b = $q->get_json_params() ?? [];
        if (!is_array($b)) {
            return Schema::fail("JSON inválido");
        }
        if ($action === "preview") {
            return self::preview($b["intake"] ?? null);
        }
        if ($action === "apply") {
            return self::apply((string) ($b["token"] ?? ""), ($b["approved"] ?? false) === true);
        }
        return self::rollback((string) ($b["reportId"] ?? ""), ($b["approved"] ?? false) === true);
    }
    public static function preview($intake = null)
    {
        $intake = $intake ?? (require ESTATE_CORE_DIR . "/profiles/rivton-intake.php");
        if (
            !is_array($intake) ||
            ($intake["schema"] ?? "") !== "rivton-client-intake-v1" ||
            !is_array($intake["approved_business_data"] ?? null)
        ) {
            return Schema::fail("Esquema de relevamiento no admitido");
        }
        $a = $intake["approved_business_data"];
        foreach (
            ["commercial_name", "tagline_proposed", "founded_context", "tone", "coverage"]
            as $field
        ) {
            if (!is_string($a[$field] ?? null) || !trim($a[$field])) {
                return Schema::fail("Falta " . $field);
            }
        }
        foreach (
            ["services", "values", "differentiators", "team_names", "property_types"]
            as $field
        ) {
            if (
                !is_array($a[$field] ?? null) ||
                count($a[$field]) > 30 ||
                array_filter($a[$field], fn($v) => !is_string($v) || strlen($v) > 500)
            ) {
                return Schema::fail("Lista inválida: " . $field);
            }
        }
        $contact = $a["contact"] ?? [];
        if (
            !is_email($contact["public_email"] ?? "") ||
            !preg_match('/^\d{6,20}$/', $contact["whatsapp_e164_digits"] ?? "") ||
            !Schema::url($contact["instagram"] ?? "")
        ) {
            return Schema::fail("Contacto inválido");
        }
        $map = self::mapping($a);
        $plan = [];
        $last = get_option("estate_import_baselines", []);
        foreach ($map as $id => $entry) {
            $old = Store::get($id);
            $doc = self::resolved($entry["document"]);
            $schema = [
                "configuration" => "configurationSchema",
                "page" => "pageDefinitionSchema",
                "category" => "propertyCategorySchema",
                "feature" => "propertyFeatureSchema",
                "team" => "teamMemberSchema",
                "location" => "locationSchema",
            ][$entry["kind"]];
            $checked = Schema::check($schema, $doc);
            if (is_wp_error($checked)) {
                return $checked;
            }
            $entry["document"] = $checked;
            $entry["expectedRevision"] = $old ? (int) $old["revision"] : 0;
            $current = $old ? self::hash(Store::document($old)) : null;
            $empty = $old && $entry["kind"] === "page" && empty(Store::document($old)["sections"]);
            $untouched = $old && isset($last[$id]) && $last[$id] === $current;
            $same =
                $old && $old["status"] === $entry["status"] && $current === self::hash($checked);
            $seedTaxonomy =
                $old &&
                (int) $old["revision"] === 1 &&
                ($entry["kind"] === "category" ||
                    ($id === "feature-pool" &&
                        $entry["kind"] === "feature" &&
                        (Store::document($old)["label"] ?? "") === "Piscina" &&
                        !isset($last[$id])));
            $configInitial =
                $old &&
                $entry["kind"] === "configuration" &&
                !isset($last[$id]) &&
                empty(Store::document($old)["site"]["whatsapp"]) &&
                empty(Store::document($old)["site"]["email"]);
            $entry["decision"] = $same
                ? "unchanged"
                : (!$old || $empty || $untouched || $seedTaxonomy || $configInitial
                    ? "ready"
                    : "conflict");
            $entry["backup"] = $old;
            $plan[$id] = $entry;
        }
        $token = wp_generate_uuid4();
        set_transient(
            "estate_import_" . hash("sha256", $token),
            ["actor" => get_current_user_id(), "plan" => $plan],
            900,
        );
        $items = [];
        foreach ($plan as $id => $item) {
            $items[] = [
                "id" => $id,
                "kind" => $item["kind"],
                "label" =>
                    $item["document"]["title"] ??
                    ($item["document"]["label"] ??
                        ($item["document"]["name"] ?? "Identidad y contacto")),
                "decision" => $item["decision"],
                "classification" => $item["classification"],
                "status" => $item["status"],
                "document" => $item["document"],
            ];
        }
        $r = new \WP_REST_Response(
            [
                "token" => $token,
                "expiresIn" => 900,
                "items" => $items,
                "missing" => $intake["pending_or_not_confirmed"] ?? [],
                "notice" =>
                    "La importación no publica textos editoriales. Los conflictos no se sobrescriben.",
            ],
            200,
        );
        $r->header("Cache-Control", "no-store");
        return $r;
    }
    private static function mapping(array $a): array
    {
        $defaults = json_decode(
            file_get_contents(ESTATE_CORE_DIR . "/schemas/defaults.json"),
            true,
        );
        $map = [];
        $add = function ($kind, $id, $d, $status = "draft", $classification = "proposed") use (
            &$map,
        ) {
            $d["id"] = $id;
            $d["schemaVersion"] = 1;
            $d["revision"] = 0;
            $d["extensions"] = $d["extensions"] ?? [];
            $map[$id] = [
                "kind" => $kind,
                "document" => $d,
                "status" => $status,
                "classification" => $classification,
            ];
        };
        $config = Store::document(Store::get("configuration"));
        $config["site"]["name"] = $a["commercial_name"];
        $config["site"]["whatsapp"] = $a["contact"]["whatsapp_e164_digits"];
        $config["site"]["email"] = $a["contact"]["public_email"];
        $config["site"]["address"] =
            $a["contact"]["office_address"] . ", Córdoba Capital, Argentina";
        $config["site"]["socials"] = [
            ["label" => "Instagram", "url" => $a["contact"]["instagram"]],
        ];
        unset($config["site"]["phone"]);
        if (empty($config["team"]["image"])) {
            $config["team"]["image"] = self::profileMedia("team.jpg");
        }
        if (empty($config["team"]["title"])) {
            $config["team"]["title"] = "Conocé RIVTON Group.";
        }
        if (empty($config["team"]["body"])) {
            $config["team"]["body"] =
                "Somos un equipo de profesionales dedicados a la comercialización de propiedades en Córdoba, con una mirada cercana y estratégica en cada operación.";
        }
        foreach ($config["filters"] as &$filter) {
            $source =
                [
                    "operacion" => "operations",
                    "tipo" => "types",
                    "ubicacion" => "cities",
                    "caracteristicas" => "features",
                ][$filter["key"]] ?? null;
            if ($source) {
                $filter["source"] = $source;
            }
        }
        unset($filter);
        $baseMenu = [
            ["/", "Inicio", "home"],
            ["/propiedades", "Explorar propiedades", "search"],
            ["/favoritos", "Favoritos", "heart"],
            ["/publicar", "Publicá tu propiedad", "publish"],
            ["/nosotros", "Nosotros", "users"],
            ["/contacto", "Contacto", "mail"],
        ];
        foreach ($config["menus"] as &$menu) {
            if ($menu["items"]) {
                continue;
            }
            $entries =
                $menu["location"] === "dock"
                    ? array_slice($baseMenu, 0, 4)
                    : ($menu["location"] === "mobile"
                        ? $baseMenu
                        : array_slice($baseMenu, 1));
            foreach ($entries as $i => $entry) {
                $label = $entry[1];
                if ($menu["location"] === "header") {
                    $label = str_replace(" propiedades", "", $label);
                }
                if ($menu["location"] === "dock") {
                    $label = ["Inicio", "Explorar", "Favoritos", "Publicar"][$i];
                }
                $menu["items"][] = [
                    "id" => $menu["id"] . "-item-" . $i,
                    "label" => $label,
                    "href" => $entry[0],
                    "newWindow" => false,
                    "icon" => $entry[2],
                    "visible" => true,
                    "order" => $i,
                ];
            }
            if ($menu["location"] !== "dock") {
                $menu["items"][] = [
                    "id" => $menu["id"] . "-temporarios",
                    "label" => "Temporarios",
                    "href" => "https://temporar.com.ar",
                    "newWindow" => true,
                    "icon" => "external",
                    "visible" => true,
                    "order" => count($menu["items"]),
                ];
            }
        }
        unset($menu);
        if (!$config["site"]["footerText"]) {
            $config["site"]["footerText"] = "Propiedades con criterio, en Córdoba.";
        }
        $config["company"] = [
            "presentation" => $a["tagline_proposed"],
            "history" => $a["founded_context"],
            "tone" => $a["tone"],
            "pillars" => $a["differentiators"],
            "values" => $a["values"],
            "services" => $a["services"],
            "coverage" => $a["coverage"],
            "hours" => $a["contact"]["hours"],
        ];
        $config["forms"] = [
            "leadStorageApproved" => false,
            "privacyReviewed" => false,
            "propertyMessage" =>
                "Hola RIVTON Group. Me interesa {propertyTitle} ({propertyCode}). Mi nombre es {name}. {message}. Horario preferido: {preferredTime}.",
            "ownerMessage" =>
                "Hola RIVTON Group. Quiero publicar un inmueble. Nombre: {name}. Tipo: {propertyType}. Ubicación: {location}. Operación: {operation}. {description}",
            "successMessage" =>
                "Se abrirá WhatsApp con tu consulta preparada. Revisá el mensaje y envialo para contactar a RIVTON.",
            "preferredChannel" => "whatsapp",
            "propertyFields" => [
                "name",
                "phone",
                "email",
                "message",
                "propertyId",
                "preferredTime",
            ],
            "ownerFields" => [
                "name",
                "phone",
                "email",
                "propertyType",
                "location",
                "operation",
                "description",
            ],
        ];
        $add("configuration", "configuration", $config, "published", "confirmed");
        $types = [
            "casa" => ["Casas", "casa"],
            "departamento" => ["Departamentos", "departamento"],
            "terreno" => ["Terrenos", "terreno"],
            "local" => ["Locales comerciales", "local"],
            "oficina" => ["Oficinas", "oficina"],
            "galpon" => ["Galpones", "local"],
            "complejo" => ["Complejos", "casa"],
            "fondo-de-comercio" => ["Fondos de comercio", "local"],
            "cochera" => ["Cocheras", "local"],
        ];
        $order = 0;
        foreach ($types as $slug => $type) {
            $d = $defaults["category"];
            $d = array_merge($d, [
                "slug" => $slug,
                "label" => $type[0],
                "kind" => "type",
                "legacyType" => $type[1],
                "order" => $order++,
                "visible" => true,
            ]);
            $add("category", "category-" . $slug, $d, "published", "confirmed");
        }
        foreach (["venta" => "Venta", "alquiler" => "Alquiler"] as $slug => $label) {
            $d = array_merge($defaults["category"], [
                "slug" => $slug,
                "label" => $label,
                "kind" => "operation",
                "visible" => true,
            ]);
            $add("category", "category-" . $slug, $d, "published", "confirmed");
        }
        $add(
            "location",
            "geo-cordoba",
            array_merge($defaults["location"], [
                "name" => "Córdoba",
                "slug" => "cordoba",
                "level" => "province",
                "active" => true,
            ]),
            "published",
            "confirmed",
        );
        foreach ($a["team_names"] as $i => $name) {
            $id = "team-" . sanitize_title($name);
            $add(
                "team",
                $id,
                array_merge($defaults["team"], ["name" => $name, "order" => $i]),
                "draft",
                "confirmed",
            );
        }
        foreach (
            [
                "pool" => ["Pileta", "pool"],
                "quincho" => ["Quincho", "building"],
                "security" => ["Seguridad", "security"],
                "sum" => ["SUM", "building"],
                "gym" => ["Gimnasio", "gym"],
                "terrace" => ["Terraza", "sun"],
                "balcony" => ["Balcón", "balcony"],
                "garden" => ["Jardín", "garden"],
            ]
            as $key => $v
        ) {
            $add(
                "feature",
                "feature-" . $key,
                array_merge($defaults["feature"], [
                    "label" => $v[0],
                    "icon" => $v[1],
                    "valueType" => "boolean",
                    "group" => "amenity",
                ]),
                "published",
                "initial-editable",
            );
        }
        foreach (
            [
                "bedrooms" => ["Dormitorios", "bed", "number"],
                "bathrooms" => ["Baños", "bath", "number"],
                "area" => ["Superficie", "area", "number"],
                "age" => ["Antigüedad", "home", "number"],
                "garage" => ["Cochera", "car", "number"],
                "rooms" => ["Ambientes", "home", "number"],
                "orientation" => ["Orientación", "sun", "select"],
            ]
            as $key => $v
        ) {
            $d = array_merge($defaults["feature"], [
                "label" => $v[0],
                "icon" => $v[1],
                "valueType" => $v[2],
                "group" => "structural",
            ]);
            if ($key === "orientation") {
                $d["options"] = ["Norte", "Sur", "Este", "Oeste"];
            }
            $add("feature", "feature-" . $key, $d, "published", "initial-editable");
        }
        $section = function ($type, $label, $title, $body = "") use ($defaults) {
            return array_merge($defaults["section"], [
                "id" => "section-" . sanitize_title($label),
                "type" => $type,
                "label" => $label,
                "content" => ["title" => $title, "body" => $body],
            ]);
        };
        $home = [];
        $story = $section(
            "story",
            "Escenas de inicio",
            'Encontrá\ntu propiedad.',
            "Propiedades seleccionadas para cada etapa de tu vida.",
        );
        $story["content"]["title"] = "Encontrá\ntu propiedad.";
        $scenes = [
            [
                "hero-house.jpg",
                "Encontrá\ntu propiedad.",
                "Propiedades seleccionadas para cada etapa de tu vida.",
            ],
            [
                "interior-living.jpg",
                "Otra forma\nde habitar.",
                "Espacios que se sienten propios.\nDesde el primer momento.",
            ],
            [
                "terrace-garden.jpg",
                "Tu espacio.\nTu próxima etapa.",
                "Un lugar para disfrutar.\nUna nueva forma de vivir.",
            ],
        ];
        foreach ($scenes as $i => $scene) {
            $media = self::profileMedia($scene[0]);
            $story["scenes"][] = [
                "id" => "scene-" . ($i + 1),
                "schemaVersion" => 1,
                "revision" => 0,
                "extensions" => [],
                "title" => $scene[1],
                "subtitle" => $scene[2],
                "media" => $media,
                "layout" => [
                    "focalX" => 50,
                    "focalY" => 50,
                    "overlay" => 0.35,
                    "transition" => 0.5,
                ],
                "overrides" => [],
                "visible" => true,
            ];
        }
        $story["scenes"][1]["actions"] = [
            [
                "id" => "scene-action-2",
                "label" => "Encontrá tu lugar",
                "href" => "/propiedades",
                "newWindow" => false,
            ],
        ];
        $story["scenes"][2]["actions"] = [
            [
                "id" => "scene-action-3",
                "label" => "Explorar propiedades",
                "href" => "/propiedades",
                "newWindow" => false,
            ],
        ];
        $home[] = $story;
        foreach (
            [
                ["search", "Buscador", "Encontrá tu propiedad"],
                ["featured", "Propiedades destacadas", "Propiedades destacadas"],
                ["categories", "Categorías", "Explorá por tipo de propiedad"],
                ["latest", "Últimas propiedades", "Últimas propiedades"],
                [
                    "banner",
                    "Publicá tu propiedad",
                    "Tu propiedad merece una estrategia a su altura.",
                ],
                ["team", "Equipo", "Conocé RIVTON Group."],
                ["contact", "Contacto", "Hablemos de tu próxima etapa."],
                ["footer", "Footer", "RIVTON Group"],
            ]
            as $v
        ) {
            $home[] = $section(...$v);
        }
        $home[5]["content"] = [
            "eyebrow" => "Publicá con nosotros",
            "title" => "Tu propiedad merece una estrategia a su altura.",
            "button" => "Publicá tu propiedad",
        ];
        $home[5]["media"] = [self::profileMedia("architecture-strip.jpg")];
        $home[5]["actions"] = [
            [
                "id" => "action-publish",
                "label" => "Publicá tu propiedad",
                "href" => "/publicar",
                "newWindow" => false,
            ],
        ];
        $pages = [
            "home" => ["/", "Inicio", $home],
            "properties" => [
                "propiedades",
                "Propiedades",
                [
                    $section("heading", "Encabezado", "Propiedades"),
                    $section("search", "Buscador", "Encontrá tu propiedad"),
                    $section("latest", "Catálogo", "Explorá propiedades"),
                ],
            ],
            "property-template" => [
                "ficha-propiedad",
                "Ficha de propiedad (plantilla)",
                [
                    $section("heading", "Encabezado de ficha", "Ficha de propiedad"),
                    $section("contact", "Consulta", "Consultá por esta propiedad"),
                ],
            ],
            "favorites" => [
                "favoritos",
                "Favoritos",
                [$section("heading", "Favoritos", "Tus propiedades favoritas")],
            ],
            "about" => [
                "nosotros",
                "Nosotros",
                [
                    $section("text", "Presentación", $a["commercial_name"], $a["tagline_proposed"]),
                    $section("text", "Historia", "Nuestro origen", $a["founded_context"]),
                    $section(
                        "services",
                        "Servicios",
                        "Nuestros servicios",
                        implode("\n", $a["services"]),
                    ),
                    $section(
                        "text",
                        "Valores",
                        "Nuestra forma de trabajar",
                        implode(", ", $a["values"]),
                    ),
                    $section("team", "Equipo", "Nuestro equipo"),
                ],
            ],
            "contact" => [
                "contacto",
                "Contacto",
                [
                    $section(
                        "contact",
                        "Contacto",
                        "Contactá a RIVTON Group",
                        $config["site"]["address"] . "\n" . $a["contact"]["hours"],
                    ),
                ],
            ],
            "publish" => [
                "publicar",
                "Publicar propiedad",
                [
                    $section(
                        "lead-form",
                        "Publicar",
                        "Publicá tu propiedad.",
                        "Contanos sobre tu propiedad y te contactamos para asesorarte.",
                    ),
                ],
            ],
        ];
        $faq = $section("faq", "Preguntas frecuentes", "Preguntas frecuentes");
        foreach (
            [
                "Compra" => [
                    "¿Cómo consultar por una propiedad?",
                    "Compartí el código o enlace del inmueble por WhatsApp para recibir asesoramiento.",
                ],
                "Venta" => [
                    "¿Cómo comenzar la venta de un inmueble?",
                    "Contactanos para conversar sobre el inmueble y evaluar los próximos pasos.",
                ],
                "Alquiler" => [
                    "¿Dónde consulto las condiciones de un alquiler?",
                    "Las condiciones dependen del inmueble y de la operación. Consultá al equipo antes de avanzar.",
                ],
                "Publicación" => [
                    "¿Cómo publicar mi propiedad?",
                    "Completá tus datos y la información del inmueble para preparar una consulta por WhatsApp.",
                ],
                "Tasaciones" => [
                    "¿Cómo solicitar una tasación?",
                    "Contactanos con la ubicación y las características del inmueble para coordinar el asesoramiento.",
                ],
                "Visitas" => [
                    "¿Cómo coordinar una visita?",
                    "Las visitas se coordinan con el equipo por WhatsApp o llamada; requieren confirmación.",
                ],
                "Contacto" => ["¿Cuándo puedo contactar al equipo?", $a["contact"]["hours"]],
            ]
            as $group => $pair
        ) {
            $faq["faqs"][] = [
                "id" => "faq-" . sanitize_title($group),
                "group" => $group,
                "question" => $pair[0],
                "answer" => $pair[1],
            ];
        }
        $pages["faq"] = ["preguntas-frecuentes", "Preguntas frecuentes", [$faq]];
        foreach (
            [
                "privacy" => ["privacidad", "Privacidad"],
                "cookies" => ["cookies", "Cookies"],
                "terms" => ["terminos", "Términos y condiciones"],
            ]
            as $key => $v
        ) {
            $body =
                "BORRADOR PARA REVISIÓN JURÍDICA Y COMERCIAL. Pendiente confirmar responsable legal y domicilio, finalidades y base de tratamiento, conservación, destinatarios y transferencias, derechos y canal de ejercicio. No se habilitan tecnologías no esenciales sin configuración y consentimiento aplicable. Las condiciones de cada operación deben ser informadas y aceptadas expresamente. Contacto informado: " .
                $a["contact"]["public_email"] .
                ". Este borrador no está aprobado para publicar.";
            $pages[$key] = [$v[0], $v[1], [$section("text", "Borrador legal", $v[1], $body)]];
        }
        foreach ($pages as $key => $page) {
            $d = array_merge($defaults["page"], [
                "slug" => $page[0],
                "title" => $page[1],
                "status" => "draft",
                "sections" => $page[2],
            ]);
            foreach ($d["sections"] as $i => &$block) {
                $block["order"] = $i;
            }
            unset($block);
            $add(
                "page",
                "page-" . $key,
                $d,
                "draft",
                in_array($key, ["home", "properties", "property-template", "favorites"], true)
                    ? "existing-copy-or-structure"
                    : "proposed",
            );
        }
        return $map;
    }
    private static function profileMedia(string $file): array
    {
        $size = getimagesize(ESTATE_CORE_DIR . "/profiles/media/" . $file);
        return [
            "id" => "profile-media-" . pathinfo($file, PATHINFO_FILENAME),
            "schemaVersion" => 1,
            "revision" => 0,
            "extensions" => [],
            "src" => plugins_url("profiles/media/" . $file, dirname(__DIR__) . "/rivton-core.php"),
            "alt" => [
                "hero-house.jpg" => "Casa contemporánea con grandes ventanales",
                "interior-living.jpg" => "Interior residencial luminoso",
                "terrace-garden.jpg" => "Terraza residencial abierta al jardín y la piscina",
                "architecture-strip.jpg" => "",
                "team.jpg" => "Equipo de RIVTON Group",
            ][$file],
            "width" => $size[0],
            "height" => $size[1],
            "kind" => "image",
            "illustrative" => true,
        ];
    }
    private static function resolved(array $d): array
    {
        if (isset($d["id"], $d["src"]) && str_starts_with($d["id"], "profile-media-")) {
            $id = (int) get_option("estate_" . str_replace("-", "_", $d["id"]), 0);
            if ($id && get_post_type($id) === "attachment") {
                $d["id"] = "wp-media-" . $id;
                $d["src"] = wp_get_attachment_url($id);
            }
        }
        foreach ($d as &$child) {
            if (is_array($child)) {
                $child = self::resolved($child);
            }
        }
        unset($child);
        return $d;
    }
    private static function media(array $d): array
    {
        if (isset($d["id"], $d["src"]) && str_starts_with($d["id"], "profile-media-")) {
            $key = "estate_" . str_replace("-", "_", $d["id"]);
            $id = (int) get_option($key, 0);
            if (!$id || get_post_type($id) !== "attachment") {
                $file = basename(wp_parse_url($d["src"], PHP_URL_PATH));
                $path = ESTATE_CORE_DIR . "/profiles/media/" . $file;
                if (
                    !in_array(
                        $file,
                        [
                            "hero-house.jpg",
                            "interior-living.jpg",
                            "terrace-garden.jpg",
                            "architecture-strip.jpg",
                            "team.jpg",
                        ],
                        true,
                    )
                ) {
                    throw new \RuntimeException("Invalid profile media");
                }
                $upload = wp_upload_bits($file, null, file_get_contents($path));
                if (!empty($upload["error"])) {
                    throw new \RuntimeException("Media upload failed");
                }
                $id = wp_insert_attachment(
                    [
                        "post_mime_type" => "image/jpeg",
                        "post_title" => pathinfo($file, PATHINFO_FILENAME),
                        "post_status" => "inherit",
                    ],
                    $upload["file"],
                );
                if (is_wp_error($id) || !$id) {
                    throw new \RuntimeException("Media insert failed");
                }
                require_once ABSPATH . "wp-admin/includes/image.php";
                wp_update_attachment_metadata(
                    $id,
                    wp_generate_attachment_metadata($id, $upload["file"]),
                );
                update_post_meta($id, "_wp_attachment_image_alt", $d["alt"]);
                update_option($key, $id, false);
            }
            $d["id"] = "wp-media-" . $id;
            $d["src"] = wp_get_attachment_url($id);
        }
        foreach ($d as &$child) {
            if (is_array($child)) {
                $child = self::media($child);
            }
        }
        unset($child);
        return $d;
    }
    public static function apply(string $token, bool $approved)
    {
        $key = "estate_import_" . hash("sha256", $token);
        $plan = get_transient($key);
        if (!$approved || !$plan || $plan["actor"] !== get_current_user_id()) {
            return Schema::fail("Previsualizá y aprobá la importación desde tu sesión", 403);
        }
        foreach ($plan["plan"] as $id => $item) {
            if ($item["decision"] !== "ready") {
                continue;
            }
            $row = Store::get($id);
            if ((int) ($row["revision"] ?? 0) !== $item["expectedRevision"]) {
                return new \WP_Error(
                    "estate_import_conflict",
                    "Cambió un registro después de previsualizar. Volvé a validar.",
                    ["status" => 412],
                );
            }
        }
        // Media registration happens before SQL transaction; files remain reusable on rollback.
        try {
            foreach ($plan["plan"] as &$item) {
                if ($item["decision"] === "ready") {
                    $item["document"] = self::media($item["document"]);
                }
            }
            unset($item);
        } catch (\Throwable $e) {
            return Schema::fail("No se pudieron registrar los medios del perfil", 503);
        }
        global $wpdb;
        $report = [
            "items" => [],
            "source" => "rivton-client-intake-v1",
            "baselinesBefore" => get_option("estate_import_baselines", []),
            "createdAt" => gmdate("c"),
        ];
        $baselines = get_option("estate_import_baselines", []);
        $wpdb->query("START TRANSACTION");
        Store::$batch = true;
        try {
            foreach ($plan["plan"] as $id => $item) {
                if ($item["decision"] !== "ready") {
                    $report["items"][$id] = ["decision" => $item["decision"]];
                    continue;
                }
                $old = Store::get($id);
                if ((int) ($old["revision"] ?? 0) !== $item["expectedRevision"]) {
                    throw new \RuntimeException("Concurrent import edit");
                }
                $saved = Store::save($item["kind"], $item["document"], $item["status"], $old, $id);
                if (is_wp_error($saved)) {
                    throw new \RuntimeException("Write failed");
                }
                $report["items"][$id] = [
                    "decision" => "applied",
                    "backup" => $old,
                    "appliedRevision" => (int) $saved["revision"],
                    "kind" => $item["kind"],
                ];
                $baselines[$id] = self::hash(Store::document($saved));
            }
            $saved = Store::save("import", $report, "draft");
            if (is_wp_error($saved)) {
                throw new \RuntimeException("Report failed");
            }
            update_option("estate_import_baselines", $baselines, false);
            $wpdb->query("COMMIT");
            delete_transient($key);
            return [
                "reportId" => $saved["id"],
                "items" => array_map(fn($v) => ["decision" => $v["decision"]], $report["items"]),
                "notice" => "Textos editoriales en borrador. No se importaron propiedades.",
            ];
        } catch (\Throwable $e) {
            $wpdb->query("ROLLBACK");
            return Schema::fail("Importación revertida por error de persistencia", 503);
        } finally {
            Store::$batch = false;
        }
    }
    public static function rollback(string $id, bool $approved)
    {
        $row = Store::get($id);
        if (!$approved || !$row || $row["kind"] !== "import") {
            return Schema::fail("Informe no disponible", 404);
        }
        $report = Store::document($row);
        if (!empty($report["rolledBack"])) {
            return Schema::fail("La importación ya fue revertida", 409);
        }
        $conflicts = [];
        foreach ($report["items"] as $key => $item) {
            if ($item["decision"] === "applied") {
                $current = Store::get($key);
                if (!$current || (int) $current["revision"] !== $item["appliedRevision"]) {
                    $conflicts[] = $key;
                }
            }
        }
        if ($conflicts) {
            return new \WP_Error(
                "estate_import_conflict",
                "Hay modificaciones posteriores. No se sobrescribió nada.",
                ["status" => 409, "conflicts" => $conflicts],
            );
        }
        global $wpdb;
        $wpdb->query("START TRANSACTION");
        Store::$batch = true;
        try {
            foreach (array_reverse($report["items"], true) as $key => $item) {
                if ($item["decision"] !== "applied") {
                    continue;
                }
                $current = Store::get($key);
                $backup = $item["backup"];
                if (!$backup || $backup["status"] !== "published") {
                    $blocked = Domain::deactivate($current["kind"], $current);
                    if (is_wp_error($blocked)) {
                        throw new \RuntimeException("Referenced entity cannot be restored");
                    }
                }
                $saved = Store::save(
                    $current["kind"],
                    $backup ? Store::document($backup) : Store::document($current),
                    $backup ? $backup["status"] : "trash",
                    $current,
                );
                if (is_wp_error($saved)) {
                    throw new \RuntimeException("Restore failed");
                }
            }
            update_option("estate_import_baselines", $report["baselinesBefore"] ?? [], false);
            $report["rolledBack"] = gmdate("c");
            $saved = Store::save("import", $report, "draft", $row);
            if (is_wp_error($saved)) {
                throw new \RuntimeException("Report failed");
            }
            $wpdb->query("COMMIT");
            return ["restored" => true, "mediaRetained" => true];
        } catch (\Throwable $e) {
            $wpdb->query("ROLLBACK");
            return Schema::fail("No se pudo recuperar el respaldo", 503);
        } finally {
            Store::$batch = false;
        }
    }
}
