<?php
// Validator unit cases run in the isolated WordPress fixture, using real WP sanitizers.
check(EstateCore\Schema::url("/propiedades/example"), "unit relative URL accepted");
foreach (
    [
        "javascript:alert(1)",
        "data:text/html,x",
        "//evil.test",
        "https://user:pass@example.test",
        '/\\evil.test',
        "http://example.test",
    ]
    as $url
) {
    check(
        !EstateCore\Schema::url($url),
        "unit unsafe URL rejected: " . parse_url($url, PHP_URL_SCHEME),
    );
}
$theme = json_decode(file_get_contents(ESTATE_CORE_DIR . "/schemas/defaults.json"), true)[
    "configuration"
]["theme"];
check(
    !is_wp_error(EstateCore\Schema::check("themeSettingsSchema", $theme)),
    "unit default theme valid",
);
$theme["colors"] = ["primary" => "red; background:url(https://evil.test)"];
check(
    is_wp_error(EstateCore\Schema::check("themeSettingsSchema", $theme)),
    "unit CSS injection rejected",
);
$theme["colors"] = ["unknown" => "#ffffff"];
check(
    is_wp_error(EstateCore\Schema::check("themeSettingsSchema", $theme)),
    "unit unknown visual token rejected",
);
$theme["colors"] = [];
$theme["radius"] = 1000;
check(
    is_wp_error(EstateCore\Schema::check("themeSettingsSchema", $theme)),
    "unit token numeric bounds enforced",
);
