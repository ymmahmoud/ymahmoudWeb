<?php

// Users, their Google (Gmail) accounts, and groups, stored in SQLite.
// The database path comes from USERS_DB, defaulting to data/users.sqlite (denied to the web).

function users_db(): PDO
{
    static $db = null;
    if ($db !== null) {
        return $db;
    }
    $path = env('USERS_DB') ?: dirname(__DIR__) . '/data/users.sqlite';
    $db = new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec('PRAGMA foreign_keys = ON');
    $db->exec('PRAGMA busy_timeout = 5000');
    $db->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS user_emails (
            email TEXT PRIMARY KEY COLLATE NOCASE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            description TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY (group_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS user_emails_user ON user_emails(user_id);
        CREATE INDEX IF NOT EXISTS group_members_user ON group_members(user_id);
        SQL);
    return $db;
}

final class UserError extends RuntimeException
{
}

function clean_name(mixed $value, string $label, int $max = 80): string
{
    $name = trim(preg_replace('/\s+/u', ' ', is_string($value) ? $value : ''));
    if ($name === '') {
        throw new UserError("$label can't be empty.");
    }
    if (mb_strlen($name) > $max) {
        throw new UserError("$label must be $max characters or fewer.");
    }
    return $name;
}

function clean_email(mixed $value): string
{
    $email = strtolower(trim(is_string($value) ? $value : ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
        throw new UserError('Enter a valid Google account email address.');
    }
    return $email;
}

function run(string $sql, array $params = []): PDOStatement
{
    $statement = users_db()->prepare($sql);
    $statement->execute($params);
    return $statement;
}

function link_email(int $userId, mixed $email): void
{
    $email = clean_email($email);
    $owner = run('SELECT u.name FROM user_emails e JOIN users u ON u.id = e.user_id WHERE e.email = ?', [$email])->fetchColumn();
    if ($owner !== false) {
        throw new UserError("$email is already linked to $owner.");
    }
    run('INSERT INTO user_emails (email, user_id) VALUES (?, ?)', [$email, $userId]);
}

function add_user(mixed $name, mixed $email): void
{
    $name = clean_name($name, 'Name');
    $db = users_db();
    $db->beginTransaction();
    try {
        run('INSERT INTO users (name) VALUES (?)', [$name]);
        if (is_string($email) && trim($email) !== '') {
            link_email((int) $db->lastInsertId(), $email);
        }
        $db->commit();
    } catch (Throwable $error) {
        $db->rollBack();
        throw $error;
    }
}

function rename_user(int $id, mixed $name): void
{
    run('UPDATE users SET name = ? WHERE id = ?', [clean_name($name, 'Name'), $id]);
}

function delete_user(int $id): void
{
    run('DELETE FROM users WHERE id = ?', [$id]);
}

function unlink_email(mixed $email): void
{
    run('DELETE FROM user_emails WHERE email = ?', [is_string($email) ? $email : '']);
}

function save_group(?int $id, mixed $name, mixed $description): void
{
    $name = clean_name($name, 'Group name', 40);
    $description = trim(is_string($description) ? $description : '');
    if (mb_strlen($description) > 200) {
        throw new UserError('Description must be 200 characters or fewer.');
    }
    $taken = run('SELECT 1 FROM groups WHERE name = ? AND id IS NOT ?', [$name, $id])->fetchColumn();
    if ($taken) {
        throw new UserError("A group named $name already exists.");
    }
    if ($id === null) {
        run('INSERT INTO groups (name, description) VALUES (?, ?)', [$name, $description]);
    } else {
        run('UPDATE groups SET name = ?, description = ? WHERE id = ?', [$name, $description, $id]);
    }
}

function delete_group(int $id): void
{
    run('DELETE FROM groups WHERE id = ?', [$id]);
}

function add_member(int $groupId, int $userId): void
{
    run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [$groupId, $userId]);
}

function remove_member(int $groupId, int $userId): void
{
    run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [$groupId, $userId]);
}

// The user linked to a Google account, with their group names, or null.
function find_user(string $email): ?array
{
    $user = run('SELECT u.id, u.name FROM users u JOIN user_emails e ON e.user_id = u.id WHERE e.email = ?', [$email])->fetch();
    if ($user === false) {
        return null;
    }
    $user['groups'] = run('SELECT g.name FROM groups g JOIN group_members m ON m.group_id = g.id
                           WHERE m.user_id = ? ORDER BY g.name COLLATE NOCASE', [$user['id']])->fetchAll(PDO::FETCH_COLUMN);
    return $user;
}

// Every user with their emails and group ids, plus every group with its member count.
function directory(): array
{
    $users = [];
    foreach (run('SELECT id, name FROM users ORDER BY name COLLATE NOCASE') as $row) {
        $users[$row['id']] = $row + ['emails' => [], 'groups' => []];
    }
    foreach (run('SELECT email, user_id FROM user_emails ORDER BY email') as $row) {
        $users[$row['user_id']]['emails'][] = $row['email'];
    }
    foreach (run('SELECT group_id, user_id FROM group_members') as $row) {
        $users[$row['user_id']]['groups'][] = $row['group_id'];
    }
    $groups = [];
    foreach (run('SELECT g.id, g.name, g.description, COUNT(m.user_id) AS members
                  FROM groups g LEFT JOIN group_members m ON m.group_id = g.id
                  GROUP BY g.id ORDER BY g.name COLLATE NOCASE') as $row) {
        $groups[$row['id']] = $row;
    }
    return [$users, $groups];
}
