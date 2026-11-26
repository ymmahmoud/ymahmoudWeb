<?php

// User management: add and remove users, link Google accounts, and manage groups.

require __DIR__ . '/lib/auth.php';

start_session();
$admin = require_admin();
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $id = fn(string $key) => (int) ($_POST[$key] ?? 0);
    try {
        match ($_POST['action'] ?? '') {
            'add_user' => add_user($_POST['name'] ?? '', $_POST['email'] ?? ''),
            'rename_user' => rename_user($id('user'), $_POST['name'] ?? ''),
            'delete_user' => delete_user($id('user')),
            'link_email' => link_email($id('user'), $_POST['email'] ?? ''),
            'unlink_email' => unlink_email($_POST['email'] ?? ''),
            'add_group' => save_group(null, $_POST['name'] ?? '', $_POST['description'] ?? ''),
            'update_group' => save_group($id('group'), $_POST['name'] ?? '', $_POST['description'] ?? ''),
            'delete_group' => delete_group($id('group')),
            'add_member' => add_member($id('group'), $id('user')),
            'remove_member' => remove_member($id('group'), $id('user')),
        };
    } catch (UserError $error) {
        $_SESSION['flash'] = $error->getMessage();
    } catch (UnhandledMatchError) {
        $_SESSION['flash'] = 'Unknown action.';
    } catch (PDOException $error) {
        if ($error->getCode() !== '23000') {
            throw $error;
        }
        $_SESSION['flash'] = 'That change conflicts with existing data. Reload and try again.';
    }
    header('Location: /users', true, 303);
    exit;
}

[$users, $groups] = directory();
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);
$csrf = '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';

?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Users</title>
    <link rel="stylesheet" href="/assets/css/admin.css">
