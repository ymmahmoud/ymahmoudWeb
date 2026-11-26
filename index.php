<?php

require __DIR__ . '/lib/auth.php';

resume_session();
$account = current_account();
$csrf = $account ? csrf_token() : '';
session_write_close();
$initials = $account ? implode('', array_map(fn($w) => mb_strtoupper(mb_substr($w, 0, 1)), array_slice(explode(' ', $account['name']), 0, 2))) : '';

$linkedin = 'https://www.linkedin.com/in/yaseen-mahmoud/';
$github = 'https://github.com/ymmahmoud';
$instagram = 'https://www.instagram.com/yaseen_qabany';

$dock = [
    'finder' => 'Finder',
    'notes' => 'Notes',
    'mail' => 'Mail',
    'phone' => 'Phone',
    'preview' => 'Preview',
    'photos' => 'Photos',
    'terminal' => 'Terminal',
    'tv' => 'TV',
    'settings' => 'System Settings',
];

$phoneDock = ['phone', 'mail', 'notes', 'photos'];

// Desktop pictures offered in System Settings › Wallpaper. The first is the default.
$wallpapers = [
    'red-mill' => ['Red Mill', 'assets/img/header-bg.jpg'],
    'golden-hour' => ['Golden Hour', 'assets/img/about/1.jpg'],
];
// Phone › Recents: the résumé as a call history, newest first. Each place is a contact,
// and each role there is one of its calls: [title, dates, details].
$recents = [
    'apple' => ['Apple', 'Now', [
        ['Software Systems Engineer', '2022 – Present', 'Phone and FaceTime.'],
        ['Software Engineering Intern', 'Jan – Aug 2021', ''],
    ]],
    'ltfd' => ['Lebanon Township Fire Department', 'Now', [
        ['Firefighter & EMT', '2017 – Present', 'Respond to 911 calls and run the department’s website and social media.'],
    ]],
    'e5' => ['E5 Support Services', '2022', [
        ['Emergency Medical Technician', 'Aug 2021 – Jul 2022', ''],
    ]],
    'halal-shack' => ['The Halal Shack', '2022', [
        ['Food Service', 'Oct 2018 – Jun 2022', ''],
    ]],
    'rpi' => ['Rensselaer Polytechnic Institute', '2022', [
        ['B.S. Information Technology & Web Science', '2018 – 2022', ''],
        ['B.S. Mechanical Engineering', '2018 – 2022', ''],
    ]],
    'mohawk' => ['Mohawk Ambulance Service', '2021', [
        ['Emergency Medical Technician', 'Aug 2020 – Aug 2021', ''],
    ]],
    'moch' => ['My Off Campus Housing', '2020', [
        ['Web Developer', 'May 2019 – 2020', 'Maintained the company’s WordPress site, improving its security, readability and search ranking, and grew page traffic 158%.'],
    ]],
    'rpi-ambulance' => ['RPI Ambulance', '2020', [
        ['President', '2019 – 2020', 'Led the campus ambulance agency and its officer board, managed its $22,000 annual budget, and worked with RPI administration to replace its ambulance.'],
    ]],
    'rensselaer-union' => ['Rensselaer Union', '2019', [
        ['Chair, Business Operations Committee', '2019', 'Helped allocate the Union’s $8 million annual budget.'],
    ]],
];
$monogram = fn($name) => implode('', array_map(fn($w) => mb_substr($w, 0, 1), array_slice(array_values(array_filter(explode(' ', $name), fn($w) => ctype_upper(mb_substr($w, 0, 1)) && $w !== 'The')), 0, 2)));

$homeScreen = array_diff_key($dock, array_flip($phoneDock));

$mailStatus = $_GET['mail'] ?? null;

// /tv, /watch, /donate, ?site= and the tv./watch. hosts open the TV app at that section.
$tvSections = ['tv', 'watch', 'donate'];
$tvHosts = [
    'tv' => 'tv.yaseenm.com',
    'watch' => 'watch.yaseenm.com',
];
$requestedSite = $tvSite
    ?? (is_string($_GET['site'] ?? null) ? $_GET['site'] : null)
    ?? array_search(strtolower($_SERVER['HTTP_HOST'] ?? ''), $tvHosts, true);
$tvSite = in_array($requestedSite, $tvSections, true) ? $requestedSite : null;
$venmo = 'https://venmo.com/u/Yaseen-Mahmoud';

// TV appears only for signed-in people, or when someone arrives from the TV or Watch sites.
$showTV = $tvSite !== null || $account !== null;
if (!$showTV) {
    unset($dock['tv']);
}

// A window owned by the app $appId (see assets/js/os/apps/). Fixed windows can't be resized or zoomed.
function win_open($id, $appId, $title, $width, $tools = '', $fixed = false)
{
    $t = htmlspecialchars($title);
    $fixedAttr = $fixed ? ' data-fixed' : '';
    echo <<<HTML
<section class="window glass glass--window" id="win-$id" data-app="$appId"$fixedAttr style="--w: {$width}px" role="dialog" aria-labelledby="t-$id">
    <header class="titlebar">
        <div class="lights">
            <button type="button" class="light light--close" aria-label="Close $t"></button>
            <button type="button" class="light light--min" aria-label="Minimize $t"></button>
            <button type="button" class="light light--max" aria-label="Zoom $t"></button>
        </div>
        <h2 id="t-$id">$t</h2>
        <div class="titlebar-tools">$tools</div>
    </header>
    <div class="window-body">
HTML;
}

function win_close()
{
    echo "    </div>\n</section>\n";
}

