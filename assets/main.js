(function () {
  'use strict';

  var root = document.documentElement;
  var REPO = 'agentx-icu/morsecq';
  var lastRel = null;

  // ---------------------------------------------------------------- language
  function lang() { return root.getAttribute('data-lang') === 'zh' ? 'zh' : 'en'; }

  function applyLang(l) {
    root.setAttribute('data-lang', l);
    root.lang = l === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('img[data-i18n-src]').forEach(function (img) {
      img.src = img.getAttribute('src').replace(/\/(en|zh)\//, '/' + l + '/');
    });
    // Attribute text cannot use the paired-span trick; keep the English in data-*-en.
    [['alt', 'data-alt'], ['aria-label', 'data-label']].forEach(function (p) {
      document.querySelectorAll('[' + p[1] + '-zh]').forEach(function (el) {
        if (!el.hasAttribute(p[1] + '-en')) el.setAttribute(p[1] + '-en', el.getAttribute(p[0]));
        el.setAttribute(p[0], el.getAttribute(p[1] + '-' + l));
      });
    });
    markMine();
    if (lastRel) applyRelease(lastRel);
  }

  document.getElementById('langBtn').addEventListener('click', function () {
    var l = lang() === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('morsecq-lang', l); } catch (e) {}
    applyLang(l);
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

  function markMine() {
    if (!OS) return;
    var card = document.querySelector('.dl[data-os="' + OS + '"]');
    if (!card) return;
    card.classList.add('mine');
    card.setAttribute('data-mine', lang() === 'zh' ? '适合你的设备' : 'Your device');
    var label = document.getElementById('heroDlLabel');
    label.innerHTML = '<span lang="en">Download for ' + OS_NAME[OS] + '</span><span lang="zh">下载 ' + OS_NAME[OS] + ' 版</span>';
  }

  // ---------------------------------------------------------------- releases
  function fmtSize(n) {
    return n >= 1048576 ? (n / 1048576).toFixed(0) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function applyRelease(rel) {
    lastRel = rel;
    var tag = rel.tag_name;
    document.getElementById('relName').textContent = tag + (rel.prerelease ? (lang() === 'zh' ? '（预发布）' : ' (pre-release)') : '');
    document.getElementById('relLink').href = rel.html_url;
    if (rel.published_at) document.getElementById('relDate').textContent = '· ' + rel.published_at.slice(0, 10);

    var assets = rel.assets || [];
    function find(suffix) {
      for (var i = 0; i < assets.length; i++) if (assets[i].name.slice(-suffix.length) === suffix) return assets[i];
      return null;
    }
    var sums = find('SHA256SUMS');
    var sumsLink = document.getElementById('sumsLink');
    sumsLink.hidden = !sums;
    if (sums) sumsLink.href = sums.browser_download_url;

    document.querySelectorAll('[data-asset]').forEach(function (a) {
      var asset = find('-' + a.getAttribute('data-asset'));
      if (!asset) { a.hidden = true; return; }
      a.hidden = false;
      a.href = asset.browser_download_url;
      var s = a.querySelector('.size');
      if (!s) { s = document.createElement('span'); s.className = 'size'; a.appendChild(s); }
      s.textContent = ' · ' + fmtSize(asset.size);
    });
  }

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
        var suffixes = [].map.call(document.querySelectorAll('[data-asset]'), function (a) { return '-' + a.getAttribute('data-asset'); });
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

  // ---------------------------------------------------------------- gallery tabs
  var tabs = [].slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  function selectTab(b) {
    tabs.forEach(function (x) {
      var on = x === b;
      x.classList.toggle('on', on);
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () { selectTab(b); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var next = tabs[(i + d + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

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

  var demo = document.querySelector('.demo');
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
    out.querySelectorAll('.ch.on').forEach(function (e) { e.classList.remove('on'); });
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
  applyLang(lang());
})();
