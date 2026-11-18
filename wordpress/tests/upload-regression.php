<?php
if (!defined("ESTATE_CORE_TESTING") || !getenv("ESTATE_WP_ROOT")) {
    throw new Exception("Local QA only");
}
require getenv("ESTATE_WP_ROOT") . "/wp-load.php";
wp_set_current_user(1);
$admin = new EstateCore\Admin();
$passed = [];
function uploadCheck($ok, $name)
{
    global $passed;
    if (!$ok) {
        throw new Exception($name);
    }
    $passed[] = $name;
}
$file = ["name" => "plugin.zip", "size" => 12000000, "tmp_name" => "qa-package"];
$GLOBALS["pagenow"] = "async-upload.php";
$_GET["action"] = "upload-plugin";
$_REQUEST["_wpnonce"] = wp_create_nonce("plugin-upload");
$_FILES["pluginzip"] = $file;
uploadCheck(
    isset($admin->upload($file)["error"]),
    "ZIP rejected through media endpoint even with installer parameters",
);
$GLOBALS["pagenow"] = "update.php";
$_REQUEST["_wpnonce"] = "invalid";
uploadCheck(isset($admin->upload($file)["error"]), "Installer requires valid nonce");
$_REQUEST["_wpnonce"] = wp_create_nonce("plugin-upload");
uploadCheck(
    !isset($admin->upload($file)["error"]),
    "Authorized core plugin installer accepts ZIP without media size limit",
);
$_FILES["pluginzip"]["tmp_name"] = "different";
uploadCheck(
    isset($admin->upload($file)["error"]),
    "Installer exemption requires exact uploaded package",
);
$_FILES["pluginzip"] = $file;
$GLOBALS["pagenow"] = "async-upload.php";
uploadCheck(
    isset($admin->upload(["name" => "x.svg", "size" => 10])["error"]),
    "SVG remains blocked",
);
uploadCheck(
    isset($admin->upload(["name" => "x.jpg", "size" => 10485761])["error"]),
    "Oversized image remains blocked",
);
uploadCheck(
    !isset($admin->upload(["name" => "x.jpg", "size" => 10485760])["error"]),
    "Allowed image at limit accepted",
);
// The actual HTTP upload and overwrite are exercised by test-package-upload.mjs.
$GLOBALS["pagenow"] = "update.php";
$_GET["action"] = "upload-plugin";
$_FILES["pluginzip"] = $file;
$agent = wp_create_user(
    "upload-agent-" . time(),
    wp_generate_password(),
    "upload-agent-" . time() . "@example.invalid",
);
(new WP_User($agent))->set_role("estate_agent");
wp_set_current_user($agent);
$_REQUEST["_wpnonce"] = wp_create_nonce("plugin-upload");
uploadCheck(
    isset($admin->upload($_FILES["pluginzip"])["error"]),
    "Agent cannot use installer exemption",
);
file_put_contents(
    getenv("ESTATE_RESULTS") . "/wp-upload-regression.json",
    wp_json_encode(
        ["success" => true, "passed" => $passed, "version" => ESTATE_CORE_VERSION],
        JSON_PRETTY_PRINT,
    ),
);
echo count($passed) . " upload regression checks passed";
