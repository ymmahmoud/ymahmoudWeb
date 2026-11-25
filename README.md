# ymahmoudWeb

Personal site, presented as a desktop ("YaseenOS").

## Run locally

```
php -S localhost:8000
```

## Styles

`assets/css/site.css` imports everything into cascade layers, in this order:

| Layer | Path | Holds |
|---|---|---|
| theme | `theme/macos-27.css` | Every design token: colors, glass, radii, shadows, sizes, motion |
| base | `base.css` | Reset, page, wallpaper |
| materials | `materials/glass.css` | The Liquid Glass material (`.glass`, `.glass--strong`, `.glass--window`, `.glass--inset`) |
| components | `components/*.css` | Menu bar, menus and context menus, Control Center, widgets, notifications, alerts, desktop, files, windows, split views, dock, iOS home screen, controls |
| apps | `apps/*.css` | Content inside each window: Finder, Notes, Mail, Phone, Preview, Photos, Terminal |

Components and apps read tokens only. To restyle for a new macOS version, copy `theme/macos-27.css` to a new file, change the tokens, and point the theme `@import` in `site.css` at it. Light and dark values use `light-dark()`, so each token covers both appearances. Dock icon artwork lives in the theme as `--icon-*` tokens.

`.glass` is the clear Liquid Glass variant (Dock, Control Center tiles, widgets); `.glass--strong` is the frosted variant for menus, tooltips, notifications and alerts. Windows use a nearly opaque fill, as in macOS 26 and later.

## Phone (iOS)

At 700px and narrower the same markup presents as iOS: the menu bar becomes a status bar (time, Wi-Fi, battery; tap the right side for Control Center, the time for widgets), apps not in the four-icon Dock appear on a home screen grid, apps open full screen with a centered title, and the home indicator returns to the home screen. Control Center and widgets open as a full-screen dimmed overlay. The phone tokens live in the theme's `@media (max-width: 700px)` block; component overrides sit in the same media query in each component file.

Every animation (window open, close, zoom, genie minimize and restore, Mail send, Dock bounce, menu fade, context menu, iOS app launch and return home) is a CSS `@keyframes` rule in `components/`. JavaScript only adds a class such as `is-minimizing` and supplies measured geometry as custom properties (`--genie-*`, `--zoom-*`). Durations and easings are theme tokens.

## Contact form

Mail › New Message posts to `assets/mail.php`. The recipient address comes from the server environment, never the repository. On Apache, add this to the server or virtual host config (or an untracked `.htaccess`):

```
SetEnv CONTACT_EMAIL you@example.com
```

Optionally set `CONTACT_FROM` to the sender address your host allows. The endpoint validates input, strips header-injection characters, uses a honeypot field, and allows five messages per IP per hour. Without JavaScript, the form posts normally and redirects back.

## Media server sign-in (Safari)

`yaseenm.com/tv` and `yaseenm.com/watch` (served by `tv.php` and `watch.php`) open the desktop with a Safari window at `tv.yaseenm.com` (Jellyfin) or `watch.yaseenm.com` (Seerr). Safari is not in the Dock. "Sign in with Google" goes straight to Jellyfin's SSO plugin (`/sso/OID/start/google`) or Seerr's oauth2-proxy login (`/login`). `?site=tv` or `?site=watch` works on any URL for local testing.

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

## Scripts

`assets/js/os/` holds ES modules, loaded from `main.js`:

| Module | Owns |
|---|---|
| `windows.js` | Opening, closing, minimizing, zooming, stacking, dragging, and launching files with `data-launch` |
| `dock.js` | Magnification, launch bounce, genie targets, Trash state |
| `motion.js` | Playing a CSS animation class and awaiting it |
| `system.js` | Appearance, Wi-Fi, battery, Low Power, brightness, sleep, clock, calendar, notifications |
| `alert.js` | Modal confirmation alerts |
| `menubar.js` | Menu bar menus, keyboard navigation and every `data-action` |
| `contextmenu.js` | Right-click, Control-click, context menu key and long-press menus for the desktop, files and Dock |
| `safari.js` | Safari: site pages, history, address bar, sharing |
| `terminal.js` | The Terminal app |
| `apps.js` | Finder, Notes, Mail and compose, Photos, Trash |
