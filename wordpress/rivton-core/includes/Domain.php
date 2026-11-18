<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Domain
{
    public static function filters(array $filters): array
    {
        foreach ($filters as &$filter) {
            $source = $filter["source"] ?? "manual";
            if ($source === "manual") {
                continue;
            }
            $options = [];
            $rows = Store::list(
                in_array($source, ["operations", "types"], true)
                    ? "category"
                    : ($source === "features"
                        ? "feature"
                        : "location"),
                true,
                0,
                1000,
            );
            $overrides = array_column($filter["options"], "label", "value");
            usort(
                $rows,
                fn($a, $b) => (Store::document($a)["order"] ?? 0) <=>
                    (Store::document($b)["order"] ?? 0),
            );
            foreach ($rows as $row) {
                $d = Store::document($row);
                if (($d["visible"] ?? true) === false) {
                    continue;
                }
                if (
                    ($source === "operations" && $d["kind"] !== "operation") ||
                    ($source === "types" && $d["kind"] !== "type")
                ) {
                    continue;
                }
                if (
                    in_array($source, ["cities", "neighborhoods"], true) &&
                    ($d["level"] !== ($source === "cities" ? "city" : "neighborhood") ||
                        !$d["active"])
                ) {
                    continue;
                }
                if ($source === "features" && empty($d["filterVisible"])) {
                    continue;
                }
                $value = in_array($source, ["cities", "neighborhoods"], true)
                    ? $d["name"]
                    : ($source === "features"
                        ? $row["id"]
                        : $d["slug"]);
                $options[] = [
                    "value" => $value,
                    "label" => $overrides[$value] ?? ($d["label"] ?? $d["name"]),
                ];
            }
            $filter["options"] = $options;
        }
        unset($filter);
        return $filters;
    }
    public static function project(string $kind, array $d): array
    {
        if ($kind === "property" && !empty($d["provinceId"])) {
            $names = [];
            foreach (["provinceId", "cityId", "neighborhoodId"] as $key) {
                $row = Store::get($d[$key] ?? "");
                if ($row && $row["kind"] === "location") {
                    $names[] = Store::document($row)["name"];
                }
            }
            if ($names) {
                $d["location"] = implode(", ", array_reverse($names));
            }
        }
        return $d;
    }
    public static function validate(string $kind, array &$d, ?array $old)
    {
        if ($kind === "location") {
            if (!trim($d["name"])) {
                return Schema::fail("Nombre geográfico obligatorio");
            }
            $levels = ["province" => null, "city" => "province", "neighborhood" => "city"];
            $parent = $levels[$d["level"]];
            if ($parent) {
                $row = Store::get($d["parentId"] ?? "");
                if (
                    !$row ||
                    $row["kind"] !== "location" ||
                    $row["id"] === ($old["id"] ?? "") ||
                    $row["status"] !== "published" ||
                    Store::document($row)["level"] !== $parent
                ) {
                    return Schema::fail("La jerarquía requiere un padre activo del nivel anterior");
                }
            } elseif (!empty($d["parentId"])) {
                return Schema::fail("Una provincia no admite padre");
            }
            if (
                $old &&
                ($d["level"] !== Store::document($old)["level"] ||
                    ($d["parentId"] ?? "") !== (Store::document($old)["parentId"] ?? "") ||
                    empty($d["active"]))
            ) {
                $blocked = self::deactivate($kind, $old);
                if (is_wp_error($blocked)) {
                    return $blocked;
                }
            }
        }
        if (
            $kind === "feature" &&
            !empty($d["icon"]) &&
            !in_array(
                $d["icon"],
                [
                    "home",
                    "bed",
                    "bath",
                    "area",
                    "car",
                    "pool",
                    "garden",
                    "security",
                    "gym",
                    "balcony",
                    "sun",
                    "building",
                    "check",
                ],
                true,
            )
        ) {
            return Schema::fail("Icono no permitido");
        }
        if ($kind === "feature" && $old) {
            $previous = Store::document($old);
            if (
                ($previous["valueType"] ?? "") !== $d["valueType"] ||
                ($previous["options"] ?? []) !== ($d["options"] ?? [])
            ) {
                $blocked = self::deactivate("feature", $old);
                if (is_wp_error($blocked)) {
                    return $blocked;
                }
            }
        }
        if ($kind === "property") {
            $previous = null;
            $names = [];
            foreach (
                ["provinceId" => "province", "cityId" => "city", "neighborhoodId" => "neighborhood"]
                as $field => $level
            ) {
                if (empty($d[$field])) {
                    if (
                        $field === "provinceId" &&
                        (!empty($d["cityId"]) || !empty($d["neighborhoodId"]))
                    ) {
                        return Schema::fail("Seleccioná primero la provincia");
                    }
                    if ($field === "cityId" && !empty($d["neighborhoodId"])) {
                        return Schema::fail("Seleccioná primero la localidad");
                    }
                    continue;
                }
                $row = Store::get($d[$field]);
                $doc = $row ? Store::document($row) : [];
                if (
                    !$row ||
                    $row["kind"] !== "location" ||
                    $row["status"] !== "published" ||
                    empty($doc["active"]) ||
                    $doc["level"] !== $level ||
                    ($previous && ($doc["parentId"] ?? "") !== $previous)
                ) {
                    return Schema::fail("La ubicación no corresponde a la jerarquía seleccionada");
                }
                $previous = $row["id"];
                $names[] = $doc["name"];
            }
            if ($names) {
                $d["location"] = implode(", ", array_reverse($names));
            }
            if (!empty($d["agentId"])) {
                $agent = Store::get($d["agentId"]);
                if (!$agent || $agent["kind"] !== "team") {
                    return Schema::fail("Integrante no disponible");
                }
            }
            foreach ($d["attributes"] ?? [] as $id => $value) {
                $row = Store::get($id);
                if (!$row || $row["kind"] !== "feature" || $row["status"] !== "published") {
                    return Schema::fail("Atributo no disponible");
                }
                $f = Store::document($row);
                $type = $f["valueType"];
                if (
                    ($type === "number" && !is_numeric($value)) ||
                    ($type === "boolean" && !is_bool($value)) ||
                    ($type === "select" && !in_array($value, $f["options"] ?? [], true)) ||
                    ($type === "text" && !is_string($value))
                ) {
                    return Schema::fail("El valor no corresponde al tipo del atributo");
                }
                if ($type === "number" && !is_int($value) && !is_float($value)) {
                    return Schema::fail("Usá un valor numérico");
                }
            }
        }
        if ($kind === "page") {
            foreach ($d["sections"] as $section) {
                if ($section["type"] === "story" && count($section["scenes"] ?? []) > 3) {
                    return Schema::fail(
                        "La coreografía actual permite hasta tres escenas coordinadas",
                    );
                }
                $ids = array_column($section["scenes"] ?? [], "id");
                if (count($ids) !== count(array_unique($ids))) {
                    return Schema::fail("Escenas con identificadores duplicados");
                }
            }
        }
        // Native attachments are checked whenever referenced. Legacy external media remain readable.
        $check = function ($value) use (&$check) {
            if (!is_array($value)) {
                return true;
            }
            if (
                isset($value["src"], $value["kind"], $value["id"]) &&
                str_starts_with($value["id"], "wp-media-")
            ) {
                $id = (int) substr($value["id"], 9);
                if (
                    get_post_type($id) !== "attachment" ||
                    wp_get_attachment_url($id) !== $value["src"]
                ) {
                    return false;
                }
            }
            foreach ($value as $child) {
                if (is_array($child) && !$check($child)) {
                    return false;
                }
            }
            return true;
        };
        if (!$check($d)) {
            return Schema::fail("Hay un medio faltante o una referencia inválida");
        }
        return true;
    }
    public static function deactivate(string $kind, array $row)
    {
        if (!in_array($kind, ["location", "feature", "team", "category"], true)) {
            return true;
        }
        global $wpdb;
        $after = 0;
        do {
            $items = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM " .
                        Store::table() .
                        " WHERE sequence>%d AND kind IN (%s,%s) ORDER BY sequence LIMIT 100",
                    $after,
                    "property",
                    "location",
                ),
                ARRAY_A,
            );
            foreach ($items as $item) {
                $after = (int) $item["sequence"];
                if ($item["status"] === "trash") {
                    continue;
                }
                $d = Store::document($item);
                $refs = [
                    $d["provinceId"] ?? "",
                    $d["cityId"] ?? "",
                    $d["neighborhoodId"] ?? "",
                    $d["parentId"] ?? "",
                    $d["agentId"] ?? "",
                    $d["propertyTypeId"] ?? "",
                ];
                $refs = array_merge(
                    $refs,
                    $d["featureIds"] ?? [],
                    $d["categoryIds"] ?? [],
                    array_keys($d["attributes"] ?? []),
                );
                if (in_array($row["id"], $refs, true)) {
                    return new \WP_Error(
                        "estate_reference_in_use",
                        "Hay registros vinculados. Reasignalos antes de desactivar.",
                        ["status" => 409],
                    );
                }
            }
        } while (count($items) === 100);
        return true;
    }
}
