(function () {
  'use strict';

  var root = document.documentElement;
  var REPO = 'agentx-icu/morsecq';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return [].slice.call((ctx || document).querySelectorAll(sel)); }
  function lang() { return /^zh/i.test(root.lang) ? 'zh' : 'en'; }
  function t(en, zh) { return lang() === 'zh' ? zh : en; }

  // ---------------------------------------------------------------- language
  // Each language is its own page (/en/, /zh/); remember the choice so the
  // root URL sends the visitor back to it next time.
  $$('[data-set-lang]').forEach(function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('morsecq-lang', a.getAttribute('data-set-lang')); } catch (e) {}
    });
  });

  // ---------------------------------------------------------------- mobile menu
  // Below 940px the section links fold into a menu button.
  var nav = $('.nav'), menuBtn = $('#menuBtn');
  if (nav && menuBtn) {
    var setMenu = function (open) {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.hidden = false;
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    $$('#navLinks a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 940px)').addEventListener('change', function () { setMenu(false); });
  }

  // ---------------------------------------------------------------- screenshot viewer
  // Screenshots open full size in a <dialog>; arrows step through the group
  // (one gallery pane or one feature figure) the image belongs to.
  var shots = $$('.gallery img, .feat-art img');
  if (shots.length && window.HTMLDialogElement) {
    var box = document.createElement('dialog');
    box.className = 'lightbox';
    box.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="lb-btn lb-close"></button>' +
      '<button type="button" class="lb-btn lb-prev">‹</button><button type="button" class="lb-btn lb-next">›</button>';
    document.body.appendChild(box);
    var boxImg = $('img', box), boxCap = $('figcaption', box), group = [], at = 0;
    $('.lb-close', box).textContent = '×';
    $('.lb-close', box).setAttribute('aria-label', t('Close', '关闭'));
    $('.lb-prev', box).setAttribute('aria-label', t('Previous', '上一张'));
    $('.lb-next', box).setAttribute('aria-label', t('Next', '下一张'));
    var show = function (i) {
      at = (i + group.length) % group.length;
      boxImg.src = group[at].currentSrc || group[at].src;
      boxImg.alt = group[at].alt;
      boxCap.textContent = group[at].alt;
      box.classList.toggle('single', group.length < 2);
    };
    var step = function (d) { if (group.length > 1) show(at + d); };
    shots.forEach(function (img) {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      var open = function () {
        group = $$('img', img.closest('.gallery, .feat-art'));
        show(group.indexOf(img));
        box.showModal();
      };
      img.addEventListener('click', open);
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
    $('.lb-close', box).addEventListener('click', function () { box.close(); });
    $('.lb-prev', box).addEventListener('click', function () { step(-1); });
    $('.lb-next', box).addEventListener('click', function () { step(1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.tagName === 'FIGURE') box.close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    });
    // Swipe left / right on touch screens.
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    });
  }

  // ---------------------------------------------------------------- tabs
  // Every [role=tablist] (screenshots, install guide) works the same way.
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function select(tab) {
      tabs.forEach(function (x) {
        var on = x === tab;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    }
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var next = tabs[(i + d + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
    list.selectKey = function (key) {
      var tab = tabs.filter(function (x) { return x.getAttribute('data-key') === key; })[0];
      if (tab) select(tab);
    };
  });

  var guide = document.getElementById('guideTabs');
  $$('[data-guide]').forEach(function (a) {
    a.addEventListener('click', function () { if (guide) guide.selectKey(a.getAttribute('data-guide')); });
  });

  // ---------------------------------------------------------------- copy
  var toast = $('.toast');
  function flash(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(flash.timer);
    flash.timer = setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {} finally { document.body.removeChild(ta); }
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }
  $$('.term').forEach(function (pre) {
    var b = document.createElement('button');
    b.className = 'copy';
    b.type = 'button';
    b.textContent = t('copy', '复制');
    b.addEventListener('click', function () {
      // Copy the commands only: no comment lines, no blank lines, no button label.
      var clone = pre.cloneNode(true);
      clone.removeChild(clone.querySelector('.copy'));
      var lines = clone.textContent.split('\n').filter(function (l) { return l.trim() && l.trim().charAt(0) !== '#'; });
      copyText(lines.join('\n')).then(
        function () { flash(t('Copied', '已复制')); },
        function () { flash(t("Couldn't copy, select the text instead", '复制失败，请手动选择文本')); }
      );
    });
    pre.appendChild(b);
  });

  // ---------------------------------------------------------------- platform
  function detectOS() {
    var ua = navigator.userAgent || '';
    var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    // iPadOS Safari reports itself as a Mac; touch support gives it away.
    if (/Mac/i.test(plat) && navigator.maxTouchPoints > 1) return 'ios';
    if (/Mac/i.test(plat) || /Mac OS X/.test(ua)) return 'macos';
    if (/Win/i.test(plat) || /Windows/.test(ua)) return 'windows';
    if (/Linux|X11|CrOS/i.test(plat + ua)) return 'linux';
    return null;
  }

  var OS = detectOS();
  var OS_NAME = { macos: 'macOS', windows: 'Windows', linux: 'Linux', android: 'Android', ios: 'iOS' };
  // The package the hero button downloads directly. Linux builds are x86_64
  // only, so ARM Linux visitors are sent to the cards instead.
  var PRIMARY = {
    macos: 'macos-universal2.pkg',
    windows: 'windows-x64.msi',
    linux: /aarch64|arm/i.test(navigator.userAgent || '') ? null : 'linux-x86_64.deb',
    android: 'android.apk'
  };

  if (OS) {
    var card = $('.os[data-os="' + OS + '"]');
    if (card) card.classList.add('mine');
    if (guide) guide.selectKey(OS);
  }

  function updateHero() {
    var hero = document.getElementById('heroDl');
    if (!hero || !OS) return;
    var label = document.getElementById('heroDlLabel');
    var sub = document.getElementById('heroDlSub');
    var version = ($('[data-version]') || {}).textContent || '';
    if (OS === 'ios') {
      hero.href = '#os-ios';
      label.textContent = t('Get MorseCQ for iOS', '获取 iOS 版');
      sub.textContent = version + t(' · unsigned .ipa', ' · 未签名 .ipa');
      return;
    }
    var pkg = PRIMARY[OS] && $('.pkg[data-asset="' + PRIMARY[OS] + '"]');
    if (!pkg || pkg.hidden) return;
    hero.href = pkg.href;
    label.textContent = t('Download for ' + OS_NAME[OS], '下载 ' + OS_NAME[OS] + ' 版');
    sub.textContent = [version, $('.ps', pkg).textContent, '.' + PRIMARY[OS].split('.').pop()].join(' · ');
  }

  // ---------------------------------------------------------------- releases
  function fmtSize(n) {
    return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function applyRelease(rel) {
    var assets = rel.assets || [];
    function find(suffix) {
      for (var i = 0; i < assets.length; i++) if (assets[i].name.slice(-suffix.length) === suffix) return assets[i];
      return null;
    }
    var tag = rel.tag_name + (rel.prerelease ? t(' (pre-release)', '（预发布）') : '');
    $$('[data-version]').forEach(function (el) { el.textContent = tag; });
    $$('[data-release-link]').forEach(function (el) { el.href = rel.html_url; });
    if (rel.published_at) $$('[data-release-date]').forEach(function (el) { el.textContent = rel.published_at.slice(0, 10); });

    var sumsFile = find('SHA256SUMS');
    $$('[data-sums-link]').forEach(function (a) { if (sumsFile) a.href = sumsFile.browser_download_url; });

    $$('[data-asset]').forEach(function (a) {
      var asset = find('-' + a.getAttribute('data-asset'));
      a.hidden = !asset;
      if (!asset) return;
      a.href = asset.browser_download_url;
      var f = $('.pf', a); if (f) f.textContent = asset.name;
      var s = $('.ps', a); if (s) s.textContent = fmtSize(asset.size);
    });
    $$('[data-file]').forEach(function (el) {
      var asset = find('-' + el.getAttribute('data-file'));
      if (asset) el.textContent = asset.name;
    });

    // GitHub reports a sha256 digest per asset; rebuild the checksum list from it.
    var sums = document.getElementById('sums');
    var lines = assets.filter(function (x) { return /^sha256:/.test(x.digest || '') && x.name !== 'SHA256SUMS'; })
      .map(function (x) { return x.digest.slice(7) + '  ' + x.name; }).sort(function (a, b) {
        return a.slice(66) < b.slice(66) ? -1 : 1;
      });
    if (sums && lines.length) sums.textContent = lines.join('\n');
    updateHero();
  }

  updateHero();

  // The static links in the HTML point at a known release, so the page still
  // works if the API is unreachable or rate-limited. /releases/latest skips
  // pre-releases, so take the newest non-draft entry from the list instead.
  if (window.fetch) {
    fetch('https://api.github.com/repos/' + REPO + '/releases?per_page=10', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) {
        if (!list) return;
        // Only switch away from the fallback once a release carries installers
        // we recognise; a release still uploading would otherwise blank the cards.
        var suffixes = $$('[data-asset]').map(function (a) { return '-' + a.getAttribute('data-asset'); });
        function usable(rel) {
          return !rel.draft && (rel.assets || []).some(function (x) {
            return suffixes.some(function (s) { return x.name.slice(-s.length) === s; });
          });
        }
        for (var i = 0; i < list.length; i++) {
          if (usable(list[i])) { applyRelease(list[i]); return; }
        }
      })
      .catch(function () {});
  }

  // ---------------------------------------------------------------- morse demo
  var CODE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
    K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
    U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
    '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
    '$': '...-..-', '@': '.--.-.'
  };

  var demo = $('.demo');
  var input = document.getElementById('demoIn');
  var out = document.getElementById('demoOut');
  var wpm = document.getElementById('wpm');
  var hz = document.getElementById('hz');
  var ctx = null, timers = [], gain = null, run = 0;

  function render() {
    out.innerHTML = '';
    var text = input.value.toUpperCase();
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === ' ') { out.appendChild(Object.assign(document.createElement('span'), { className: 'sp' })); continue; }
      var code = CODE[c];
      if (!code) continue;
      var el = document.createElement('span');
      el.className = 'ch';
      el.textContent = code.replace(/\./g, '·').replace(/-/g, '−');
      var lab = document.createElement('small');
      lab.textContent = c;
      el.appendChild(lab);
      out.appendChild(el);
    }
  }

  function stop() {
    run++;
    timers.forEach(clearTimeout);
    timers = [];
    if (gain) { try { gain.disconnect(); } catch (e) {} gain = null; }
    demo.classList.remove('busy');
    $$('.ch.on', out).forEach(function (e) { e.classList.remove('on'); });
  }

  function play() {
    stop();
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    var me = run;
    demo.classList.add('busy');
    // Audio time does not advance while the context is suspended, so schedule
    // only once it is running; otherwise the wall-clock timers finish first.
    Promise.resolve(ctx.state === 'suspended' ? ctx.resume() : null)
      .then(function () { if (me === run) schedule(); })
      .catch(function () { if (me === run) stop(); });
  }

  function schedule() {
    var unit = 1.2 / Number(wpm.value);          // PARIS: one dit, in seconds
    var ramp = Math.min(0.005, unit / 4);         // soft edges, no clicks
    var osc = ctx.createOscillator();
    gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = Number(hz.value);
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);

    var t0 = ctx.currentTime + 0.08, t = t0;
    var chars = out.querySelectorAll('.ch');
    var ci = 0;
    var text = input.value.toUpperCase();
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === ' ') { t += unit * 4; continue; }  // 7 total with the trailing 3
      var code = CODE[c];
      if (!code) continue;
      var el = chars[ci++];
      var start = t;
      for (var j = 0; j < code.length; j++) {
        var len = code[j] === '.' ? unit : unit * 3;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + ramp);
        gain.gain.setValueAtTime(0.25, t + len - ramp);
        gain.gain.linearRampToValueAtTime(0, t + len);
        t += len + unit;
      }
      t += unit * 2;
      (function (el, a, b) {
        timers.push(setTimeout(function () { el.classList.add('on'); }, (a - ctx.currentTime) * 1000));
        timers.push(setTimeout(function () { el.classList.remove('on'); }, (b - ctx.currentTime) * 1000));
      })(el, start, t - unit * 3);
    }
    osc.start(t0);
    osc.stop(t + 0.05);
    timers.push(setTimeout(stop, (t - ctx.currentTime) * 1000 + 100));
  }

  document.getElementById('demoPlay').addEventListener('click', function () {
    if (demo.classList.contains('busy')) stop(); else play();
  });
  input.addEventListener('input', function () { stop(); render(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') play(); });
  wpm.addEventListener('input', function () { document.getElementById('wpmV').textContent = wpm.value; });
  hz.addEventListener('input', function () { document.getElementById('hzV').textContent = hz.value; });

  render();
})();
