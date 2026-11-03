/* ==========================================================================
   NEXUS — Three.js scenes: particle network background + server visualization
   ========================================================================== */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_THREE = typeof THREE !== 'undefined';

  /* ---------- Particle Network Background ---------- */

  function initBackground() {
    var canvas = document.getElementById('bg-canvas');
    if (!canvas || !HAS_THREE) return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03060d, 0.0011);

    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 620;

    var COUNT = window.innerWidth < 768 ? 70 : 130;
    var RADIUS = 900;
    var positions = new Float32Array(COUNT * 3);
    var velocities = [];

    for (var i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * RADIUS * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * RADIUS;
      positions[i * 3 + 2] = (Math.random() - 0.5) * RADIUS;
      velocities.push({
        x: (Math.random() - 0.5) * 0.35,
        y: (Math.random() - 0.5) * 0.35,
        z: (Math.random() - 0.5) * 0.35
      });
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var sprite = makeDotSprite();
    var material = new THREE.PointsMaterial({
      size: 5,
      map: sprite,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
      color: 0x00e5ff
    });

    var points = new THREE.Points(geometry, material);
    scene.add(points);

    // connection lines
    var linePos = new Float32Array(COUNT * COUNT * 3);
    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    var lineMat = new THREE.LineBasicMaterial({
      color: 0x2f6bff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    var CONNECT_DIST = 170;

    function updateLines() {
      var pos = geometry.attributes.position.array;
      var ptr = 0;
      for (var a = 0; a < COUNT; a++) {
        for (var b = a + 1; b < COUNT; b++) {
          var dx = pos[a * 3] - pos[b * 3];
          var dy = pos[a * 3 + 1] - pos[b * 3 + 1];
          var dz = pos[a * 3 + 2] - pos[b * 3 + 2];
          var d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < CONNECT_DIST * CONNECT_DIST) {
            linePos[ptr++] = pos[a * 3];
            linePos[ptr++] = pos[a * 3 + 1];
            linePos[ptr++] = pos[a * 3 + 2];
            linePos[ptr++] = pos[b * 3];
            linePos[ptr++] = pos[b * 3 + 1];
            linePos[ptr++] = pos[b * 3 + 2];
          }
        }
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, ptr / 3);
    }

    // mouse parallax
    var mouseX = 0, mouseY = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    var scrollY = 0;
    window.addEventListener('scroll', function () { scrollY = window.scrollY; }, { passive: true });

    function makeDotSprite() {
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var ctx = c.getContext('2d');
      var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(120,220,255,0.7)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      var tex = new THREE.CanvasTexture(c);
      return tex;
    }

    var t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.004;

      var pos = geometry.attributes.position.array;
      for (var i = 0; i < COUNT; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;
        if (Math.abs(pos[i * 3]) > RADIUS) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > RADIUS / 2) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > RADIUS) velocities[i].z *= -1;
      }
      geometry.attributes.position.needsUpdate = true;

      if (t % 0.08 < 0.01) updateLines();

      tx += (mouseX - tx) * 0.03;
      ty += (mouseY - ty) * 0.03;
      camera.position.x = tx * 70;
      camera.position.y = -ty * 50 - scrollY * 0.04;
      camera.lookAt(scene.position);

      points.rotation.y += 0.0004;

      renderer.render(scene, camera);
    }

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    updateLines();
    animate();
  }

  /* ---------- 3D Server Infrastructure Visualization ---------- */

  function initServerViz() {
    var canvas = document.getElementById('server-canvas');
    var wrap = document.getElementById('serverVizWrap');
    if (!canvas || !HAS_THREE) return;

    function size() { return { w: canvas.clientWidth || wrap.clientWidth, h: canvas.clientHeight || 420 }; }
    var s = size();

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(s.w, s.h, false);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, s.w / s.h, 0.1, 100);
    camera.position.set(4.2, 3.4, 5.4);
    camera.lookAt(0, 0, 0);

    // lights
    scene.add(new THREE.AmbientLight(0x22304d, 1.1));

    var cyanLight = new THREE.PointLight(0x00e5ff, 2.2, 20);
    cyanLight.position.set(-3, 2.5, 3);
    scene.add(cyanLight);

    var purpleLight = new THREE.PointLight(0x7c5cff, 1.8, 20);
    purpleLight.position.set(3.5, -1.5, -2);
    scene.add(purpleLight);

    var topLight = new THREE.DirectionalLight(0xbfd9ff, 0.7);
    topLight.position.set(2, 6, 4);
    scene.add(topLight);

    var group = new THREE.Group();
    scene.add(group);

    // server stack: 4 layers
    var layerColors = [0x00e5ff, 0x2f6bff, 0x7c5cff, 0x00e5ff];
    var gap = 0.62;
    var layers = [];

    for (var i = 0; i < 4; i++) {
      var layer = new THREE.Group();

      var slabGeo = new THREE.BoxGeometry(2.6, 0.34, 1.7);
      var slabMat = new THREE.MeshStandardMaterial({
        color: 0x0a1226,
        metalness: 0.75,
        roughness: 0.32,
        emissive: layerColors[i],
        emissiveIntensity: 0.06
      });
      var slab = new THREE.Mesh(slabGeo, slabMat);
      layer.add(slab);

      var edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(slabGeo),
        new THREE.LineBasicMaterial({ color: layerColors[i], transparent: true, opacity: 0.55 })
      );
      layer.add(edges);

      // front detail: slots / lights
      for (var j = 0; j < 3; j++) {
        var led = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.05, 0.03),
          new THREE.MeshBasicMaterial({ color: j === i % 3 ? 0x00e5ff : 0x1c2a4a })
        );
        led.position.set(-0.9 + j * 0.28, 0.06, 0.87);
        layer.add(led);
      }

      var strip = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.04, 0.02),
        new THREE.MeshBasicMaterial({ color: layerColors[i], transparent: true, opacity: 0.75 })
      );
      strip.position.set(0.45, 0.09, 0.87);
      layer.add(strip);

      layer.position.y = (i - 1.5) * gap;
      group.add(layer);
      layers.push(layer);
    }

    // floating data particles around the stack
    var pCount = 90;
    var pPos = new Float32Array(pCount * 3);
    for (var p = 0; p < pCount; p++) {
      pPos[p * 3] = (Math.random() - 0.5) * 5;
      pPos[p * 3 + 1] = (Math.random() - 0.5) * 5;
      pPos[p * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    var pMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var particles = new THREE.Points(pGeo, pMat);
    group.add(particles);

    // base glow plane
    var glow = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshBasicMaterial({
        map: (function () {
          var c = document.createElement('canvas');
          c.width = c.height = 128;
          var ctx = c.getContext('2d');
          var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
          g.addColorStop(0, 'rgba(0,229,255,0.35)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 128, 128);
          return new THREE.CanvasTexture(c);
        })(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -1.85;
    group.add(glow);

    // interaction
    var targetRX = 0, targetRY = 0;
    wrap.addEventListener('pointermove', function (e) {
      var r = wrap.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      targetRY = nx * 0.9;
      targetRX = ny * 0.5;
    }, { passive: true });

    wrap.addEventListener('pointerleave', function () { targetRX = 0; targetRY = 0; });

    var clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();

      group.rotation.y += (targetRY + t * 0.12 - group.rotation.y) * 0.06;
      group.rotation.x += (targetRX - group.rotation.x) * 0.06;

      layers.forEach(function (layer, idx) {
        layer.position.y = (idx - 1.5) * gap + Math.sin(t * 1.1 + idx * 0.7) * 0.07;
      });

      particles.rotation.y = -t * 0.18;
      cyanLight.position.x = Math.sin(t * 0.8) * 3.2;
      purpleLight.position.x = Math.cos(t * 0.6) * 3.5;

      renderer.render(scene, camera);
    }

    function resize() {
      var ns = size();
      camera.aspect = ns.w / ns.h;
      camera.updateProjectionMatrix();
      renderer.setSize(ns.w, ns.h, false);
    }
    window.addEventListener('resize', resize);

    if (RESIZE_OBSERVER) {
      new ResizeObserver(resize).observe(wrap);
    }

    animate();
  }

  var RESIZE_OBSERVER = typeof ResizeObserver !== 'undefined';

  function init() {
    if (REDUCED) {
      document.documentElement.classList.add('no-motion');
      document.body.classList.add('no-motion');
      // static render: single frame, no loop
      return;
    }
    initBackground();
    initServerViz();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
