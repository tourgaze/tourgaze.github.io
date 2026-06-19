/* TourGaze landing — interactions (no dependencies) */
(function () {
  'use strict';

  /* --- nav: solid background once scrolled --- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (!nav) return;
    nav.style.background = window.scrollY > 8 ? 'rgba(11,15,23,.92)' : 'rgba(11,15,23,.75)';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- scroll reveal with per-sibling stagger --- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = Array.prototype.slice.call(el.parentNode.children).filter(function (c) {
          return c.classList.contains('reveal');
        });
        el.style.transitionDelay = (Math.max(0, sibs.indexOf(el)) * 60) + 'ms';
        el.classList.add('visible');
        io.unobserve(el);
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* --- copy buttons on code blocks --- */
  document.querySelectorAll('.codeblock .copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.parentNode.querySelector('pre');
      if (!pre) return;
      var text = pre.innerText.replace(/ /g, ' ');
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1400);
      });
    });
  });

  /* --- interactive ride demo --- */
  var T = window.TOUR_DEMO;
  if (!T || !T.pts || !T.pts.length) return;

  var P = T.pts; // [lat, lon, altM, speedKmh, distKm]
  var $ = function (id) { return document.getElementById(id); };

  // header / sidebar / stat fills
  function fmtDur(s) { var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h + 'h ' + (m < 10 ? '0' : '') + m + 'm'; }
  if ($('d-name')) $('d-name').textContent = T.name;
  if ($('d-rname')) $('d-rname').textContent = T.name;
  if ($('d-rmeta')) $('d-rmeta').textContent = T.distanceKm.toFixed(1) + ' km · ' + fmtDur(T.durationS) + ' · ' + T.startLocation + ' → ' + T.endLocation;
  if ($('d-dist')) $('d-dist').textContent = T.distanceKm.toFixed(1) + ' km';
  if ($('d-gain')) $('d-gain').textContent = T.elevationGainM + ' m';
  if ($('d-avg')) $('d-avg').textContent = T.avgSpeedKmh.toFixed(1);
  if ($('d-max')) $('d-max').textContent = T.maxSpeedKmh.toFixed(1);

  // --- static elevation + speed profile (400x90 viewbox) ---
  (function chart() {
    var EW = 400, EH = 90;
    var alts = P.map(function (p) { return p[2]; });
    var minAl = Math.min.apply(null, alts), maxAl = Math.max.apply(null, alts);
    var maxSp = Math.max.apply(null, P.map(function (p) { return p[3]; })) || 1;
    var maxD = P[P.length - 1][4] || 1;
    var ex = function (p) { return (p[4] / maxD) * EW; };
    var ey = function (p) { return EH - ((p[2] - minAl) / (maxAl - minAl || 1)) * (EH - 8) - 2; };
    var sy = function (p) { return EH - (p[3] / maxSp) * (EH - 8) - 2; };
    var eline = P.map(function (p, i) { return (i ? 'L' : 'M') + ex(p).toFixed(1) + ' ' + ey(p).toFixed(1); }).join(' ');
    if ($('d-eline')) $('d-eline').setAttribute('d', eline);
    if ($('d-efill')) $('d-efill').setAttribute('d', 'M0 ' + EH + ' ' + eline.replace('M', 'L') + ' L' + EW + ' ' + EH + ' Z');
    if ($('d-spdline')) $('d-spdline').setAttribute('d', P.map(function (p, i) { return (i ? 'L' : 'M') + ex(p).toFixed(1) + ' ' + sy(p).toFixed(1); }).join(' '));
  })();

  // --- 3D terrain map: OSM raster draped over a Mapzen DEM (same stack as the app) ---
  var mapEl = $('d-map');
  if (!mapEl || typeof maplibregl === 'undefined') return;

  var coords = P.map(function (p) { return [p[1], p[0]]; }); // [lon, lat]
  var map = new maplibregl.Map({
    container: 'd-map',
    style: {
      version: 8,
      sources: {
        osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19 },
        dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 15 }
      },
      layers: [
        { id: 'osm', type: 'raster', source: 'osm' },
        { id: 'hill', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': 0.5, 'hillshade-shadow-color': '#0a0e15' } }
      ],
      terrain: { source: 'dem', exaggeration: 1.4 }
    },
    center: coords[Math.floor(coords.length / 2)],
    zoom: 11, pitch: 62, bearing: -18,
    attributionControl: false,
    cooperativeGestures: true
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

  // position along the route at fraction f∈[0,1] (linear interpolation between points)
  function posAt(f) {
    var x = Math.max(0, Math.min(1, f)) * (coords.length - 1);
    var i = Math.floor(x), r = x - i;
    var a = coords[i], b = coords[Math.min(i + 1, coords.length - 1)];
    return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
  }

  // a named "rider" marker: a dot on the track with a floating label
  function rider(name, color) {
    var el = document.createElement('div');
    el.className = 'rider';
    el.style.setProperty('--rc', color);
    el.innerHTML = '<span class="rlabel">' + name + '</span><span class="rdot"></span>';
    return new maplibregl.Marker({ element: el, anchor: 'bottom' });
  }

  // two riders chasing each other along the route, at slightly different speeds
  var mike = rider('Mike', '#4f8cff'), petra = rider('Petra', '#ff5fa2');
  var fMike = 0, fPetra = 0.16;          // start offsets (Petra a touch ahead)
  var SPD_M = 1 / 21000, SPD_P = 1 / 25000; // fraction per ms → ~21s / ~25s per lap

  // single in-view animation loop: moves the riders, and orbits until the user grabs the map
  var running = false, raf = 0, last = 0, userTook = false;
  function frame(ts) {
    if (!running) return;
    if (!last) last = ts;
    var dt = Math.min(ts - last, 100); last = ts;
    if (!userTook) map.setBearing(map.getBearing() + 0.08 * dt / 16.7);
    fMike = (fMike + SPD_M * dt) % 1;
    fPetra = (fPetra + SPD_P * dt) % 1;
    mike.setLngLat(posAt(fMike));
    petra.setLngLat(posAt(fPetra));
    raf = requestAnimationFrame(frame);
  }
  // honor reduced-motion: keep the static 3D view + parked riders, no orbit/movement
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function startAnim() { if (running || REDUCE) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stopAnim() { running = false; cancelAnimationFrame(raf); }

  map.on('load', function () {
    map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
    map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.85 } });
    map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#4f8cff', 'line-width': 3.5 } });
    new maplibregl.Marker({ color: '#34d399' }).setLngLat(coords[0]).addTo(map);
    new maplibregl.Marker({ color: '#ff5f57' }).setLngLat(coords[coords.length - 1]).addTo(map);
    mike.setLngLat(posAt(fMike)).addTo(map);
    petra.setLngLat(posAt(fPetra)).addTo(map);

    var b = coords.reduce(function (bb, c) { return bb.extend(c); }, new maplibregl.LngLatBounds(coords[0], coords[0]));
    var cam = map.cameraForBounds(b, { padding: { top: 50, bottom: 90, left: 50, right: 50 } });
    if (cam) map.jumpTo({ center: cam.center, zoom: Math.min(cam.zoom, 13.2), pitch: 62, bearing: -18 });

    // user can grab the map; that only stops the orbit — the riders keep moving
    ['dragstart', 'mousedown', 'touchstart', 'wheel'].forEach(function (ev) { map.on(ev, function () { userTook = true; }); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? startAnim() : stopAnim(); });
      }, { threshold: 0.25 }).observe(mapEl);
    } else { startAnim(); }
  });
})();