$svg_wifi = '<svg class="mb-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zm0-5.2c2 0 3.8.8 5.1 2.1l-1.6 1.6A5 5 0 0 0 12 15.5a5 5 0 0 0-3.5 1.5l-1.6-1.6A7.2 7.2 0 0 1 12 13.3zm0-5c3.4 0 6.4 1.3 8.7 3.5l-1.6 1.6A10 10 0 0 0 12 10.5a10 10 0 0 0-7.1 2.9l-1.6-1.6A12.3 12.3 0 0 1 12 8.3zm0-5c4.8 0 9.1 1.9 12 5l-1.5 1.6A14.5 14.5 0 0 0 12 5.5 14.5 14.5 0 0 0 1.5 9.9L0 8.3a16.6 16.6 0 0 1 12-5z"/><path class="wifi-slash" d="M3 2.5 21.5 21l-1.4 1.4L1.6 3.9z"/></svg>';
$svg_battery = '<svg class="mb-glyph mb-glyph--battery" viewBox="0 0 28 14" aria-hidden="true"><rect x=".5" y=".5" width="24" height="13" rx="4" fill="none" stroke="currentColor" opacity=".55"/><rect data-battery-level x="2.5" y="2.5" width="20" height="9" rx="2.2"/><rect x="25.5" y="4.5" width="2" height="5" rx="1" opacity=".55"/></svg>';
$svg_cc = '<svg class="mb-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a4 4 0 0 1 0 8H7a4 4 0 0 1 0-8zm10 1.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM7 12h10a4 4 0 0 1 0 8H7a4 4 0 0 1 0-8zm0 1.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/></svg>';
$svg_compose = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h8v2H6v12h12v-7h2v8H4V4zm13.6-1.4 2.8 2.8-8.6 8.6H10v-2.8z"/></svg>';
$svg_send = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 11.2 21 3l-8.2 18.5-2.2-7.3z"/></svg>';
$svg_linkedin = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>';
$svg_github = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3"/></svg>';
$svg_instagram = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.2-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z"/></svg>';
$svg_mail = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.3V17h16V7.3l-8 5.6z"/></svg>';
$svg_share = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4.8 8.4 7.4 7 6l5-5 5 5-1.4 1.4L13 4.8V15h-2zM5 10h3v2H6v8h12v-8h-2v-2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1z"/></svg>';
$svg_person = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"/></svg>';
$svg_google = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Yaseen Mahmoud</title>
    <meta name="description" content="Yaseen Mahmoud: Software Systems Engineer at Apple working on the Phone and FaceTime apps. RPI '22.">
    <meta name="color-scheme" content="light dark">
<?php if ($tvSite !== null): ?>
    <meta name="robots" content="noindex">
<?php endif ?>
    <script>
        document.documentElement.classList.add('js');
        try {
            const t = localStorage.getItem('yos.appearance');
            if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
            const w = <?= json_encode(array_map(fn($w) => $w[1], $wallpapers)) ?>[localStorage.getItem('yos.wallpaper')];
            if (w) document.documentElement.style.setProperty('--wallpaper-image', `url("${new URL(w, document.baseURI)}")`);
        } catch (e) {}
    </script>
    <link rel="stylesheet" href="assets/css/site.css">
    <script type="module" src="assets/js/os/main.js"></script>
</head>

<body<?= $tvSite ? " data-tv=\"$tvSite\"" : '' ?>>
    <header class="menubar">
        <nav class="menubar-group" aria-label="Menu bar">
            <div class="mb-menu">
                <button type="button" class="mb-item mb-logo" id="mb-y" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-y" aria-label="System menu">Y</button>
                <div class="menu glass glass--strong" id="menu-y" role="menu" aria-labelledby="mb-y" hidden>
                    <button type="button" role="menuitem" data-open="sysinfo">About YaseenOS</button>
                    <hr>
                    <button type="button" role="menuitem" data-open="settings">System Settings…</button>
                    <hr>
                    <button type="button" role="menuitem" data-action="sleep">Sleep</button>
                    <button type="button" role="menuitem" data-action="restart">Restart…</button>
                    <button type="button" role="menuitem" data-action="shut-down">Shut Down…</button>
                    <hr>
                    <button type="button" role="menuitem" data-action="lock-screen">Lock Screen</button>
<?php if ($account): ?>
                    <button type="button" role="menuitem" data-action="log-out">Log Out <?= e($account['name']) ?>…</button>
