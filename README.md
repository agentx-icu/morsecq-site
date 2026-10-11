# morsecq-site

Official website of [MorseCQ](https://github.com/agentx-icu/morsecq) — an account-free,
offline Morse code trainer — served at
**https://morsecq.agentx.icu**.

A static site in two languages, each its own page:

- https://morsecq.agentx.icu/en/ — English
- https://morsecq.agentx.icu/zh/ — 简体中文
- https://morsecq.agentx.icu/ — redirects by `?lang=en|zh`, then the visitor's
  last choice, then the browser language

No framework and no external fonts or scripts; a small Python script splits the
bilingual source into the two pages. Morse chat is provided by DitMesh.

| Path | What |
|------|------|
| `src/index.html` | The page source. Every string appears twice, `<span lang="en">` and `<span lang="zh">`; attribute text has a `data-alt-zh` / `data-label-zh` twin. Edit both languages here. |
| `tool/build.py` | Writes `_site/`: `en/index.html` and `zh/index.html` (one language each, with their own `<html lang>`, title, description, canonical and hreflang links), the root redirect, `sitemap.xml`, `robots.txt` and the assets. Fails loudly if the template drifts. |
| `assets/style.css` | Styles, light and dark (follows the system). |
| `assets/main.js` | OS detection for the download cards, live release lookup, the in-browser Morse player, the screenshot tabs, and remembering the language picked with the switch. |
| `assets/img/{en,zh}/` | Screenshots copied from `morsecq/doc/screenshots/{macos,ios}/<lang>/` (JPEG, phones scaled to 900 px). |
| `CNAME` | Custom domain for GitHub Pages. |
| `.github/workflows/pages.yml` | Runs `tool/build.py` and deploys `_site/` to GitHub Pages on every push to `master`. |

## Downloads

The download buttons in `src/index.html` point at the current stable release (v1.0.1) so they work without JavaScript. On load, `main.js` asks the GitHub API
for the newest non-draft release of `agentx-icu/morsecq` and rewrites each
button whose `data-asset` suffix (`macos-arm64.pkg`, `windows-x64.msi`,
`linux-x86_64.deb`, `android.apk`, `ios-unsigned.ipa`, …) matches an asset name,
adding the file size. When a release changes its asset naming, update the
`data-asset` attributes and fallback URLs. MorseCQ v1.0.1 ships a macOS universal2 package for Apple silicon and Intel.

## Preview locally

```bash
python3 tool/build.py && (cd _site && python3 -m http.server 8000)
# http://localhost:8000/en/  ·  http://localhost:8000/zh/
```

## Refreshing screenshots

```bash
S=../morsecq/doc/screenshots
for l in en zh; do
  for s in learn_home stats listen reference; do
    sips -s format jpeg -s formatOptions 82 $S/macos/$l/$s.png --out assets/img/$l/desktop-$s.jpg
  done
  for s in receive_drill send_practice translator stats listen; do
    sips -Z 900 -s format jpeg -s formatOptions 82 $S/ios/$l/$s.png --out assets/img/$l/phone-$s.jpg
  done
done
```

## Deployment

1. Repository → Settings → Pages → Source: **GitHub Actions**; custom domain
   `morsecq.agentx.icu`, enforce HTTPS.
2. DNS: `morsecq.agentx.icu  CNAME  agentx-icu.github.io.`

## Licence

GPL-3.0, same as MorseCQ. See [LICENSE](LICENSE).