</head>
<body>
<main class="admin">
    <header class="admin-header">
        <h1>Users</h1>
        <form method="post" action="/signin" class="admin-account">
            <?= $csrf ?>
            <span><?= e($admin) ?></span>
            <button type="submit" class="button button--quiet">Sign out</button>
        </form>
    </header>

    <?php if ($flash !== null): ?>
        <p class="flash" role="alert"><?= e($flash) ?></p>
    <?php endif ?>

    <section aria-labelledby="users-heading">
        <h2 id="users-heading">People</h2>
        <form method="post" class="add-row">
            <?= $csrf ?>
            <input type="hidden" name="action" value="add_user">
            <label>Name <input name="name" required maxlength="80" autocomplete="off"></label>
            <label>Google account <input name="email" type="email" maxlength="254" placeholder="name@gmail.com" autocomplete="off"></label>
            <button type="submit" class="button">Add user</button>
        </form>

        <?php if ($users === []): ?>
            <p class="empty">No users yet.</p>
        <?php endif ?>

        <ul class="cards">
            <?php foreach ($users as $user): ?>
                <li class="card">
                    <div class="card-head">
                        <form method="post" class="inline">
                            <?= $csrf ?>
                            <input type="hidden" name="action" value="rename_user">
                            <input type="hidden" name="user" value="<?= $user['id'] ?>">
                            <input name="name" value="<?= e($user['name']) ?>" required maxlength="80" aria-label="Name" class="title-input">
                            <button type="submit" class="button button--quiet">Rename</button>
                        </form>
                        <form method="post" class="inline" onsubmit="return confirm(<?= e(json_encode("Remove {$user['name']} along with their Google accounts and group memberships?")) ?>)">
                            <?= $csrf ?>
                            <input type="hidden" name="action" value="delete_user">
                            <input type="hidden" name="user" value="<?= $user['id'] ?>">
                            <button type="submit" class="button button--danger">Remove</button>
                        </form>
                    </div>

                    <h3>Google accounts</h3>
                    <ul class="chips">
                        <?php foreach ($user['emails'] as $email): ?>
                            <li class="chip">
                                <?= e($email) ?>
                                <form method="post" class="inline">
                                    <?= $csrf ?>
                                    <input type="hidden" name="action" value="unlink_email">
                                    <input type="hidden" name="email" value="<?= e($email) ?>">
                                    <button type="submit" class="chip-remove" aria-label="Unlink <?= e($email) ?>">×</button>
                                </form>
                            </li>
                        <?php endforeach ?>
                    </ul>
                    <form method="post" class="inline">
                        <?= $csrf ?>
                        <input type="hidden" name="action" value="link_email">
                        <input type="hidden" name="user" value="<?= $user['id'] ?>">
                        <input name="email" type="email" required maxlength="254" placeholder="name@gmail.com" aria-label="Google account to link to <?= e($user['name']) ?>">
                        <button type="submit" class="button button--quiet">Link</button>
                    </form>

                    <h3>Groups</h3>
                    <ul class="chips">
                        <?php foreach ($user['groups'] as $groupId): ?>
                            <li class="chip">
                                <?= e($groups[$groupId]['name']) ?>
                                <form method="post" class="inline">
                                    <?= $csrf ?>
                                    <input type="hidden" name="action" value="remove_member">
                                    <input type="hidden" name="user" value="<?= $user['id'] ?>">
                                    <input type="hidden" name="group" value="<?= $groupId ?>">
                                    <button type="submit" class="chip-remove" aria-label="Remove from <?= e($groups[$groupId]['name']) ?>">×</button>
                                </form>
                            </li>
                        <?php endforeach ?>
                    </ul>
                    <?php $available = array_diff_key($groups, array_flip($user['groups'])) ?>
                    <?php if ($available !== []): ?>
                        <form method="post" class="inline">
                            <?= $csrf ?>
                            <input type="hidden" name="action" value="add_member">
                            <input type="hidden" name="user" value="<?= $user['id'] ?>">
                            <select name="group" aria-label="Group to add <?= e($user['name']) ?> to">
                                <?php foreach ($available as $group): ?>
                                    <option value="<?= $group['id'] ?>"><?= e($group['name']) ?></option>
                                <?php endforeach ?>
                            </select>
                            <button type="submit" class="button button--quiet">Add to group</button>
                        </form>
                    <?php endif ?>
                </li>
            <?php endforeach ?>
        </ul>
    </section>

    <section aria-labelledby="groups-heading">
        <h2 id="groups-heading">Groups</h2>
        <form method="post" class="add-row">
            <?= $csrf ?>
            <input type="hidden" name="action" value="add_group">
            <label>Name <input name="name" required maxlength="40" autocomplete="off"></label>
            <label>Description <input name="description" maxlength="200" autocomplete="off"></label>
            <button type="submit" class="button">Add group</button>
        </form>

        <?php if ($groups === []): ?>
            <p class="empty">No groups yet.</p>
        <?php endif ?>

        <ul class="cards">
            <?php foreach ($groups as $group): ?>
                <li class="card">
                    <form method="post" class="group-form">
                        <?= $csrf ?>
                        <input type="hidden" name="action" value="update_group">
                        <input type="hidden" name="group" value="<?= $group['id'] ?>">
                        <label>Name <input name="name" value="<?= e($group['name']) ?>" required maxlength="40"></label>
                        <label>Description <input name="description" value="<?= e($group['description']) ?>" maxlength="200"></label>
                        <button type="submit" class="button button--quiet">Save</button>
                    </form>
                    <div class="card-foot">
                        <span class="muted"><?= $group['members'] ?> <?= $group['members'] == 1 ? 'member' : 'members' ?></span>
                        <form method="post" class="inline" onsubmit="return confirm(<?= e(json_encode("Delete the {$group['name']} group? Its members stay as users.")) ?>)">
                            <?= $csrf ?>
                            <input type="hidden" name="action" value="delete_group">
                            <input type="hidden" name="group" value="<?= $group['id'] ?>">
                            <button type="submit" class="button button--danger">Delete</button>
                        </form>
                    </div>
                </li>
            <?php endforeach ?>
        </ul>
    </section>
</main>
</body>
</html>
