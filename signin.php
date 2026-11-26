<?php

// Google sign-in for site accounts (OAuth 2.0 authorization code flow).
// GET /signin?return=/path starts sign-in, Google redirects back here with ?code,
// and POST signs out. Both end at the return path (System Settings by default).

require __DIR__ . '/lib/auth.php';

start_session();

function fail(int $status, string $message): void
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">'
        . '<title>Sign In</title><link rel="stylesheet" href="/assets/css/admin.css">'
        . '<main class="admin admin--narrow"><h1>Sign In</h1><p>' . e($message) . '</p>'
        . '<p><a class="button" href="/signin">Sign in with a different Google account</a></p></main>';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $_SESSION = [];
    session_destroy();
    header('Location: ' . safe_return($_POST['return'] ?? null), true, 303);
    exit;
}

$clientId = env('GOOGLE_CLIENT_ID');
$clientSecret = env('GOOGLE_CLIENT_SECRET');
if ($clientId === '' || $clientSecret === '') {
    fail(500, 'Sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.');
}

if (isset($_GET['error'])) {
    fail(401, 'Google sign-in was cancelled.');
}

if (!isset($_GET['code'])) {
    $return = safe_return($_GET['return'] ?? null);
    if (current_account() !== null) {
        header('Location: ' . $return, true, 303);
        exit;
    }
    $_SESSION['oauth_return'] = $return;
    $_SESSION['oauth_state'] = bin2hex(random_bytes(16));
    $_SESSION['oauth_nonce'] = bin2hex(random_bytes(16));
    header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
        'client_id' => $clientId,
        'redirect_uri' => google_redirect_uri(),
        'response_type' => 'code',
        'scope' => 'openid email',
        'state' => $_SESSION['oauth_state'],
        'nonce' => $_SESSION['oauth_nonce'],
        'prompt' => 'select_account',
    ]), true, 303);
    exit;
}

$state = $_SESSION['oauth_state'] ?? '';
$nonce = $_SESSION['oauth_nonce'] ?? '';
$return = safe_return($_SESSION['oauth_return'] ?? null);
unset($_SESSION['oauth_state'], $_SESSION['oauth_nonce'], $_SESSION['oauth_return']);
if ($state === '' || !is_string($_GET['state'] ?? null) || !hash_equals($state, $_GET['state'])) {
    fail(400, 'Sign-in expired. Please try again.');
}

$curl = curl_init('https://oauth2.googleapis.com/token');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query([
        'code' => (string) $_GET['code'],
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri' => google_redirect_uri(),
        'grant_type' => 'authorization_code',
    ]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
]);
$response = json_decode((string) curl_exec($curl), true);
$status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);

if ($status !== 200 || !is_string($response['id_token'] ?? null)) {
    fail(502, 'Google did not accept the sign-in. Please try again.');
}

// The ID token came straight from Google's token endpoint over TLS, so its claims
// can be read without checking the signature (per Google's OpenID Connect docs).
$parts = explode('.', $response['id_token']);
$claims = json_decode((string) base64_decode(strtr($parts[1] ?? '', '-_', '+/')), true);

$valid = is_array($claims)
    && in_array($claims['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)
    && ($claims['aud'] ?? '') === $clientId
    && ($claims['exp'] ?? 0) > time()
    && hash_equals($nonce, (string) ($claims['nonce'] ?? ''))
    && ($claims['email_verified'] ?? false) === true
    && is_string($claims['email'] ?? null);
if (!$valid) {
    fail(401, 'Google sign-in could not be verified. Please try again.');
}

$email = strtolower($claims['email']);
if (!can_sign_in($email)) {
    fail(403, "$email doesn't have access. If you were invited, sign in with the Google account you shared with Yaseen.");
}

session_regenerate_id(true);
$_SESSION['email'] = $email;
header('Location: ' . $return, true, 303);
