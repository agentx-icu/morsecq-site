# morsecq-site

Official website of [MorseCQ](https://github.com/agentx-icu/morsecq) — a Morse
code trainer and serverless peer-to-peer Morse chat — served at
**https://morsecq.agentx.icu**.

A plain static site: no build step, no external fonts or scripts.

| Path | What |
|------|------|
| `index.html` | The whole page. Every string appears twice, `<span lang="en">` and `<span lang="zh">`; CSS shows the active language. |
| `assets/style.css` | Styles, light and dark (follows the system). |
| `assets/main.js` | Language switch (`?lang=en\|zh`, remembered in `localStorage`), OS detection for the download cards, live release lookup, the in-browser Morse player and the screenshot tabs. |
| `assets/img/{en,zh}/` | Screenshots copied from `morsecq/doc/screenshots/{macos,ios}/<lang>/` (JPEG, phones scaled to 900 px). |
| `CNAME` | Custom domain for GitHub Pages. |
| `.github/workflows/pages.yml` | Deploys the repository root to GitHub Pages on every push to `master`. |

## Downloads

The download buttons in `index.html` point at a fixed release (currently
v0.1.1) so they work without JavaScript. On load, `main.js` asks the GitHub API
for the newest non-draft release of `agentx-icu/morsecq` and rewrites each
button whose `data-asset` suffix (`macos-arm64.pkg`, `windows-x64.msi`,
`linux-x86_64.deb`, `android.apk`, `ios-unsigned.ipa`, …) matches an asset name,
adding the file size. When a release changes its asset naming, update the
`data-asset` attributes; bump the fallback URLs from time to time.

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000/?lang=zh
```

## Refreshing screenshots

```bash
S=../morsecq/doc/screenshots
for l in en zh; do
  for s in learn_home conversation stats listen reference group_conversation; do
    sips -s format jpeg -s formatOptions 82 $S/macos/$l/$s.png --out assets/img/$l/desktop-$s.jpg
  done
  for s in receive_drill send_practice group_conversation translator conversation stats listen chat_list; do
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
