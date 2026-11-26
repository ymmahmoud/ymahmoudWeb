<?php

// Local preview router for `php -S localhost:8000 lib/dev-router.php`.
// Mirrors the .htaccess rules: /page serves page.php, and lib/ and data/ are denied.

if (PHP_SAPI !== 'cli-server') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if (preg_match('#^/(lib|data)(/|$)#', $path)) {
    http_response_code(403);
    exit('Forbidden');
}

if (!is_dir($root . $path) && is_file($root . $path . '.php')) {
    $_SERVER['SCRIPT_NAME'] = $path . '.php';
    require $root . $path . '.php';
    return true;
}

return false;
