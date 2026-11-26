# ymahmoudWeb

Personal site, presented as a desktop ("YaseenOS").

## Run locally

```
php -S localhost:8000 lib/dev-router.php
```

The router mirrors `.htaccess`: extensionless URLs (`/tv`, `/users`) and denied `lib/` and `data/`. Any PHP 8.0+ with `pdo_sqlite`, `curl` and `mbstring` works. Without a system PHP, a self-contained build from [static-php-cli](https://static-php.dev) needs no install:

```
mkdir -p ~/.local/share/php && cd ~/.local/share/php
curl -fsSL https://dl.static-php.dev/static-php-cli/common/php-8.4.23-cli-linux-x86_64.tar.gz | tar xz
ln -sf ~/.local/share/php/php ~/.local/bin/php
```

To preview `/users` locally, export `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `ADMIN_EMAILS` before starting the server, and add `http://localhost:8000/signin` to the OAuth client's redirect URIs.

## Styles

`assets/css/site.css` imports everything into cascade layers, in this order:

| Layer | Path | Holds |
|---|---|---|
| theme | `theme/macos-27.css` | Every design token: colors, glass, radii, shadows, sizes, motion |
| base | `base.css` | Reset, page, wallpaper |
| materials | `materials/glass.css` | The Liquid Glass material (`.glass`, `.glass--strong`, `.glass--window`, `.glass--inset`) |
| components | `components/*.css` | Menu bar, menus and context menus, Control Center, widgets, notifications, alerts, desktop, files, windows, split views, dock, iOS home screen, controls |
| apps | `apps/*.css` | Content inside each window: Finder, Notes, Mail, Phone, Preview, Photos, Terminal, TV, System Settings |

Components and apps read tokens only. To restyle for a new macOS version, copy `theme/macos-27.css` to a new file, change the tokens, and point the theme `@import` in `site.css` at it. Light and dark values use `light-dark()`, so each token covers both appearances. Dock icon artwork lives in the theme as `--icon-*` tokens.

`.glass` is the clear Liquid Glass variant (Dock, Control Center tiles, widgets); `.glass--strong` is the frosted variant for menus, tooltips, notifications and alerts. Windows use a nearly opaque fill, as in macOS 26 and later.

## Phone (iOS)

At 700px and narrower the same markup presents as iOS: the menu bar becomes a status bar (time, Wi-Fi, battery; tap the right side for Control Center, the time for widgets), apps not in the four-icon Dock appear on a home screen grid, apps open full screen with a centered title, and the home indicator returns to the home screen. Control Center and widgets open as a full-screen dimmed overlay. The phone tokens live in the theme's `@media (max-width: 700px)` block; component overrides sit in the same media query in each component file.

Every animation (window open, close, zoom, full screen, genie minimize and restore, Mail send, Dock bounce, menu fade, context menu, iOS app launch and return home) is a CSS `@keyframes` rule in `components/`. JavaScript only adds a class such as `is-minimizing` and supplies measured geometry as custom properties (`--genie-*`, `--zoom-*`). Durations and easings are theme tokens.

## Caching

`.htaccess` sends `Cache-Control: no-cache` for CSS and JS, so browsers revalidate them on each load (a cheap 304 when unchanged). The stylesheets and modules load through `@import` and ES module imports, which a query-string version on `site.css` or `main.js` wouldn't reach.

## Contact form

Mail › New Message posts to `assets/mail.php`. The recipient address comes from the server environment, never the repository. On Apache, add this to the server or virtual host config (or an untracked `.htaccess`):

```
SetEnv CONTACT_EMAIL you@example.com
```

Optionally set `CONTACT_FROM` to the sender address your host allows. The endpoint validates input, strips header-injection characters, uses a honeypot field, and allows five messages per IP per hour. Without JavaScript, the form posts normally and redirects back.

## Media server sign-in (TV)

`yaseenm.com/tv`, `yaseenm.com/watch` and `yaseenm.com/donate` (served by `tv.php`, `watch.php` and `donate.php`) open the desktop with the TV app at Home (`tv.yaseenm.com`, Jellyfin), Requests (`watch.yaseenm.com`, Seerr) or Donate (Venmo, noting that hard drives and SSDs are the only recurring cost; every TV section's footer links to it). TV is hidden on the plain desktop: it appears in the Dock (and the phone home screen) only on those pages or once someone signs in from System Settings. It's always dark, like the TV app: a sidebar, a hero banner with the sign-in buttons, and shelves of setup tiles. The share button copies the current section's address. "Sign in with Google" goes straight to Jellyfin's SSO plugin (`/sso/OID/start/google`) or Seerr's oauth2-proxy login (`/login`). `?site=tv`, `?site=watch` or `?site=donate` works on any URL for local testing.

To make typing `tv.yaseenm.com` or `watch.yaseenm.com` land here, the droplet's Caddy redirects only the bare `/` page for browsers. API paths, `/web`, `/sso`, `/login` and the Jellyfin apps are untouched, and signed-in Seerr users (with a `connect.sid` cookie) go straight to Seerr:

```
tv.yaseenm.com {
	@signin {
		path /
		header Accept *text/html*
	}
	redir @signin https://yaseenm.com/tv 302
	…existing directives…
}

watch.yaseenm.com {
	@signin {
		path /
		header Accept *text/html*
		not header Cookie *connect.sid=*
	}
	redir @signin https://yaseenm.com/watch 302
	…existing directives…
}
```

Jellyfin keeps its session in the browser, not a cookie, so signed-in family members visiting `tv.yaseenm.com` see the sign-in page too. "Open Jellyfin" takes them straight in, and "Sign in with Google" signs them in again without a prompt while their Google session lasts.

## Accounts and System Settings

System Settings (Dock, or Y menu › System Settings…) is where people sign in. "Sign in with Google" goes to `/signin`, which lets in anyone whose Google account is linked on the Users page, plus the addresses in `ADMIN_EMAILS`. Signing in shows TV and the person's name, Google account and groups; administrators also get Manage Users…. Signing out returns to System Settings. The account is checked on every page load, so unlinking someone signs them out. The session cookie is only set once someone starts signing in, so ordinary visitors get no cookie. `/signin?return=/path` returns to any same-site path after signing in.

## User management

`yaseenm.com/users` (served by `users.php`) adds and removes users, links each user to one or more Google (Gmail) accounts, and creates, renames and deletes groups and their memberships. Each Google account can belong to only one user. Deleting a user removes their account links and memberships; deleting a group leaves its members in place.

The page is behind the same Google sign-in, and only addresses listed in `ADMIN_EMAILS` can open it; other signed-in people get a 403. The list is checked on every request, so removing an address revokes access immediately. Every change is a POST with a CSRF token. Set these in the server or virtual host config (or an untracked `.htaccess`):

```
SetEnv GOOGLE_CLIENT_ID     …apps.googleusercontent.com
SetEnv GOOGLE_CLIENT_SECRET …
SetEnv ADMIN_EMAILS         you@gmail.com,someone@gmail.com
```

Create the OAuth client in Google Cloud Console (Credentials › OAuth client ID › Web application) with the authorized redirect URI `https://yaseenm.com/signin` (add `http://localhost:8000/signin` for local testing).

Data lives in SQLite at `data/users.sqlite`, created on first use; the web server needs write access to `data/`. Set `USERS_DB` to keep it somewhere else, ideally outside the web root. `data/` and `lib/` are denied by `.htaccess` (and by `lib/dev-router.php` locally). Requires PHP 8.0+ with `pdo_sqlite`, `curl` and `mbstring`.

## Scripts

`assets/js/os/` holds ES modules, loaded from `main.js`. Apps follow the macOS model: an app owns windows, an app can be running with no windows, and one app is active (named in the menu bar). Finder is always running and becomes active when you click the desktop.

| Module | Owns |
|---|---|
| `application.js` | `Application`, the base class for every app: launching, reopening from the Dock (unhide, bring windows forward, restore the last minimized window, or open a new one), Hide, Hide Others, Show All, Quit, quitting with the last window for single-window utilities, and the standard app, File, Edit, View, Window and Help menus and Dock menu. Also the workspace: the active app, `register()` and `[data-open]` / Dock icon clicks |
| `apps/*.js` | One `Application` subclass per app, adding only that app's behavior and menu items through hooks (`init`, `appItems`, `fileItems`, `editItems`, `viewItems`, `helpItems`, `dockItems`, `badge`, `printable`). Phone and Help Viewer need none, so `main.js` registers plain `Application`s for them |
| `windows.js` | `AppWindow`: stacking, placement, dragging, edge resizing, and the open, close, minimize (genie into a Dock tile), zoom, Fill, Center and full screen transitions |
| `menu.js` | Rendering menu items and keyboard navigation, shared by the menu bar and context menus |
| `menubar.js` | The menu bar: the active app's menus, the Y menu, status menus and every system `data-action` |
| `contextmenu.js` | Right-click, Control-click, context menu key and long-press menus, with items from the owning app |
| `dock.js` | Magnification, launch bounce, running indicators, badges, minimized-window tiles, Trash state |
| `motion.js` | Playing a CSS animation class and awaiting it |
| `system.js` | Appearance, wallpaper, Wi-Fi, battery, Low Power, brightness, sleep, clock, calendar, notifications |
| `alert.js` | Modal alerts |

To add an app: give its windows `data-app="<id>"` (the `win_open()` helper in `index.php` takes the app id), add a Dock entry, and register an `Application` (or a subclass in `apps/`) in `main.js`.
