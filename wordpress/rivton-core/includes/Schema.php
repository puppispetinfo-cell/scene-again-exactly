<?php
namespace EstateCore;
if (!defined("ABSPATH")) {
    exit();
}
final class Schema
{
    private static $schemas;
    public static function all(): array
    {
        return self::$schemas ??
            (self::$schemas = json_decode(
                file_get_contents(ESTATE_CORE_DIR . "/schemas/contracts.json"),
                true,
            ));
    }
    public static function check(string $name, $data)
    {
        return self::validate(self::all()[$name], $data, $name);
    }
    private static function length(string $value): int
    {
        return function_exists("mb_strlen") ? mb_strlen($value) : preg_match_all("/./us", $value);
    }
    public static function fail(string $message, int $status = 422)
    {
        return new \WP_Error("estate_validation", $message, ["status" => $status]);
    }
    public static function url($value): bool
    {
        if (
            !is_string($value) ||
            strlen($value) > 2048 ||
            preg_match('/[\s\\\\\x00-\x1f]/', $value)
        ) {
            return false;
        }
        if (preg_match("~^/(?!/)~", $value)) {
            return true;
        }
        $u = wp_parse_url($value);
        return is_array($u) &&
            (($u["scheme"] ?? "") === "https" ||
                (($u["scheme"] ?? "") === "http" &&
                    in_array($u["host"] ?? "", ["127.0.0.1", "localhost"], true) &&
                    wp_get_environment_type() === "local")) &&
            !empty($u["host"]) &&
            !isset($u["user"]) &&
            !isset($u["pass"]);
    }
    public static function validate(array $s, $v, string $path = "")
    {
        if (isset($s["anyOf"])) {
            foreach ($s["anyOf"] as $candidate) {
                $r = self::validate($candidate, $v, $path);
                if (!is_wp_error($r)) {
                    return $r;
                }
            }
            return self::fail("Invalid value: " . $path);
        }
        if (isset($s["enum"]) && !in_array($v, $s["enum"], true)) {
            return self::fail("Invalid option: " . $path);
        }
        if (array_key_exists("const", $s) && $v !== $s["const"]) {
            return self::fail("Invalid constant: " . $path);
        }
        $t = $s["type"] ?? null;
        if (is_array($t)) {
            foreach ($t as $type) {
                $r = self::validate(array_merge($s, ["type" => $type]), $v, $path);
                if (!is_wp_error($r)) {
                    return $r;
                }
            }
            return self::fail("Invalid type: " . $path);
        }
        if ($t === "null") {
            return $v === null ? null : self::fail("Expected null: " . $path);
        }
        if ($t === "boolean") {
            return is_bool($v) ? $v : self::fail("Expected boolean: " . $path);
        }
        if ($t === "number" || $t === "integer") {
            if (
                (!is_int($v) && !is_float($v)) ||
                !is_finite((float) $v) ||
                ($t === "integer" && floor($v) != $v) ||
                (isset($s["minimum"]) && $v < $s["minimum"]) ||
                (isset($s["maximum"]) && $v > $s["maximum"])
            ) {
                return self::fail("Invalid number: " . $path);
            }
            return $v;
        }
        if ($t === "string") {
            if (
                !is_string($v) ||
                strlen($v) > 40000 ||
                (isset($s["maxLength"]) && self::length($v) > $s["maxLength"]) ||
                (isset($s["minLength"]) && self::length($v) < $s["minLength"])
            ) {
                return self::fail("Invalid text: " . $path);
            }
            if (
                isset($s["pattern"]) &&
                !preg_match("~" . str_replace("~", "\\~", $s["pattern"]) . "~u", $v)
            ) {
                return self::fail("Invalid format: " . $path);
            }
            $format = $s["format"] ?? "";
            if ($format === "email" && !is_email($v)) {
                return self::fail("Invalid email");
            }
            if ($format === "uri" && !filter_var($v, FILTER_VALIDATE_URL)) {
                return self::fail("Invalid URL");
            }
            if (
                $format === "uuid" &&
                !preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i', $v)
            ) {
                return self::fail("Invalid UUID");
            }
            if (
                $format === "date" &&
                (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) || !strtotime($v))
            ) {
                return self::fail("Invalid date");
            }
            if ($format === "date-time" && !strtotime($v)) {
                return self::fail("Invalid timestamp");
            }
            if (str_ends_with($path, ".domain")) {
                $u = wp_parse_url($v);
                if (
                    !$u ||
                    isset($u["user"]) ||
                    isset($u["pass"]) ||
                    isset($u["query"]) ||
                    isset($u["fragment"]) ||
                    (($u["scheme"] ?? "") !== "https" &&
                        !(
                            ($u["scheme"] ?? "") === "http" &&
                            in_array($u["host"] ?? "", ["127.0.0.1", "localhost"], true)
                        ))
                ) {
                    return self::fail("Domain must be an HTTPS origin");
                }
            }
            if (preg_match('/(?:^|\.)(?:href|src|canonical|url)$/', $path) && !self::url($v)) {
                return self::fail("Unsafe URL: " . $path);
            }
            if (
                str_ends_with($path, "calendly.url") &&
                wp_parse_url($v, PHP_URL_HOST) !== "calendly.com"
            ) {
                return self::fail("Calendly host not allowed");
            }
            // Plain text contracts: preserve newlines, remove markup. Rendering still escapes output.
            return sanitize_textarea_field($v);
        }
        if ($t === "array") {
            if (
                !is_array($v) ||
                !array_is_list($v) ||
                count($v) > ($s["maxItems"] ?? 200) ||
                count($v) < ($s["minItems"] ?? 0)
            ) {
                return self::fail("Invalid list: " . $path);
            }
            $out = [];
            foreach ($v as $i => $item) {
                $r = self::validate($s["items"] ?? [], $item, $path . "." . $i);
                if (is_wp_error($r)) {
                    return $r;
                }
                $out[] = $r;
            }
            return $out;
        }
        if ($t === "object") {
            if (is_object($v)) {
                $v = (array) $v;
            }
            if (!is_array($v) || ($v && array_is_list($v)) || count($v) > 200) {
                return self::fail("Invalid object: " . $path);
            }
            $properties = $s["properties"] ?? [];
            $out = [];
            foreach ($s["required"] ?? [] as $key) {
                if (!array_key_exists($key, $v)) {
                    return self::fail("Missing field: " . $path . "." . $key);
                }
            }
            foreach ($v as $key => $value) {
                if (in_array($key, ["__proto__", "prototype", "constructor"], true)) {
                    return self::fail("Reserved key");
                }
                if (!isset($properties[$key]) && ($s["additionalProperties"] ?? true) === false) {
                    return self::fail("Unknown field: " . $path . "." . $key);
                }
                $child =
                    $properties[$key] ??
                    (is_array($s["additionalProperties"] ?? null)
                        ? $s["additionalProperties"]
                        : []);
                if (
                    isset($s["propertyNames"]["enum"]) &&
                    !in_array($key, $s["propertyNames"]["enum"], true)
                ) {
                    return self::fail("Unknown token");
                }
                if (
                    isset($s["propertyNames"]["pattern"]) &&
                    !preg_match("~" . $s["propertyNames"]["pattern"] . "~", $key)
                ) {
                    return self::fail("Invalid key");
                }
                $r = self::validate($child, $value, $path . "." . $key);
                if (is_wp_error($r)) {
                    return $r;
                }
                $out[$key] = $r;
            }
            foreach ($properties as $key => $child) {
                if (!array_key_exists($key, $out) && array_key_exists("default", $child)) {
                    $out[$key] = $child["default"];
                }
            }
            return $out;
        }
        // Unknown extension schemas are not executable content; reject instead of passing arbitrary structures.
        if (is_scalar($v) || $v === null) {
            return is_string($v) ? sanitize_textarea_field($v) : $v;
        }
        if ($v === []) {
            return [];
        }
        return self::fail("Unregistered extension: " . $path);
    }
    public static function json($data, $key = "")
    {
        if (!is_array($data)) {
            return $data;
        }
        $out = [];
        foreach ($data as $k => $v) {
            $out[$k] = self::json($v, (string) $k);
        }
        return !$out &&
            in_array(
                $key,
                [
                    "extensions",
                    "colors",
                    "sectionColors",
                    "content",
                    "utmDefaults",
                    "layout",
                    "overrides",
                    "mobile",
                    "tablet",
                    "desktop",
                    "attributes",
                ],
                true,
            )
            ? (object) []
            : $out;
    }
}
