/* ==========================================================================
   NEXUS — Interactions: preloader, smooth scroll, cursor, GSAP motion
   ========================================================================== */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_GSAP = typeof gsap !== 'undefined';
  if (HAS_GSAP && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lucide icons ---------- */

  function icons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* ---------- Preloader ---------- */

  function preloader(onDone) {
    var el = document.getElementById('preloader');
    var bar = document.getElementById('preloaderBar');
    var status = document.getElementById('preloaderStatus');
    if (!el) { onDone(); return; }

    if (REDUCED || !HAS_GSAP) {
      el.classList.add('done');
      onDone();
      return;
    }

    var messages = [
      'initializing container…',
      'pulling nginx:latest…',
      'building image layers…',
      'mapping ports 8080 → 80…',
      'starting nexus…'
    ];
    var msgIdx = 0;
    var msgTimer = setInterval(function () {
      msgIdx = (msgIdx + 1) % messages.length;
      if (status) status.textContent = messages[msgIdx];
    }, 420);

    var progress = { v: 0 };
    gsap.to(progress, {
      v: 100,
      duration: 1.9,
      ease: 'power2.inOut',
      onUpdate: function () { if (bar) bar.style.width = progress.v + '%'; },
      onComplete: function () {
        clearInterval(msgTimer);
        if (status) status.textContent = 'ready — opening localhost:8080';
        setTimeout(function () {
          el.classList.add('done');
          onDone();
        }, 350);
      }
    });
  }

  /* ---------- Lenis smooth scroll ---------- */

  function smoothScroll() {
    if (REDUCED || typeof Lenis === 'undefined') return;
    var lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    if (HAS_GSAP && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }

    // anchor links through lenis
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -70, duration: 1.3 });
        closeMenu();
      });
    });
  }

  /* ---------- Nav ---------- */

  function nav() {
    var navEl = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    if (!navEl) return;

    function onScroll() {
      navEl.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    window.closeMenu = function () {
      navEl.classList.remove('menu-open');
      if (toggle) {
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    };

    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = navEl.classList.toggle('menu-open');
        toggle.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  }

  /* ---------- Custom cursor + magnetic ---------- */

  function cursor() {
    if (REDUCED || window.matchMedia('(pointer: coarse)').matches) return;
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    var scale = 1;

    window.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
    }, { passive: true });

    (function loop() {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      dot.style.transform = 'translate(' + (x - 3) + 'px,' + (y - 3) + 'px)';
      ring.style.transform = 'translate(' + (rx - ring.offsetWidth / 2) + 'px,' + (ry - ring.offsetHeight / 2) + 'px) scale(' + scale + ')';
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll('a, button, .bento-card, .stack-card, .arch-node').forEach(function (el) {
      el.addEventListener('pointerenter', function () { ring.classList.add('hovering'); });
      el.addEventListener('pointerleave', function () { ring.classList.remove('hovering'); });
    });

    // magnetic hover
    if (HAS_GSAP) {
      document.querySelectorAll('[data-magnetic]').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          gsap.to(el, {
            x: (e.clientX - r.left - r.width / 2) * 0.28,
            y: (e.clientY - r.top - r.height / 2) * 0.28,
            duration: 0.4,
            ease: 'power2.out'
          });
        });
        el.addEventListener('pointerleave', function () {
          gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        });
      });
    }
  }

  /* ---------- Hero entrance ---------- */

  function heroEntrance() {
    if (!HAS_GSAP) {
      document.querySelectorAll('.line-mask__inner').forEach(function (el) { el.style.transform = 'none'; });
      return;
    }
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('.nav__inner', { y: -30, opacity: 0, duration: 0.9 })
      .to('.hero .line-mask__inner', { yPercent: 0, duration: 1.15, stagger: 0.09 }, 0.15)
      .from('.hero__visual-frame', { opacity: 0, scale: 0.92, y: 30, duration: 1.2, ease: 'power3.out' }, 0.45)
      .from('.hero__hud', { opacity: 0, x: -14, duration: 0.8 }, 0.9)
      .from('.marquee', { opacity: 0, duration: 1 }, 0.9)
      .from('.scroll-hint', { opacity: 0, y: 12, duration: 0.8 }, 1.05);

    gsap.set('.hero .line-mask__inner', { yPercent: 115 });
  }

  /* ---------- Scroll reveals ---------- */

  function reveals() {
    if (!HAS_GSAP || typeof ScrollTrigger === 'undefined' || REDUCED) {
      document.querySelectorAll('.reveal').forEach(function (el) {
        el.style.opacity = 1; el.style.transform = 'none';
      });
      return;
    }
    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });

    // architecture nodes pop in sequence
    gsap.utils.toArray('[data-arch-node]').forEach(function (node, i) {
      gsap.from(node, {
        opacity: 0,
        scale: 0.85,
        duration: 0.7,
        ease: 'back.out(1.6)',
        scrollTrigger: { trigger: node, start: 'top 90%', once: true },
        delay: i * 0.08
      });
    });

    // workflow rail fill
    var rail = document.getElementById('railFill');
    if (rail) {
      gsap.to(rail, {
        height: '100%',
        ease: 'none',
        scrollTrigger: { trigger: '.workflow', start: 'top 75%', end: 'bottom 60%', scrub: 0.6 }
      });
    }

    // subtle parallax on section-alt backgrounds
    gsap.utils.toArray('.section--alt').forEach(function (sec) {
      gsap.fromTo(sec,
        { backgroundPositionY: '0px' },
        { backgroundPositionY: '80px', ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- Counters ---------- */

  function counters() {
    var els = document.querySelectorAll('.counter');
    if (!els.length) return;
    var run = function (el) {
      var target = parseInt(el.getAttribute('data-target'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var obj = { v: 0 };
      if (HAS_GSAP && !REDUCED) {
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
        });
      } else {
        el.textContent = target + suffix;
      }
    };
    els.forEach(run);
  }

  /* ---------- Card tilt ---------- */

  function tilt() {
    if (REDUCED || window.matchMedia('(pointer: coarse)').matches) return;
    document.querySelectorAll('.tilt').forEach(function (card) {
      var rect = null;
      card.addEventListener('pointerenter', function () { rect = card.getBoundingClientRect(); });
      card.addEventListener('pointermove', function (e) {
        if (!rect) rect = card.getBoundingClientRect();
        var nx = (e.clientX - rect.left) / rect.width - 0.5;
        var ny = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--mx', ((nx + 0.5) * 100) + '%');
        card.style.setProperty('--my', ((ny + 0.5) * 100) + '%');
        if (HAS_GSAP) {
          gsap.to(card, { rotateX: -ny * 7, rotateY: nx * 9, y: -4, duration: 0.5, ease: 'power2.out', transformPerspective: 900 });
        }
      });
      card.addEventListener('pointerleave', function () {
        if (HAS_GSAP) gsap.to(card, { rotateX: 0, rotateY: 0, y: 0, duration: 0.7, ease: 'power3.out' });
        rect = null;
      });
    });
  }

  /* ---------- Boot ---------- */

  function boot() {
    icons();
    preloader(function () {
      heroEntrance();
      smoothScroll();
      reveals();
      counters();
      if (HAS_GSAP && typeof ScrollTrigger !== 'undefined') setTimeout(function () { ScrollTrigger.refresh(); }, 300);
    });
    nav();
    cursor();
    tilt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
