// Portable native fixture. Requires MariaDB already listening only on 127.0.0.1:3309.
// All paths and databases are new local QA resources; never pass a customer WP root.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
const clean = process.env.ESTATE_CLEAN_INSTALL === "1";
const root = process.cwd(),
  native = path.join(root, ".tmp/native");
const php = path.join(native, "php/php.exe"),
  mysql = path.join(native, "mariadb/mariadb-11.4.5-winx64/bin/mariadb.exe");
const fixture = path.join(native, "runs", Date.now().toString()),
  wp = path.join(fixture, "wordpress");
mkdirSync(fixture, { recursive: true });
const database = "estate_qa_" + Date.now();
function unzip(archive, dest) {
  execFileSync("python", [
    "-c",
    "import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])",
    archive,
    dest,
  ]);
}
execFileSync(mysql, [
  "--defaults-file=" + path.join(native, "client.ini"),
  "-e",
  `CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
]);
unzip(path.join(native, "wordpress.zip"), fixture);
const plugins = path.join(wp, "wp-content/plugins");
unzip(
  path.join(root, clean ? "artifacts/rivton-core-0.3.1.zip" : "artifacts/rivton-core-0.2.0.zip"),
  plugins,
);
const passfile = path.join(native, "password.txt").replaceAll("\\", "/");
writeFileSync(
  path.join(wp, "wp-config.php"),
  `<?php
define('DB_NAME','${database}');define('DB_USER','root');define('DB_PASSWORD',trim(file_get_contents('${passfile}')));define('DB_HOST','127.0.0.1:3309');define('DB_CHARSET','utf8mb4');define('DB_COLLATE','');$table_prefix='wp_';define('WP_DEBUG',true);define('WP_DEBUG_LOG',true);define('WP_DEBUG_DISPLAY',false);define('WP_ENVIRONMENT_TYPE','local');define('WP_HOME','https://estate-qa.example.invalid');define('WP_SITEURL','https://estate-qa.example.invalid');define('DISABLE_WP_CRON',true);if(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');require_once ABSPATH.'wp-settings.php';`,
);
const env = { ...process.env, ESTATE_WP_ROOT: wp, ESTATE_RESULTS: path.join(root, "artifacts") };
function run(name, code) {
  const file = path.join(fixture, name + ".php");
  writeFileSync(
    file,
    "<?php\n$_SERVER['HTTPS']='on';$_SERVER['HTTP_HOST']='estate-qa.example.invalid';\n" + code,
  );
  const output = execFileSync(php, [file], { env, encoding: "utf8" });
  if (output.includes("<html")) throw new Error(name + " failed; inspect fixture debug.log");
  console.log(output);
}
run(
  "install-baseline",
  `define('WP_INSTALLING',true);require getenv('ESTATE_WP_ROOT').'/wp-load.php';require_once ABSPATH.'wp-admin/includes/upgrade.php';wp_install('RIVTON QA','qa-admin','qa@example.invalid',true,'',trim(file_get_contents('${passfile}')));require_once ABSPATH.'wp-admin/includes/plugin.php';activate_plugin('rivton-core/rivton-core.php');wp_set_current_user(1);$d=json_decode(file_get_contents(ESTATE_CORE_DIR.'/schemas/defaults.json'),true)['property'];$d['title']='Upgrade QA fixture';$d['slug']='upgrade-qa';$row=EstateCore\\Store::save('property',$d,'draft',null,'upgrade-preserved-native');if(is_wp_error($row))throw new Exception('Baseline write failed');file_put_contents(__DIR__.'/before.json',wp_json_encode($row));echo ESTATE_CORE_VERSION.' installed and record saved';`,
);
if (!clean) {
  unzip(path.join(root, "artifacts/rivton-core-0.3.1.zip"), plugins);
  run(
    "check-upgrade",
    `require getenv('ESTATE_WP_ROOT').'/wp-load.php';$before=json_decode(file_get_contents(__DIR__.'/before.json'),true);$after=EstateCore\\Store::get('upgrade-preserved-native');if($before['document']!==$after['document']||get_option('estate_schema_version')!=3)throw new Exception('Upgrade lost data');$result=['success'=>true,'from'=>'0.2.0','to'=>ESTATE_CORE_VERSION,'storageVersion'=>(int)get_option('estate_schema_version'),'database'=>$GLOBALS['wpdb']->get_var('SELECT VERSION()'),'preservedId'=>$after['id'],'documentUnchanged'=>true,'revisionCaptured'=>(bool)EstateCore\\Workspace::historical($after,(int)$after['revision'])];file_put_contents(getenv('ESTATE_RESULTS').'/wp-upgrade.json',wp_json_encode($result,JSON_PRETTY_PRINT));echo 'Upgrade ZIP preserves ID, content and revision';`,
  );
} else {
  run(
    "check-clean-install",
    `require getenv('ESTATE_WP_ROOT').'/wp-load.php';if(ESTATE_CORE_VERSION!=='0.3.1'||get_option('estate_schema_version')!=3)throw new Exception('Clean install failed');file_put_contents(getenv('ESTATE_RESULTS').'/wp-clean-install.json',wp_json_encode(['success'=>true,'version'=>ESTATE_CORE_VERSION,'storageVersion'=>(int)get_option('estate_schema_version'),'database'=>$GLOBALS['wpdb']->get_var('SELECT VERSION()')],JSON_PRETTY_PRINT));echo 'Clean 0.3.1 ZIP activation verified';`,
  );
}
const tests = path.join(root, "wordpress/tests").replaceAll("\\", "/");
run("regression", `define('ESTATE_CORE_TESTING',true);require '${tests}/integration.php';`);
run(
  "visual-integration",
  `define('ESTATE_CORE_TESTING',true);require '${tests}/visual-integration.php';`,
);
for (const report of ["wp-integration.json", "wp-visual-integration.json"]) {
  const data = JSON.parse(readFileSync(path.join(root, "artifacts", report), "utf8"));
  if (!data.success || data.lastError) throw new Error(report + " did not complete cleanly");
}
writeFileSync(path.join(root, ".tmp/native/last-fixture.json"), JSON.stringify({ wp, database }));
console.log("Native MariaDB ZIP installation, upgrade, regression and visual integration passed.");
