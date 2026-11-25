<?php

const MAX_MESSAGES_PER_HOUR = 5;

function respond(int $status, array $body): void
{
    $wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($body);
    } else {
        $result = $status === 200 ? 'sent' : 'error';
        header("Location: ../?mail=$result#compose", true, 303);
    }
    exit;
}

function field(string $name, int $maxLength): string
{
    $value = trim((string) ($_POST[$name] ?? ''));
    preg_match('/^.{0,' . $maxLength . '}/su', $value, $match);
    return $match[0] ?? '';
}

function singleLine(string $value): string
{
    return preg_replace('/[\r\n\t]+/', ' ', $value);
}

function rateLimited(string $ip): bool
{
    $file = sys_get_temp_dir() . '/yos-mail-' . hash('sha256', $ip);
    $cutoff = time() - 3600;
    $recent = array_filter(
        array_map('intval', is_file($file) ? file($file, FILE_IGNORE_NEW_LINES) : []),
        fn($t) => $t > $cutoff
    );
    if (count($recent) >= MAX_MESSAGES_PER_HOUR) {
        return true;
    }
    $recent[] = time();
    file_put_contents($file, implode("\n", $recent), LOCK_EX);
    return false;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Method not allowed.']);
}

if (field('company', 200) !== '') {
    respond(200, ['ok' => true]);
}

$name = singleLine(field('name', 100));
$email = field('email', 254);
$subject = singleLine(field('subject', 150));
$message = field('message', 5000);

if ($name === '' || $subject === '' || $message === '') {
    respond(422, ['error' => 'Please fill in every field.']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['error' => 'Please enter a valid email address.']);
}

$recipient = getenv('CONTACT_EMAIL') ?: ($_SERVER['CONTACT_EMAIL'] ?? '');
if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
    respond(503, ['error' => 'Mail isn’t set up on this server yet.']);
}

if (rateLimited($_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
    respond(429, ['error' => 'Too many messages. Please try again later.']);
}

$host = preg_replace('/[^a-z0-9.-]/i', '', $_SERVER['SERVER_NAME'] ?? 'localhost');
$sender = getenv('CONTACT_FROM') ?: "no-reply@$host";

$headers = [
    'From' => "Website Contact <$sender>",
    'Reply-To' => $email,
    'Content-Type' => 'text/plain; charset=UTF-8',
];
$body = "From: $name <$email>\n\n$message\n";
$encodedSubject = '=?UTF-8?B?' . base64_encode("[Website] $subject") . '?=';

if (!mail($recipient, $encodedSubject, $body, $headers)) {
    respond(500, ['error' => 'The message couldn’t be sent.']);
}

respond(200, ['ok' => true]);