<?php endif ?>
                </div>
            </div>

            <!-- The active app's menus, filled in by assets/js/os/menubar.js. -->
            <div class="mb-menu">
                <button type="button" class="mb-item mb-app" id="mb-app" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-app" data-menu="app"><span id="app-name">Finder</span></button>
                <div class="menu glass glass--strong" id="menu-app" role="menu" aria-labelledby="mb-app" hidden></div>
            </div>

            <div class="mb-menu mb-menu--desktop">
                <button type="button" class="mb-item" id="mb-file" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-file" data-menu="file">File</button>
                <div class="menu glass glass--strong" id="menu-file" role="menu" aria-labelledby="mb-file" hidden></div>
            </div>

            <div class="mb-menu mb-menu--desktop">
                <button type="button" class="mb-item" id="mb-edit" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-edit" data-menu="edit">Edit</button>
                <div class="menu glass glass--strong" id="menu-edit" role="menu" aria-labelledby="mb-edit" hidden></div>
            </div>

            <div class="mb-menu mb-menu--desktop">
                <button type="button" class="mb-item" id="mb-view" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-view" data-menu="view">View</button>
                <div class="menu glass glass--strong" id="menu-view" role="menu" aria-labelledby="mb-view" hidden></div>
            </div>

            <div class="mb-menu mb-menu--desktop">
                <button type="button" class="mb-item" id="mb-window" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-window" data-menu="window">Window</button>
                <div class="menu glass glass--strong" id="menu-window" role="menu" aria-labelledby="mb-window" hidden></div>
            </div>

            <div class="mb-menu mb-menu--desktop">
                <button type="button" class="mb-item" id="mb-help" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-help" data-menu="help">Help</button>
                <div class="menu glass glass--strong" id="menu-help" role="menu" aria-labelledby="mb-help" hidden></div>
            </div>
        </nav>

        <div class="menubar-group menubar-group--status">
            <div class="mb-menu mb-menu--desktop">
                <button type="button" class="mb-item mb-icon" id="mb-wifi" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-wifi" aria-label="Wi-Fi"><?= $svg_wifi ?></button>
                <div class="menu menu--end glass glass--strong" id="menu-wifi" role="menu" aria-labelledby="mb-wifi" hidden>
                    <button type="button" role="menuitemcheckbox" aria-checked="true" class="menu-switch" data-action="wifi-toggle">Wi-Fi <span class="switch" aria-hidden="true"></span></button>
                    <hr>
                    <p class="menu-heading" role="presentation">Known Networks</p>
                    <button type="button" role="menuitemradio" aria-checked="true" data-action="wifi-join" data-arg="Home" data-needs="wifi">Home</button>
                    <button type="button" role="menuitemradio" aria-checked="false" data-action="wifi-join" data-arg="Office" data-needs="wifi">Office</button>
                    <button type="button" role="menuitemradio" aria-checked="false" data-action="wifi-join" data-arg="Guest" data-needs="wifi">Guest</button>
                </div>
            </div>

            <div class="mb-menu mb-menu--desktop">
                <button type="button" class="mb-item mb-icon" id="mb-battery" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-battery" aria-label="Battery">
                    <?= $svg_battery ?>
                </button>
                <div class="menu menu--end glass glass--strong" id="menu-battery" role="menu" aria-labelledby="mb-battery" hidden>
                    <p class="menu-heading" role="presentation" id="battery-label">Power Source: Power Adapter</p>
                    <hr>
                    <button type="button" role="menuitemcheckbox" aria-checked="false" data-action="low-power-toggle">Low Power Mode</button>
                </div>
            </div>

            <div class="mb-menu">
                <button type="button" class="mb-item mb-icon" id="mb-cc" aria-haspopup="dialog" aria-expanded="false" aria-controls="control-center" aria-label="Control Center"><span class="mb-desktop-glyph"><?= $svg_cc ?></span><span class="mb-phone-glyphs"><?= $svg_wifi ?><?= $svg_battery ?></span></button>
                <div class="panel panel--end control-center" id="control-center" role="dialog" aria-label="Control Center" hidden>
                    <div class="cc-tile cc-tile--tall glass">
                        <button type="button" class="cc-toggle" data-action="wifi-toggle" data-keep-open aria-pressed="true">
                            <span class="cc-bubble"><?= $svg_wifi ?></span>
                            <span><b>Wi-Fi</b><small data-wifi-name>Home</small></span>
                        </button>
                        <button type="button" class="cc-toggle" data-action="low-power-toggle" data-keep-open aria-pressed="false">
                            <span class="cc-bubble"><svg viewBox="0 0 28 14" aria-hidden="true"><rect x="1" y="1" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3.5" y="3.5" width="8" height="7" rx="1.5"/><rect x="24.5" y="4.5" width="2" height="5" rx="1"/></svg></span>
                            <span><b>Low Power</b><small>Reduce transparency and motion</small></span>
                        </button>
                    </div>
                    <div class="cc-tile glass">
                        <button type="button" class="cc-toggle" data-action="dark-mode-toggle" data-keep-open aria-pressed="false">
                            <span class="cc-bubble"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.5 0-.9-.1-1.4A5.5 5.5 0 0 1 13.4 3.1L12 3z"/></svg></span>
                            <span><b>Dark Mode</b></span>
                        </button>
                    </div>
                    <div class="cc-tile cc-tile--wide glass">
                        <label class="cc-label" for="brightness">Display</label>
                        <input type="range" class="slider" id="brightness" min="40" max="100" value="100">
                    </div>
                </div>
            </div>

            <div class="mb-menu">
                <button type="button" class="mb-item mb-clock" id="mb-clock" aria-haspopup="dialog" aria-expanded="false" aria-controls="widgets" aria-label="Date, time and widgets"><time id="clock"><span class="clock-date"></span> <span class="clock-time"></span></time></button>
                <div class="panel panel--end widgets" id="widgets" role="dialog" aria-label="Widgets" hidden>
                    <div class="widget glass">
                        <p class="widget-kicker">Mail</p>
                        <p class="widget-title">Get in touch with Yaseen</p>
                        <button type="button" class="btn btn--glass" data-open="compose">New Message</button>
                    </div>
                    <div class="widget glass calendar" id="calendar" aria-label="Calendar"></div>
                </div>
            </div>
        </div>
    </header>

    <main id="desktop" class="desktop">
        <ul class="home-screen" aria-label="Home Screen">
            <?php foreach ($homeScreen as $id => $title): ?>
            <li><button type="button" class="home-app" data-app="<?= $id ?>"><span class="app-icon" style="--tile: var(--icon-<?= $id ?>)" aria-hidden="true"></span><?= $title ?></button></li>
            <?php endforeach; ?>
        </ul>

        <ul class="desk-icons" id="desk-icons" aria-label="Desktop">
            <li><button type="button" class="desk-icon" data-launch="notes"><span class="file-icon file-icon--note" aria-hidden="true"></span><span class="desk-label">About Me</span></button></li>
            <li><button type="button" class="desk-icon" data-launch="preview"><span class="file-icon file-icon--pdf" aria-hidden="true"></span><span class="desk-label">Résumé.pdf</span></button></li>
            <li><button type="button" class="desk-icon" data-launch="photos"><img class="file-thumb" src="assets/img/header-bg.jpg" alt=""><span class="desk-label">Home.jpg</span></button></li>
        </ul>

        <?php win_open('finder', 'finder', 'Recents', 640); ?>
        <div class="split">
            <nav class="sidebar glass glass--inset" aria-label="Finder sidebar">
                <p class="sidebar-heading">Favorites</p>
                <button type="button" data-folder="recents" aria-current="true">Recents</button>
                <button type="button" data-folder="desktop">Desktop</button>
                <button type="button" data-folder="documents">Documents</button>
                <button type="button" data-folder="pictures">Pictures</button>
                <p class="sidebar-heading">Locations</p>
                <button type="button" data-open="trash">Trash</button>
            </nav>
            <ul class="finder-grid" aria-label="Files">
                <li data-folders="recents desktop documents"><button type="button" class="finder-item" data-launch="notes"><span class="file-icon file-icon--note" aria-hidden="true"></span><span>About Me</span></button></li>
                <li data-folders="recents desktop documents"><button type="button" class="finder-item" data-launch="preview"><span class="file-icon file-icon--pdf" aria-hidden="true"></span><span>Résumé.pdf</span></button></li>
                <li data-folders="recents desktop pictures"><button type="button" class="finder-item" data-launch="photos"><img class="file-thumb" src="assets/img/header-bg.jpg" alt=""><span>Home.jpg</span></button></li>
                <li data-folders="pictures"><button type="button" class="finder-item" data-launch="photos"><img class="file-thumb" src="assets/img/about/1.jpg" alt=""><span>Golden Hour.jpg</span></button></li>
            </ul>
        </div>
        <?php win_close(); ?>

        <?php win_open('notes', 'notes', 'Notes', 720); ?>
        <div class="split">
            <ul class="sidebar note-list glass glass--inset" aria-label="Notes">
                <li><button type="button" data-note="about"><strong>About Me</strong><small>2026 · Software Systems Engineer at Apple</small></button></li>
                <li><button type="button" data-note="ems"><strong>Emergency Medical Services</strong><small>2017 – 2022 · Firefighter, EMT, President</small></button></li>
                <li><button type="button" data-note="education"><strong>Education</strong><small>2022 · Rensselaer Polytechnic Institute</small></button></li>
            </ul>
            <div class="note-pane">
                <article class="note" data-note="about">
                    <h1>About Me</h1>
                    <p>I'm a Software Systems Engineer at Apple, working on the Phone and FaceTime apps.</p>
                    <p>I care most about software people depend on in critical moments. Before engineering, I spent several years in emergency medical services as a firefighter and EMT, and that experience still shapes how I think about reliability and the people on the other end of a call.</p>
                    <p>I studied Information Technology &amp; Web Science and Mechanical Engineering at Rensselaer Polytechnic Institute, graduating in 2022.</p>
                    <p>To get in touch, open <button type="button" class="link" data-open="compose">Mail</button> and send me a message.</p>
                </article>
                <article class="note" data-note="ems">
                    <h1>Emergency Medical Services</h1>
                    <h2>RPI Ambulance · President, 2019 – 2020</h2>
                    <ul>
                        <li>Led the campus basic life support agency and its officer board.</li>
                        <li>Rewrote the agency's governing documents.</li>
                        <li>Worked with the county medical director and RPI administration on the purchase of a new ambulance.</li>
                        <li>Secured $4,500 in medical supplies and managed a $22,000 annual budget.</li>
                    </ul>
                    <h2>Lebanon Township Fire Department · Firefighter / EMT, since 2017</h2>
                    <p>Responded to 911 calls and managed the department's website and social media.</p>
                    <h2>EMT</h2>
                    <p>Mohawk Ambulance Service, 2020 – 2021. E5 Support Services, 2021 – 2022.</p>
                </article>
                <article class="note" data-note="education">
                    <h1>Education</h1>
                    <h2>Rensselaer Polytechnic Institute · 2018 – 2022</h2>
                    <ul>
                        <li>B.S. Information Technology &amp; Web Science</li>
                        <li>B.S. Mechanical Engineering</li>
                    </ul>
                    <p>Chair of the Rensselaer Union Business Operations Committee, which helps allocate the Union's $8 million budget.</p>
                </article>
            </div>
        </div>
        <?php win_close(); ?>

        <?php win_open('mail', 'mail', 'Inbox', 760, '<button type="button" class="tool" data-open="compose" aria-label="New Message" title="New Message">' . $svg_compose . '</button>'); ?>
        <div class="split mail">
            <nav class="sidebar glass glass--inset" aria-label="Mailboxes">
                <p class="sidebar-heading">Mailboxes</p>
                <button type="button" data-mailbox="inbox" aria-current="true">Inbox <span class="badge" id="inbox-count" hidden>0</span></button>
                <button type="button" data-mailbox="sent">Sent <span class="badge" id="sent-count" hidden>0</span></button>
            </nav>
            <ul class="mail-list" id="mail-list" aria-label="Messages">
                <li data-mailbox="inbox"><button type="button" data-message="welcome" data-unread><strong>Yaseen Mahmoud</strong><span>Thanks for stopping by</span><small>Today</small></button></li>
                <li class="mail-empty" data-mailbox="sent">No Messages</li>
            </ul>
            <div class="mail-reader" id="mail-reader">
                <article class="message" data-message="welcome">
                    <header>
                        <p class="message-from">Yaseen Mahmoud</p>
                        <p class="message-meta">To: You · Today</p>
                        <h3>Thanks for stopping by</h3>
                    </header>
                    <p>Hi there,</p>
                    <p>Thanks for visiting. The quickest way to reach me is right here in Mail: click the compose button in the toolbar, or choose File › New Message, and your note goes straight to my inbox.</p>
                    <p>You can also find me on <a href="<?= $linkedin ?>">LinkedIn</a> and <a href="<?= $github ?>">GitHub</a>.</p>
                    <p>Yaseen</p>
                    <button type="button" class="btn btn--primary" data-open="compose">Reply</button>
                </article>
            </div>
        </div>
        <?php win_close(); ?>

        <?php win_open('compose', 'mail', 'New Message', 560, '<button type="submit" class="tool" form="compose-form" id="compose-send" aria-label="Send" title="Send">' . $svg_send . '</button>'); ?>
        <form class="compose" id="compose-form" action="assets/mail.php" method="post">
            <div class="compose-row">
                <span class="compose-label">To:</span>
                <span class="recipient">Yaseen Mahmoud</span>
            </div>
            <label class="compose-row">
                <span class="compose-label">Name:</span>
                <input name="name" autocomplete="name" maxlength="100" required>
            </label>
            <label class="compose-row">
                <span class="compose-label">From:</span>
                <input name="email" type="email" autocomplete="email" maxlength="254" required placeholder="you@example.com">
            </label>
            <label class="compose-row">
                <span class="compose-label">Subject:</span>
                <input name="subject" maxlength="150" required>
            </label>
            <label class="compose-trap" aria-hidden="true">Company <input name="company" tabindex="-1" autocomplete="off"></label>
            <textarea name="message" class="compose-body" maxlength="5000" required aria-label="Message"></textarea>
            <?php if ($mailStatus === 'sent'): ?><p class="compose-status">Your message was sent.</p><?php elseif ($mailStatus === 'error'): ?><p class="compose-status">Your message couldn't be sent. Please try LinkedIn.</p><?php endif; ?>
        </form>
        <?php win_close(); ?>

        <?php win_open('phone', 'phone', 'Recents', 720); ?>
        <div class="split phone-app" data-view="list">
            <nav class="sidebar glass glass--inset phone-list" aria-label="Recents">
                <button type="button" class="call-row" data-contact="me" aria-current="true">
                    <span class="avatar avatar--sm" aria-hidden="true">YM</span>
                    <span class="call-text"><strong>Yaseen Mahmoud</strong><span>My Card</span></span>
                </button>
                <p class="sidebar-heading">Recents</p>
                <?php foreach ($recents as $id => [$name, $when, $calls]): ?>
                <button type="button" class="call-row" data-contact="<?= $id ?>">
                    <span class="avatar avatar--sm" aria-hidden="true"><?= $monogram($name) ?></span>
                    <span class="call-text"><strong><?= htmlspecialchars($name) ?></strong><span><?= htmlspecialchars($calls[0][0]) ?></span></span>
                    <small><?= $when ?></small>
                </button>
                <?php endforeach; ?>
            </nav>
            <div class="phone-detail">
                <button type="button" class="phone-back" data-phone-back><span aria-hidden="true">‹</span> Recents</button>
                <article class="contact-card" data-contact="me">
                    <div class="avatar" aria-hidden="true">YM</div>
                    <h3 class="contact-name">Yaseen Mahmoud</h3>
                    <p class="contact-sub">Software Systems Engineer · Apple</p>
                    <div class="contact-actions">
                        <button type="button" data-open="compose"><span class="contact-round"><?= $svg_mail ?></span>mail</button>
                        <a href="<?= $linkedin ?>"><span class="contact-round"><?= $svg_linkedin ?></span>LinkedIn</a>
                        <a href="<?= $github ?>"><span class="contact-round"><?= $svg_github ?></span>GitHub</a>
                        <a href="<?= $instagram ?>"><span class="contact-round"><?= $svg_instagram ?></span>Instagram</a>
                    </div>
                    <dl class="contact-fields">
                        <div><dt>work</dt><dd>Apple · Phone &amp; FaceTime</dd></div>
                        <div><dt>linkedin</dt><dd><a href="<?= $linkedin ?>">linkedin.com/in/yaseen-mahmoud</a></dd></div>
                        <div><dt>github</dt><dd><a href="<?= $github ?>">github.com/ymmahmoud</a></dd></div>
                    </dl>
                </article>
                <?php foreach ($recents as $id => [$name, $when, $calls]): ?>
                <article class="contact-card" data-contact="<?= $id ?>" hidden>
                    <div class="avatar" aria-hidden="true"><?= $monogram($name) ?></div>
                    <h3 class="contact-name"><?= htmlspecialchars($name) ?></h3>
                    <p class="contact-sub"><?= htmlspecialchars($calls[0][0]) ?></p>
                    <ul class="contact-fields call-history">
                        <?php foreach ($calls as [$title, $dates, $details]): ?>
                        <li>
                            <p class="call-when"><?= $dates ?></p>
                            <p class="call-title"><?= htmlspecialchars($title) ?></p>
                            <?php if ($details): ?><p class="call-details"><?= htmlspecialchars($details) ?></p><?php endif; ?>
                        </li>
                        <?php endforeach; ?>
                    </ul>
                </article>
                <?php endforeach; ?>
            </div>
        </div>
        <?php win_close(); ?>

        <?php win_open('preview', 'preview', 'Résumé.pdf', 680); ?>
        <div class="preview-canvas">
            <article class="page">
                <header class="page-header">
                    <h1>Yaseen M. Mahmoud</h1>
                    <p>Software Systems Engineer · <a href="<?= $linkedin ?>">linkedin.com/in/yaseen-mahmoud</a> · <a href="<?= $github ?>">github.com/ymmahmoud</a></p>
                </header>
                <section>
                    <h2>Experience</h2>
                    <div class="entry"><h3>Apple</h3><span>2022 – Present</span><p>Software Systems Engineer, Phone and FaceTime.</p></div>
                    <div class="entry"><h3>Apple</h3><span>Jan 2021 – Aug 2021</span><p>Software Engineering Intern.</p></div>
                    <div class="entry"><h3>E5 Support Services</h3><span>Aug 2021 – Jul 2022</span><p>Emergency Medical Technician.</p></div>
                    <div class="entry"><h3>Mohawk Ambulance Service</h3><span>Aug 2020 – Aug 2021</span><p>Emergency Medical Technician.</p></div>
                    <div class="entry"><h3>My Off Campus Housing</h3><span>May 2019 – 2020</span><p>Web Developer. Maintained the company’s WordPress site, improving its security, readability and search ranking, and grew page traffic 158%.</p></div>
                    <div class="entry"><h3>The Halal Shack</h3><span>Oct 2018 – Jun 2022</span><p>Food service.</p></div>
                </section>
                <section>
                    <h2>Education</h2>
                    <div class="entry"><h3>Rensselaer Polytechnic Institute</h3><span>2018 – 2022</span><p>B.S. Information Technology &amp; Web Science<br>B.S. Mechanical Engineering</p></div>
                </section>
                <section>
                    <h2>Leadership &amp; Service</h2>
                    <div class="entry"><h3>RPI Ambulance</h3><span>2019 – 2020</span><p>President. Led the campus ambulance agency and its officer board, managed its $22,000 annual budget, and worked with RPI administration to replace its ambulance.</p></div>
                    <div class="entry"><h3>Lebanon Township Fire Department</h3><span>2017 – Present</span><p>Firefighter and EMT. Respond to 911 calls and run the department’s website and social media.</p></div>
                    <div class="entry"><h3>Rensselaer Union</h3><span>2019</span><p>Chair, Business Operations Committee. Helped allocate the Union’s $8 million annual budget.</p></div>
                </section>
            </article>
        </div>
        <?php win_close(); ?>

        <?php win_open('photos', 'photos', 'Photos', 600); ?>
        <div class="photos">
            <figure>
                <button type="button" class="photo" aria-pressed="false" aria-label="Enlarge Red Mill, Clinton, New Jersey">
                    <img src="assets/img/header-bg.jpg" alt="The Red Mill and waterfall in Clinton, New Jersey">
                </button>
                <figcaption>Red Mill · Clinton, New Jersey</figcaption>
            </figure>
            <figure>
                <button type="button" class="photo" aria-pressed="false" aria-label="Enlarge Golden Hour">
                    <img src="assets/img/about/1.jpg" alt="Granite cliffs and a valley at golden hour">
                </button>
                <figcaption>Golden Hour</figcaption>
            </figure>
        </div>
        <?php win_close(); ?>

        <?php win_open('terminal', 'terminal', 'visitor — zsh', 620); ?>
        <div class="term">
            <div id="term-out" class="term-out" aria-live="polite">
                <div>Last login: today on ttys001</div>
                <div>Type <b>help</b> for a list of commands.</div>
            </div>
            <form id="term-form" class="term-line" autocomplete="off">
                <label for="term-in">visitor@yaseen ~ %</label>
                <input id="term-in" data-autofocus spellcheck="false" autocapitalize="off">
            </form>
        </div>
        <?php win_close(); ?>

        <?php win_open('trash', 'finder', 'Trash', 520, '<button type="button" class="tool tool--text" id="empty-trash">Empty</button>'); ?>
        <table class="file-table">
            <thead><tr><th>Name</th><th>Date Deleted</th><th>Kind</th></tr></thead>
            <tbody id="trash-items">
                <tr><td><span class="file-icon file-icon--folder" aria-hidden="true"></span>website_2020</td><td>Nov 24, 2026</td><td>Folder</td></tr>
            </tbody>
        </table>
        <p class="file-table-empty" id="trash-empty" hidden>Trash is empty</p>
        <?php win_close(); ?>

        <?php if ($showTV): ?>
        <?php
        $svg_home = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 2.5 11l1.3 1.5L5 11.6V20a1 1 0 0 0 1 1h4.5v-6h3v6H18a1 1 0 0 0 1-1v-8.4l1.2 1 1.3-1.6z"/></svg>';
        $svg_request = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v12h14V6zm6 2h2v3h3v2h-3v3h-2v-3H8v-2h3z"/></svg>';
        $svg_play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
        $svg_device = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h14a1 1 0 0 1 1 1v9H2V6a1 1 0 0 1 1-1zm1 2v6h12V7zM1 16h18l-1 2H2zm19.5-8h1A1.5 1.5 0 0 1 23 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 19 18.5v-9A1.5 1.5 0 0 1 20.5 8z"/></svg>';
        $svg_tv = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-8v1.5h4V21H7v-1.5h4V18H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v10h16V6z"/></svg>';
        $svg_search = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 3a7.5 7.5 0 0 1 6 12l4.8 4.8-1.5 1.5-4.8-4.8A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/></svg>';
        $svg_heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5A5.4 5.4 0 0 1 7.5 3c1.7 0 3.4.8 4.5 2.1A6 6 0 0 1 16.5 3 5.4 5.4 0 0 1 22 8.5c0 3.8-3.4 6.9-8.6 11.5z"/></svg>';
        $svg_drive = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 10v4h14v-4zm11 1.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm2.5 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z"/></svg>';
        $tv_footer = '<p class="tv-footer">The only recurring costs are hard drives and SSDs. <a href="/donate" data-tv-go="donate">Chip in</a> · <a href="/privacy">Privacy policy</a></p>';
        $svg_key = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 7a5 5 0 0 1 4.9 4H22v3h-2v3h-3v-3h-4.6A5 5 0 1 1 7.5 7zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>';
        $logo_jellyfin = '<svg class="tv-logo" viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="jellyfin-gradient" x1="110" y1="190" x2="440" y2="420" gradientUnits="userSpaceOnUse"><stop stop-color="#AA5CC3"/><stop offset="1" stop-color="#00A4DC"/></linearGradient></defs><path fill="url(#jellyfin-gradient)" fill-rule="evenodd" d="M256 48c-44 0-208 298-186 343s350 45 372 0S300 48 256 48zm0 118c25 0 110 157 98 182s-184 25-196 0 73-182 98-182zm0 70c-12 0-46 80-40 92s74 12 80 0-28-92-40-92z"/></svg>';
        $logo_seerr = '<svg class="tv-logo" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="seerr-gradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#818CF8"/><stop offset="1" stop-color="#C084FC"/></linearGradient></defs><circle cx="32" cy="32" r="28" fill="url(#seerr-gradient)"/><path fill="#fff" d="M26 21v22l18-11z"/></svg>';
        win_open('tv', 'tv', 'TV', 940, '<button type="button" class="tool" data-tv="share" aria-label="Copy link" title="Copy link">' . $svg_share . '</button>');
        ?>
        <div class="split tv">
            <nav class="sidebar glass glass--inset" aria-label="TV sidebar">
                <button type="button" data-tv-tab="tv" aria-current="true"><span class="tv-tab"><?= $svg_home ?>Home</span></button>
                <button type="button" data-tv-tab="watch" aria-current="false"><span class="tv-tab"><?= $svg_request ?>Requests</span></button>
                <button type="button" data-tv-tab="donate" aria-current="false"><span class="tv-tab"><?= $svg_heart ?>Donate</span></button>
            </nav>
            <div class="tv-content">
                <section class="tv-section" data-site="tv" data-url="tv.yaseenm.com" aria-label="Home">
                    <div class="tv-hero tv-hero--jellyfin">
                        <?= $logo_jellyfin ?>
                        <p class="tv-eyebrow">Jellyfin</p>
                        <h3 class="tv-hero-title">The family library</h3>
                        <p class="tv-hero-text">Movies and shows, on every screen in the house.</p>
                        <div class="tv-actions">
                            <a class="tv-button tv-button--primary" href="https://tv.yaseenm.com/sso/OID/start/google"><?= $svg_google ?>Sign in with Google</a>
                            <a class="tv-button" href="https://tv.yaseenm.com/web/"><?= $svg_play ?>Open Jellyfin</a>
                        </div>
                    </div>
                    <h4 class="tv-shelf-title">Set Up</h4>
                    <ul class="tv-shelf">
                        <li class="tv-tile">
                            <span class="tv-art tv-art--blue"><?= $svg_device ?></span>
                            <strong>Phone or Computer</strong>
                            <span>Sign in above. In the Jellyfin app, add the server <b>https://tv.yaseenm.com</b> first.</span>
                        </li>
                        <li class="tv-tile">
                            <span class="tv-art tv-art--purple"><?= $svg_tv ?></span>
                            <strong>TV</strong>
                            <span>In the Jellyfin TV app, enter the server <b>https://tv.yaseenm.com</b> and choose <b>Quick Connect</b>.</span>
                        </li>
                        <li class="tv-tile">
                            <span class="tv-art tv-art--teal"><?= $svg_key ?></span>
                            <strong>Quick Connect</strong>
                            <span>Signed in on your phone, open your profile, tap <b>Quick Connect</b> and type the code from the TV.</span>
                        </li>
                    </ul>
                    <h4 class="tv-shelf-title">Looking for Something?</h4>
                    <ul class="tv-shelf">
                        <li class="tv-tile">
                            <a class="tv-art tv-art--seerr" href="https://watch.yaseenm.com" data-tv-go="watch" aria-label="Go to Requests"><?= $svg_search ?></a>
                            <strong>Request It</strong>
                            <span>Ask for movies and shows on <a href="https://watch.yaseenm.com" data-tv-go="watch">watch.yaseenm.com</a>.</span>
                        </li>
                    </ul>
                    <?= $tv_footer ?>
                </section>

                <section class="tv-section" data-site="watch" data-url="watch.yaseenm.com" aria-label="Requests" hidden>
                    <div class="tv-hero tv-hero--seerr">
                        <?= $logo_seerr ?>
                        <p class="tv-eyebrow">Seerr</p>
                        <h3 class="tv-hero-title">Request anything</h3>
                        <p class="tv-hero-text">Browse and request movies and shows.</p>
                        <div class="tv-actions">
                            <a class="tv-button tv-button--primary" href="https://watch.yaseenm.com/login"><?= $svg_google ?>Sign in with Google</a>
                        </div>
                    </div>
                    <h4 class="tv-shelf-title">How It Works</h4>
                    <ul class="tv-shelf">
                        <li class="tv-tile">
                            <span class="tv-art tv-art--seerr"><?= $svg_request ?></span>
                            <strong>Request</strong>
                            <span>Find a movie or show and request it. It shows up in Jellyfin once it's downloaded.</span>
                        </li>
                        <li class="tv-tile">
                            <a class="tv-art tv-art--blue" href="https://tv.yaseenm.com" data-tv-go="tv" aria-label="Go to Home"><?= $svg_play ?></a>
                            <strong>Watch</strong>
                            <span>Everything you can watch is on <a href="https://tv.yaseenm.com" data-tv-go="tv">tv.yaseenm.com</a>.</span>
                        </li>
                        <li class="tv-tile">
                            <span class="tv-art tv-art--teal"><?= $svg_key ?></span>
                            <strong>No Passwords</strong>
                            <span>Both sites use the Google account you gave Yaseen.</span>
                        </li>
                    </ul>
                    <?= $tv_footer ?>
                </section>

                <section class="tv-section" data-site="donate" data-url="yaseenm.com/donate" aria-label="Donate" hidden>
                    <div class="tv-hero tv-hero--donate">
                        <span class="tv-logo tv-logo--glyph"><?= $svg_heart ?></span>
                        <p class="tv-eyebrow">Donate</p>
                        <h3 class="tv-hero-title">Keep the library growing</h3>
                        <p class="tv-hero-text">The only recurring costs are hard drives and SSDs. If you'd like to help, Venmo is the easiest way.</p>
                        <div class="tv-actions">
                            <a class="tv-button tv-button--primary" href="<?= $venmo ?>"><?= $svg_heart ?>Venmo @Yaseen-Mahmoud</a>
                        </div>
                    </div>
                    <h4 class="tv-shelf-title">Where It Goes</h4>
                    <ul class="tv-shelf">
                        <li class="tv-tile">
                            <span class="tv-art tv-art--teal"><?= $svg_drive ?></span>
                            <strong>Hard Drives and SSDs</strong>
                            <span>Storage is the only recurring cost: more space as the library grows, and replacements as drives wear out.</span>
                        </li>
                        <li class="tv-tile">
                            <a class="tv-art tv-art--venmo" href="<?= $venmo ?>" aria-label="Open Venmo"><?= $svg_heart ?></a>
                            <strong>Venmo</strong>
                            <span>Send anything to <a href="<?= $venmo ?>"><b>@Yaseen-Mahmoud</b></a>.</span>
                        </li>
                    </ul>
                    <p class="tv-footer"><a href="/privacy">Privacy policy</a></p>
                </section>
            </div>
        </div>
        <?php win_close(); ?>
        <?php endif ?>

        <?php win_open('settings', 'settings', 'System Settings', 680); ?>
        <div class="split settings">
            <nav class="sidebar glass glass--inset" aria-label="Settings">
                <button type="button" class="settings-account" data-pane="account" aria-current="true">
                    <span class="avatar avatar--sm" aria-hidden="true"><?= $account ? e($initials) : $svg_person ?></span>
                    <span><strong><?= $account ? e($account['name']) : 'Sign In' ?></strong><small><?= $account ? e($account['email']) : 'Google account' ?></small></span>
                </button>
                <button type="button" data-pane="appearance" aria-current="false">Appearance</button>
                <button type="button" data-pane="wallpaper" aria-current="false">Wallpaper</button>
            </nav>
            <div class="settings-pane" data-pane="account">
                <?php if ($account): ?>
                    <div class="avatar" aria-hidden="true"><?= e($initials) ?></div>
                    <h3><?= e($account['name']) ?></h3>
                    <p class="settings-muted"><?= e($account['email']) ?></p>
                    <?php if ($account['groups']): ?>
                        <ul class="settings-groups" aria-label="Groups">
                            <?php foreach ($account['groups'] as $group): ?><li><?= e($group) ?></li><?php endforeach ?>
                        </ul>
                    <?php endif ?>
                    <p class="settings-note">You're signed in. TV is in the Dock.</p>
                    <div class="settings-actions">
                        <?php if ($account['admin']): ?><a class="btn" href="/users">Manage Users…</a><?php endif ?>
                        <form method="post" action="/signin" id="signout-form">
                            <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
                            <input type="hidden" name="return" value="/#settings">
                            <button type="submit" class="btn">Sign Out…</button>
                        </form>
                    </div>
                <?php else: ?>
                    <div class="avatar" aria-hidden="true"><?= $svg_person ?></div>
                    <h3>Sign In</h3>
                    <p class="settings-muted">Sign in with your Google account to see your apps.</p>
                    <div class="settings-actions">
                        <a class="btn btn--google" href="/signin?return=<?= rawurlencode('/#settings') ?>"><?= $svg_google ?>Sign in with Google</a>
                    </div>
                <?php endif ?>
            </div>
            <div class="settings-pane" data-pane="appearance" hidden>
                <h3>Appearance</h3>
                <div class="segmented" role="group" aria-label="Appearance">
                    <button type="button" data-action="appearance" data-arg="auto" aria-pressed="true">Auto</button>
                    <button type="button" data-action="appearance" data-arg="light" aria-pressed="false">Light</button>
                    <button type="button" data-action="appearance" data-arg="dark" aria-pressed="false">Dark</button>
                </div>
            </div>
            <div class="settings-pane" data-pane="wallpaper" hidden>
                <h3>Wallpaper</h3>
                <div class="wallpapers">
                    <?php foreach ($wallpapers as $key => [$name, $src]): ?>
                    <button type="button" class="wallpaper" data-wallpaper="<?= $key ?>" aria-pressed="false"><img src="<?= $src ?>" alt=""><?= $name ?></button>
                    <?php endforeach ?>
                </div>
            </div>
        </div>
        <?php win_close(); ?>

        <?php win_open('help', 'help', 'YaseenOS Help', 460); ?>
        <div class="pad help">
            <h3>Getting around</h3>
            <ul>
                <li>Click an app in the Dock to open it. Double-click files on the desktop or in Finder.</li>
                <li>Drag a window by its title bar, or resize it from any edge. Double-click the title bar to zoom.</li>
                <li>The red, yellow and green buttons close, minimize and enter full screen. Option-click green to zoom.</li>
                <li>Closing an app's last window leaves it running; choose Quit from its menu or Dock menu to quit it.</li>
                <li>Use the arrow keys to move through menu bar menus. Right-click the Dock, desktop or a file for more.</li>
                <li>Click the clock for the calendar, or Control Center for Wi-Fi, Dark Mode and brightness.</li>
                <li>Links such as <code>#mail</code> open straight to an app.</li>
            </ul>
        </div>
        <?php win_close(); ?>

        <?php win_open('sysinfo', 'finder', 'About YaseenOS', 360, '', true); ?>
        <div class="pad sysinfo">
            <div class="avatar avatar--brand" aria-hidden="true">YM</div>
            <h3>YaseenOS</h3>
            <p class="when">Version 27.0</p>
            <dl>
                <dt>Owner</dt><dd>Yaseen M. Mahmoud</dd>
                <dt>Role</dt><dd>Software Systems Engineer, Apple</dd>
                <dt>Education</dt><dd>Rensselaer Polytechnic Institute, 2022</dd>
                <dt>Built with</dt><dd>HTML, CSS and JavaScript</dd>
            </dl>
            <p class="aside">© <?= date('Y') ?> Yaseen M. Mahmoud</p>
        </div>
        <?php win_close(); ?>
    </main>

    <nav class="dock" aria-label="Dock">
        <ul class="dock-shelf glass">
            <?php foreach ($dock as $id => $title): ?>
            <li class="dock-item<?= in_array($id, $phoneDock, true) ? ' dock-item--phone' : '' ?>" data-app="<?= $id ?>"><button type="button" class="dock-tile" style="--tile: var(--icon-<?= $id ?>)" data-app="<?= $id ?>" aria-label="<?= $title ?>"></button><span class="dock-tip glass glass--strong" aria-hidden="true"><?= $title ?></span></li>
            <?php endforeach; ?>
            <li class="dock-sep" aria-hidden="true"></li>
            <li class="dock-item" data-app="trash"><button type="button" class="dock-tile dock-tile--trash" data-open="trash" aria-label="Trash"></button><span class="dock-tip glass glass--strong" aria-hidden="true">Trash</span></li>
        </ul>
    </nav>

    <button type="button" class="home-indicator" data-action="go-home" aria-label="Go to Home Screen"></button>

    <div class="menu menu--context glass glass--strong" id="context-menu" role="menu" aria-label="Shortcuts" hidden></div>

    <dialog class="alert glass glass--strong" id="alert" aria-labelledby="alert-title" aria-describedby="alert-message">
        <form method="dialog">
            <h2 id="alert-title"></h2>
            <p id="alert-message"></p>
            <div class="alert-actions">
                <button class="btn" value="cancel" id="alert-cancel">Cancel</button>
                <button class="btn btn--primary" value="confirm" id="alert-confirm"></button>
            </div>
        </form>
    </dialog>

    <div class="notifications" id="notifications" aria-live="polite"></div>
    <div class="dimmer" id="dimmer" aria-hidden="true"></div>
    <div class="sleep" id="sleep" hidden></div>
</body>

</html>
