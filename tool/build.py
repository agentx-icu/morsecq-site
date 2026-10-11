#!/usr/bin/env python3
"""Build the site into _site/: one page per language plus a root redirect.

src/index.html is written bilingually: every string appears as a pair of
<span lang="en">…</span><span lang="zh">…</span>, and attribute text carries its
Chinese twin in data-alt-zh / data-label-zh. This script keeps one side of each
pair and writes /en/index.html and /zh/index.html, each a plain single-language
page with its own <html lang>, title, description, canonical URL and hreflang
links. The root /index.html only redirects to the visitor's language.

Usage: python3 tool/build.py [--out _site]
"""
import argparse
import re
import shutil
from pathlib import Path

SITE = 'https://morsecq.agentx.icu'
ROOT = Path(__file__).resolve().parent.parent

LANGS = {
    'en': {
        'html_lang': 'en',
        'title': 'MorseCQ — Learn Morse code offline',
        'description': 'MorseCQ is a free, account-free, offline Morse code trainer. '
                       'Learn with Koch lessons, receive drills and sending practice. '
                       'macOS, Windows, Linux, Android and iOS.',
        'og_description': 'Account-free, offline Morse code trainer. Free and open source (GPL-3.0).',
        'og_locale': 'en_US',
        'switch': ('zh', 'zh-CN', '中文', '切换到中文'),
    },
    'zh': {
        'html_lang': 'zh-CN',
        'title': 'MorseCQ — 离线学习摩尔斯电码',
        'description': 'MorseCQ 是无需账号、无需联网的免费摩尔斯电码训练器。用 Koch 课程、抄收练习和拍发练习学习电码。'
                       '支持 macOS、Windows、Linux、Android 和 iOS。',
        'og_description': '无需账号、无需联网的摩尔斯电码训练器。免费开源（GPL-3.0）。',
        'og_locale': 'zh_CN',
        'switch': ('en', 'en', 'EN', 'Switch to English'),
    },
}


def sub1(pattern, repl, text, flags=0):
    """re.sub that insists on exactly one match, so template drift fails loudly."""
    out, n = re.subn(pattern, repl, text, flags=flags)
    if n != 1:
        raise SystemExit(f'build: expected 1 match for {pattern!r}, got {n}')
    return out


def attr(s):
    return s.replace('&', '&amp;').replace('"', '&quot;')


TAG = re.compile(r'(<(?:[^>"\']|"[^"]*"|\'[^\']*\')*>)')  # quoted values may hold '>'
LANG_ATTR = re.compile(r'\s+lang\s*=\s*"(en|zh)"')
TWIN = re.compile(r'\s+data-(alt|label)-zh\s*=\s*"([^"]*)"')
TWIN_OF = {'alt': 'alt', 'label': 'aria-label'}


def set_attr(tag, name, value):
    pat = re.compile(r'(\s%s\s*=\s*")[^"]*(")' % re.escape(name))
    if not pat.search(tag):
        raise SystemExit(f'build: {tag!r} has a Chinese twin but no {name}')
    if value is None:
        return tag
    return pat.sub(lambda m: m.group(1) + value + m.group(2), tag, count=1)


def localize(src, lang):
    """Keep one side of every bilingual pair, tag by tag.

    A <span lang="xx"> of the other language is dropped with everything inside
    it (nested spans included); one of this language keeps its <span> (styles
    such as `.chips span` rely on it) and only loses the lang attribute.
    Attribute twins are applied by name, independent of attribute order.
    """
    out, skip = [], 0  # skip = span depth inside a dropped element
    for tok in TAG.split(src):
        if not tok.startswith('<'):
            if not skip:
                out.append(tok)
            continue
        is_open = re.match(r'<span\b', tok, re.I)
        is_close = re.match(r'</span\s*>', tok, re.I)
        if skip:
            skip += 1 if is_open else -1 if is_close else 0
            continue
        m = LANG_ATTR.search(tok)
        if m and not re.match(r'<html\b', tok, re.I):
            if not is_open:
                raise SystemExit(f'build: lang="{m.group(1)}" is only supported on <span>: {tok!r}')
            if m.group(1) != lang:
                skip = 1
                continue
            tok = LANG_ATTR.sub('', tok, count=1)
        for kind, zh in TWIN.findall(tok):
            # Validate in both builds, not only the Chinese one.
            tok = set_attr(tok, TWIN_OF[kind], zh) if lang == 'zh' else set_attr(tok, TWIN_OF[kind], None)
        tok = TWIN.sub('', tok)
        if re.search(r'\sdata-i18n-src\b', tok):
            if lang == 'zh':
                tok = tok.replace('assets/img/en/', 'assets/img/zh/')
            tok = re.sub(r'\s+data-i18n-src\b', '', tok)
        out.append(tok)
    if skip:
        raise SystemExit('build: unclosed language span')
    return ''.join(out)


