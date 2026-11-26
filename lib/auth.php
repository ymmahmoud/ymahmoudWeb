<?php

// Site accounts: Google sign-in for people linked on the Users page, plus the
// administrators listed in ADMIN_EMAILS (who can also manage users).

require_once __DIR__ . '/users.php';

function env(string $name): string
{
    return (string) (getenv($name) ?: ($_SERVER[$name] ?? ''));
}

function admin_emails(): array
{
    $emails = array_map(fn($e) => strtolower(trim($e)), explode(',', env('ADMIN_EMAILS')));
    return array_values(array_filter($emails));
}

function is_https(): bool
{
    return ($_SERVER['HTTPS'] ?? '') === 'on'
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function start_session(): void
{
    session_name('yos_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// Starts the session only for visitors who already have one, so pages don't set cookies for everyone.
function resume_session(): void
{
    if (isset($_COOKIE['yos_session'])) {
        start_session();
    }
}

// The signed-in person, looked up on every request so unlinking an account or
// removing it from ADMIN_EMAILS takes effect at once. Null when signed out.
function current_account(): ?array
{
    $email = $_SESSION['email'] ?? null;
    if (!is_string($email)) {
        return null;
    }
    $admin = in_array($email, admin_emails(), true);
    $user = find_user($email);
    if ($user === null && !$admin) {
        return null;
    }
    return [
        'email' => $email,
        'name' => $user['name'] ?? $email,
        'groups' => $user['groups'] ?? [],
        'admin' => $admin,
    ];
}

function can_sign_in(string $email): bool
{
    return in_array($email, admin_emails(), true) || find_user($email) !== null;
}

function require_admin(): string
{
    $account = current_account();
    if ($account === null) {
        header('Location: /signin?return=' . rawurlencode('/users'), true, 303);
        exit;
    }
    if (!$account['admin']) {
        http_response_code(403);
        exit('Only administrators can manage users.');
    }
    return $account['email'];
}

// Only same-site paths, so the return address can't send people elsewhere.
function safe_return(mixed $path): string
{
    return is_string($path) && preg_match('#^/(?![/\\\\])#', $path) ? $path : '/#settings';
}

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function check_csrf(): void
{
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        http_response_code(400);
        exit('Your session expired. Go back, reload the page and try again.');
    }
}

function google_redirect_uri(): string
{
    return (is_https() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/signin';
}

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
