#!/usr/bin/env python3
"""Check the page's static release fallback against the latest GitHub release.

src/index.html carries hard-coded download links, file names, sizes, dates and
SHA-256 sums so the page works when the GitHub API is unreachable. This script
fails (exit 1) when any of them no longer matches the latest stable release,
so a forgotten update after a MorseCQ release is caught by CI instead of by
visitors.

Usage: python3 tool/check_release.py   (set GITHUB_TOKEN to avoid rate limits)
"""
import html
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

REPO = 'agentx-icu/morsecq'
ROOT = Path(__file__).resolve().parent.parent


def fmt_size(n):
    # Same rounding as fmtSize() in assets/main.js.
    return f'{n / 1048576:.1f} MB' if n >= 1048576 else f'{max(1, round(n / 1024))} KB'


def latest_release():
    req = urllib.request.Request(f'https://api.github.com/repos/{REPO}/releases/latest',
                                 headers={'Accept': 'application/vnd.github+json'})
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    src = (ROOT / 'src' / 'index.html').read_text(encoding='utf-8')
    rel = latest_release()
    tag = rel['tag_name']
    assets = {a['name']: a for a in rel['assets']}
    errors = []

    for v in set(re.findall(r'<(?:span|b) data-version>([^<]+)<', src)):
        if v != tag:
            errors.append(f'version {v} on the page, latest release is {tag}')
    date = rel['published_at'][:10]
    for d in set(re.findall(r'<span data-release-date>([^<]+)<', src)):
        if d != date:
            errors.append(f'release date {d} on the page, {tag} was published {date}')

    for url in sorted(set(re.findall(r'https://github\.com/' + re.escape(REPO) + r'/releases/(?:download|tag)/[^"]+', src))):
        m = re.match(r'.*/releases/(download|tag)/([^/]+)(?:/(.+))?$', url)
        if m.group(2) != tag:
            errors.append(f'link points at {m.group(2)}: {url}')
        elif m.group(1) == 'download' and m.group(3) not in assets:
            errors.append(f'{tag} has no asset {m.group(3)}')

    # Each package row: suffix, file name and size must match the release asset.
    for suffix, body in re.findall(r'<a class="pkg" data-asset="([^"]+)"[^>]*>(.*?)</a>', src, re.S):
        named = [a for n, a in assets.items() if n.endswith('-' + suffix)]
        if len(named) != 1:
            errors.append(f'{len(named)} assets in {tag} end with -{suffix}')
            continue
        a = named[0]
        pf = re.search(r'<span class="pf">([^<]+)<', body)
        ps = re.search(r'<span class="ps">([^<]+)<', body)
        if not pf or pf.group(1) != a['name']:
            errors.append(f'{suffix}: file name {pf and pf.group(1)} on the page, release has {a["name"]}')
        if not ps or ps.group(1) != fmt_size(a['size']):
            errors.append(f'{suffix}: size {ps and ps.group(1)} on the page, release has {fmt_size(a["size"])}')

    for suffix, name in re.findall(r'<span data-file="([^"]+)">([^<]+)<', src):
        if name not in assets or not name.endswith('-' + suffix):
            errors.append(f'install command names {name}, not an asset of {tag}')

    # SHA-256 list: one line per asset that has a digest.
    sums = re.search(r'<pre class="sums[^"]*" id="sums">(.*?)</pre>', src, re.S)
    page_sums = dict(reversed(l.split(None, 1)) for l in html.unescape(sums.group(1)).split('\n') if l.strip()) if sums else {}
    # Same selection as the #sums builder in assets/main.js.
    want = {n: a['digest'].split(':', 1)[1] for n, a in assets.items()
            if (a.get('digest') or '').startswith('sha256:') and n != 'SHA256SUMS'}
    for n in sorted(set(page_sums) | set(want)):
        if page_sums.get(n) != want.get(n):
            errors.append(f'SHA-256 for {n}: page {page_sums.get(n)}, release {want.get(n)}')

    if errors:
        print(f'Static release info is out of date with {REPO} {tag}:')
        for e in errors:
            print('  - ' + e)
        print('Update src/index.html as described in README "Downloads".')
        return 1
    print(f'Static release info matches {REPO} {tag} ({len(assets)} assets).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