def render(src, lang):
    cfg = LANGS[lang]
    other = 'zh' if lang == 'en' else 'en'
    url = f'{SITE}/{lang}/'
    out = localize(src, lang)

    # Head: language, metadata, alternates. The pre-paint language picker is
    # only needed by the bilingual source page.
    out = sub1(r'<html lang="en" data-lang="en">',
               f'<html lang="{cfg["html_lang"]}">', out)
    out = sub1(r'<script>\s*// Pick the language before first paint.*?</script>\n', '', out, re.S)
    out = sub1(r'<title>.*?</title>', f'<title>{cfg["title"]}</title>', out)
    out = sub1(r'<meta name="description" content="[^"]*">',
               f'<meta name="description" content="{attr(cfg["description"])}">', out)
    out = sub1(r'<link rel="canonical" href="[^"]*">',
               f'<link rel="canonical" href="{url}">\n'
               f'<link rel="alternate" hreflang="en" href="{SITE}/en/">\n'
               f'<link rel="alternate" hreflang="zh-CN" href="{SITE}/zh/">\n'
               f'<link rel="alternate" hreflang="x-default" href="{SITE}/">', out)
    out = sub1(r'<meta property="og:title" content="[^"]*">',
               f'<meta property="og:title" content="{attr(cfg["title"])}">\n'
               f'<meta property="og:locale" content="{cfg["og_locale"]}">', out)
    out = sub1(r'<meta property="og:description" content="[^"]*">',
               f'<meta property="og:description" content="{attr(cfg["og_description"])}">', out)
    out = sub1(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', out)
    out = sub1(r'assets/img/en/desktop-learn_home\.jpg">\n<meta name="twitter',
               f'assets/img/{lang}/desktop-learn_home.jpg">\n<meta name="twitter', out)

    # The language toggle becomes a link to the other page.
    to, to_hreflang, label, title = cfg['switch']
    out = sub1(r'<button class="lang-btn".*?</button>',
               f'<a class="lang-btn" href="../{to}/" hreflang="{to_hreflang}" lang="{to_hreflang}" '
               f'data-set-lang="{to}" title="{title}">{label}</a>', out, re.S)

    # Pages live one level down.
    out = re.sub(r'(href|src)="assets/', r'\1="../assets/', out)
    return out


ROOT_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MorseCQ</title>
<link rel="canonical" href="{site}/en/">
<link rel="alternate" hreflang="en" href="{site}/en/">
<link rel="alternate" hreflang="zh-CN" href="{site}/zh/">
<link rel="alternate" hreflang="x-default" href="{site}/">
<link rel="icon" type="image/png" href="assets/img/favicon-64.png">
<script>
  // Send the visitor to their language: ?lang=, then their last choice, then the browser.
  (function () {{
    var m = /[?&]lang=(en|zh)\\b/.exec(location.search), l = m && m[1];
    try {{ l = l || localStorage.getItem('morsecq-lang'); }} catch (e) {{}}
    if (!l) l = /^zh\\b/i.test(navigator.language || '') ? 'zh' : 'en';
    location.replace(l + '/' + location.hash);
  }})();
</script>
<style>
  body {{ font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
         background: #f6f8f7; color: #13261f; display: grid; place-items: center; min-height: 100vh; margin: 0; }}
  a {{ color: #0e6150; margin: 0 12px; font-weight: 600; }}
  @media (prefers-color-scheme: dark) {{ body {{ background: #0e1513; color: #e3ece8; }} a {{ color: #5fd0ad; }} }}
</style>
</head>
<body>
  <p>MorseCQ — <a href="en/" hreflang="en">English</a><a href="zh/" hreflang="zh-CN" lang="zh-CN">中文</a></p>
</body>
</html>
"""

SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
{urls}
</urlset>
"""


def sitemap():
    alts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{h}" href="{SITE}/{p}/"/>'
                   for h, p in (('en', 'en'), ('zh-CN', 'zh')))
    return SITEMAP.format(urls='\n'.join(f'  <url>\n    <loc>{SITE}/{p}/</loc>{alts}\n  </url>' for p in ('en', 'zh')))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / '_site'))
    out = Path(ap.parse_args().out)

    src = (ROOT / 'src' / 'index.html').read_text(encoding='utf-8')
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / 'assets', out / 'assets')
    for lang in LANGS:
        (out / lang).mkdir(parents=True)
        (out / lang / 'index.html').write_text(render(src, lang), encoding='utf-8', newline='\n')
    (out / 'index.html').write_text(ROOT_PAGE.format(site=SITE), encoding='utf-8', newline='\n')
    (out / 'sitemap.xml').write_text(sitemap(), encoding='utf-8', newline='\n')
    (out / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n', encoding='utf-8')
    for f in ('CNAME', '.nojekyll'):
        shutil.copy(ROOT / f, out / f)
    print(f'built {out}')


if __name__ == '__main__':
    main()
