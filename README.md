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
| `tool/build.py` | Writes `_site/`: `en/index.html` and `zh/index.html` (one language each, with their own `<html lang>`, title, description, canonical and hreflang links), a `SoftwareApplication` JSON-LD block per page, the root redirect, a bilingual `404.html`, `sitemap.xml`, `robots.txt` and the assets. Fails loudly if the template drifts. |
| `tool/check_release.py` | Fails when the static release fallback in `src/index.html` (version, date, links, file names, sizes, SHA-256 list) no longer matches the latest release. |
| `tool/og.html` | Template for the 1200×630 social preview images `assets/img/{en,zh}/og.jpg`. |
| `assets/style.css` | Styles, light and dark (follows the system). |
| `assets/main.js` | The phone menu, the full-size screenshot viewer, OS detection (hero download button, "your device" card, install-guide tab), live release lookup, the in-browser Morse player, tabs, copy buttons on install commands, and remembering the language picked with the switch. |
| `assets/img/{en,zh}/` | MorseCQ 1.0.1 screenshots copied from `morsecq/doc/screenshots/{macos,ios}/<lang>/` (JPEG, phones scaled to 900 px). |
| `CNAME` | Custom domain for GitHub Pages. |
| `.github/workflows/pages.yml` | Runs `tool/build.py` and deploys `_site/` to GitHub Pages on every push to `master`. |
| `.github/workflows/check.yml` | Builds the site and runs `tool/check_release.py` on pushes, pull requests and daily, so a new MorseCQ release the page has not caught up with fails the run. |

## Downloads

The download cards in `src/index.html` are the fallback: they point at the
current stable release (v1.0.1) with its file names, sizes and SHA-256 list, so
the page works without JavaScript or when the GitHub API is rate-limited. On
load, `main.js` asks the GitHub API for the newest non-draft release of
`agentx-icu/morsecq` and rewrites every element whose `data-asset` /
`data-file` suffix (`macos-universal2.pkg`, `windows-x64.msi`,
`linux-x86_64.deb`, `android.apk`, `ios-unsigned.ipa`, …) matches an asset name:
links, file names, sizes, the install-guide commands and the checksum list
(from each asset's `digest`). The hero button links straight to the package for
the visitor's OS.

After each MorseCQ release, update the hard-coded `1.0.1` links, sizes, date and
the `#sums` block in `src/index.html` (`gh release view -R agentx-icu/morsecq
--json assets` has all of them). When a release changes its asset naming,
update the `data-asset` / `data-file` attributes too. Then run
`GITHUB_TOKEN=$(gh auth token) python3 tool/check_release.py`; it lists anything
still out of date. The `check` workflow runs the same script every day.

## Preview locally

```bash
python3 tool/build.py && python3 -m http.server 8000 --directory _site
# http://localhost:8000/en/  ·  http://localhost:8000/zh/
```

## Refreshing screenshots

From the MorseCQ release that the page describes (macOS for desktop frames,
iPhone for phone frames; run on a Mac for `sips`):

```bash
S=../morsecq/doc/screenshots
for l in en zh; do
  for s in learn_home stats reference listen translator receive_summary; do
    sips -s format jpeg -s formatOptions 82 $S/macos/$l/$s.png --out assets/img/$l/desktop-$s.jpg
  done
  for s in first_lesson receive_drill guided_send send_practice receive_summary translator listen stats reference me; do
    sips -Z 900 -s format jpeg -s formatOptions 82 $S/ios/$l/$s.png --out assets/img/$l/phone-$s.jpg
  done
done
```

Desktop frames are 1280×645 and phone frames 414×900; if that changes, update
the `width` / `height` attributes in `src/index.html`.

## Social preview

`og:image` is `assets/img/{en,zh}/og.jpg` (1200×630), a screenshot of
`tool/og.html?lang=en` / `?lang=zh` at that viewport. Re-render it after changing
the template or `phone-reference.jpg`, for example with Playwright:

```js
const page = await (await chromium.launch()).newPage({ viewport: { width: 1200, height: 630 } });
for (const l of ['en', 'zh']) {
  await page.goto(`file://${process.cwd()}/tool/og.html?lang=${l}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `assets/img/${l}/og.jpg`, type: 'jpeg', quality: 86 });
}
```

## Deployment

1. Repository → Settings → Pages → Source: **GitHub Actions**; custom domain
   `morsecq.agentx.icu`, enforce HTTPS.
2. DNS: `morsecq.agentx.icu  CNAME  agentx-icu.github.io.`

## Licence

GPL-3.0, same as MorseCQ. See [LICENSE](LICENSE).
