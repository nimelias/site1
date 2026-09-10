(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bgWrap = document.querySelector(".bg-gen");
  var canvas = document.getElementById("bg-canvas");
  var scrollProgress = 0;
  var genPhase = 0;

  /* —— Fondo generativo con modos variables —— */
  function initGenerativeBg() {
    if (!canvas) return;
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    var w = 0;
    var h = 0;
    var raf = null;

    var palettes = [
      [[210, 190, 165], [175, 155, 130], [140, 120, 100], [95, 82, 70], [230, 215, 195], [60, 52, 44], [185, 168, 145]],
      [[180, 160, 140], [120, 100, 85], [240, 220, 200], [70, 60, 50], [200, 175, 150], [45, 40, 35], [160, 145, 125]],
      [[195, 175, 155], [100, 90, 80], [220, 200, 175], [55, 48, 42], [165, 150, 130], [85, 75, 65], [235, 225, 210]],
      [[170, 145, 120], [130, 110, 95], [90, 75, 65], [210, 195, 175], [50, 42, 36], [190, 170, 145], [75, 65, 55]]
    ];

    var state = {
      mode: 0,
      modeT: 0,
      palA: 0,
      palB: 1,
      palMix: 0,
      streakDir: 0,
      turbulence: 1,
      contrast: 1,
      nextModeAt: 4,
      nextBurstAt: 2.5
    };

    function resize() {
      w = Math.max(280, Math.floor(window.innerWidth * 0.48));
      h = Math.max(200, Math.floor(window.innerHeight * 0.48));
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = "116%";
      canvas.style.height = "116%";
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function lerpColor(c0, c1, t) {
      return [
        lerp(c0[0], c1[0], t),
        lerp(c0[1], c1[1], t),
        lerp(c0[2], c1[2], t)
      ];
    }

    function pickPal(pal, i) {
      return pal[i % pal.length];
    }

    function colorAt(band, mixLocal) {
      var pa = palettes[state.palA];
      var pb = palettes[state.palB];
      var c0 = lerpColor(pickPal(pa, band), pickPal(pb, band), state.palMix);
      var c1 = lerpColor(pickPal(pa, band + 3), pickPal(pb, band + 3), state.palMix);
      return lerpColor(c0, c1, mixLocal);
    }

    function updateState(t, dt) {
      state.modeT += dt;
      state.palMix = (Math.sin(t * 0.07) + 1) * 0.5;
      state.turbulence = 0.55 + (Math.sin(t * 0.11) + 1) * 0.55 + Math.sin(t * 0.37) * 0.2;
      state.contrast = 0.85 + (Math.sin(t * 0.09) + 1) * 0.2;

      if (t >= state.nextModeAt) {
        state.mode = (state.mode + 1 + (Math.random() * 3 | 0)) % 4;
        state.modeT = 0;
        state.streakDir = Math.random() > 0.5 ? 1 : 0;
        state.palA = state.palB;
        state.palB = (state.palB + 1 + (Math.random() * 2 | 0)) % palettes.length;
        state.nextModeAt = t + 3.5 + Math.random() * 5;
      }

      if (t >= state.nextBurstAt) {
        state.nextBurstAt = t + 1.8 + Math.random() * 3.5;
        if (!reduced && bgWrap) {
          bgWrap.classList.remove("is-burst");
          void bgWrap.offsetWidth;
          bgWrap.classList.add("is-burst");
          window.setTimeout(function () {
            if (bgWrap) bgWrap.classList.remove("is-burst");
          }, 220);
        }
      }
    }

    function drawFrame(t) {
      genPhase = t;
      var scrollShift = scrollProgress * h * 0.4;
      var img = ctx.createImageData(w, h);
      var data = img.data;
      var bands = 28 + Math.floor(h / 18) + ((Math.sin(t * 0.2) + 1) * 8 | 0);
      var turb = state.turbulence;
      var mode = state.mode;
      var dir = state.streakDir;

      for (var y = 0; y < h; y++) {
        var yy = y + scrollShift;
        var band = Math.floor((((yy % (h * 2)) + h * 2) % (h * 2) / h) * bands);
        var wave =
          Math.sin(yy * 0.04 + t * 0.55) * (12 * turb) +
          Math.sin(yy * 0.013 - t * 0.32) * (18 * turb) +
          Math.sin(t * 0.9 + band * 0.7) * (8 * turb) +
          Math.sin(yy * 0.002 + t * 0.15) * (22 * turb);

        var mix = (Math.sin(yy * 0.025 + t * 0.6) + 1) * 0.5;
        if (mode === 1) mix = (Math.sin(yy * 0.08 + t * 1.2) + 1) * 0.5;
        if (mode === 2) mix = ((y / h) + Math.sin(t * 0.4) * 0.2) % 1;
        if (mode === 3) mix = (Math.sin(band * 0.9 + t) + 1) * 0.5;

        var base = colorAt(band, mix);

        for (var x = 0; x < w; x++) {
          var stretch;
          if (dir === 0 || mode === 0) {
            stretch = Math.sin(x * 0.01 + yy * 0.018 + t * 0.4) * (22 * turb);
          } else {
            stretch = Math.sin(y * 0.02 + x * 0.006 + t * 0.5) * (28 * turb);
          }

          if (mode === 1) {
            stretch += Math.sin(x * 0.03 - t * 1.1) * 35 * turb;
          } else if (mode === 2) {
            stretch += ((x + t * 40) % 90) * 0.35 * turb;
          } else if (mode === 3) {
            stretch += Math.sin((x + y) * 0.02 + t) * 40 * turb;
          }

          var nx = x + stretch + wave * 0.4;
          var columnNoise =
            Math.sin(nx * 0.06 + t * 0.8) * (10 * turb) +
            Math.sin(nx * 0.015 - yy * 0.01) * (6 * turb);

          var r = base[0] + columnNoise + wave * 0.25;
          var g = base[1] + columnNoise * 0.75 + wave * 0.15;
          var b = base[2] + columnNoise * 0.55;

          /* Bandas / sort verticales u horizontales */
          var stripe = dir === 0
            ? (band + Math.floor(x / (28 + (Math.sin(t) * 12 | 0)))) % (5 + mode)
            : (Math.floor(x / 12) + Math.floor(y / (18 + mode * 4))) % (6 + mode);

          if (stripe === 0) {
            r *= 0.68;
            g *= 0.66;
            b *= 0.64;
          } else if (stripe === 2) {
            r = Math.min(255, r * 1.12);
            g = Math.min(255, g * 1.08);
          }

          /* Contraste dinámico */
          r = 128 + (r - 128) * state.contrast;
          g = 128 + (g - 128) * state.contrast;
          b = 128 + (b - 128) * state.contrast;

          var i = (y * w + x) * 4;
          data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
          data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
          data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
          data[i + 3] = 255;
        }
      }

      /* Glitches: smear + slice shift + bloque */
      if (!reduced) {
        var glitchChance = 0.35 + (mode === 1 || mode === 3 ? 0.25 : 0);
        if (Math.random() < glitchChance) {
          var rows = 3 + (Math.random() * 8 | 0);
          for (var s = 0; s < rows; s++) {
            var sy = (Math.random() * h) | 0;
            var sh = 1 + (Math.random() * (mode === 3 ? 14 : 6) | 0);
            var sw = 30 + (Math.random() * (w * 0.55) | 0);
            var sx = (Math.random() * (w - sw)) | 0;
            var dx = ((Math.random() - 0.5) * (60 + mode * 30)) | 0;
            for (var ry = 0; ry < sh && sy + ry < h; ry++) {
              for (var rx = 0; rx < sw; rx++) {
                var src = ((sy + ry) * w + sx + rx) * 4;
                var dstX = sx + rx + dx;
                if (dstX < 0 || dstX >= w) continue;
                var dst = ((sy + ry) * w + dstX) * 4;
                data[dst] = data[src];
                data[dst + 1] = data[src + 1];
                data[dst + 2] = data[src + 2];
              }
            }
          }
        }

        if (Math.random() < 0.12 + mode * 0.04) {
          var blockY = (Math.random() * (h - 20)) | 0;
          var blockH = 8 + (Math.random() * 50 | 0);
          var shift = ((Math.random() - 0.5) * 100) | 0;
          for (var by = blockY; by < blockY + blockH && by < h; by++) {
            var row = new Uint8ClampedArray(w * 4);
            for (var bx = 0; bx < w; bx++) {
              var bi = (by * w + bx) * 4;
              row[bx * 4] = data[bi];
              row[bx * 4 + 1] = data[bi + 1];
              row[bx * 4 + 2] = data[bi + 2];
              row[bx * 4 + 3] = 255;
            }
            for (var bx2 = 0; bx2 < w; bx2++) {
              var from = ((bx2 - shift) % w + w) % w;
              var di = (by * w + bx2) * 4;
              data[di] = row[from * 4];
              data[di + 1] = row[from * 4 + 1];
              data[di + 2] = row[from * 4 + 2];
            }
          }
        }
      }

      ctx.putImageData(img, 0, 0);
    }

    var last = 0;
    var lastT = 0;
    function loop(now) {
      if (document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }
      var interval = reduced ? 140 : 48;
      if (now - last > interval) {
        var t = now * 0.001;
        var dt = lastT ? t - lastT : 0.05;
        lastT = t;
        last = now;
        updateState(t, dt);
        drawFrame(t);
      }
      raf = requestAnimationFrame(loop);
    }

    resize();
    drawFrame(0);
    window.addEventListener("resize", function () {
      resize();
      drawFrame(genPhase || 0);
    });
    raf = requestAnimationFrame(loop);

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      gsap.to(canvas, {
        y: "14%",
        scale: 1.1,
        filter: "blur(2.4px) contrast(1.14) saturate(0.92)",
        ease: "none",
        scrollTrigger: {
          start: 0,
          end: "max",
          scrub: 0.45,
          onUpdate: function (self) {
            scrollProgress = self.progress;
          }
        }
      });
    }
  }

  function ensureTapePlates() {
    document.querySelectorAll(".estilo-2026 .splitspan").forEach(function (span) {
      if (span.querySelector(".splitspan-line")) return;
      var line = document.createElement("span");
      line.className = "splitspan-line";
      while (span.firstChild) line.appendChild(span.firstChild);
      span.appendChild(line);
    });
  }

  function initTextShake() {
    if (reduced || typeof gsap === "undefined") return;
    gsap.utils.toArray(".estilo-2026 .splitspan-line").forEach(function (el) {
      if (el.dataset.shakeBound === "1") return;
      el.dataset.shakeBound = "1";
      var inLineup = !!el.closest(".lineup-columns");
      var ampX = inLineup ? 0.35 : 0.9;
      var ampY = inLineup ? 0.8 : 1.8;
      function shake() {
        gsap.to(el, {
          x: "random(" + -ampX + ", " + ampX + ")",
          y: "random(" + -ampY + ", " + ampY + ")",
          duration: 0.08,
          ease: "none",
          onComplete: shake
        });
      }
      shake();
    });
  }

  function initBlurPulse() {
    if (reduced || typeof gsap === "undefined") return;
    gsap.utils.toArray(".estilo-2026").forEach(function (el, i) {
      if (el.classList.contains("estilo-2026-xs")) return;
      gsap.to(el, {
        filter: "blur(1.05px)",
        duration: 1.6 + (i % 5) * 0.12,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: 0.9 + (i % 7) * 0.1
      });
    });
  }

  function initEnterAnimations() {
    if (typeof gsap === "undefined") return;
    if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

    var hero = gsap.utils.toArray(".site-intro .estilo-2026, .col-center .estilo-2026, .col-right .estilo-2026, .tickets-fixed .estilo-2026");
    gsap.set(hero, { opacity: 0, x: -36, filter: "blur(5px)" });
    gsap.to(hero, {
      opacity: 1,
      x: 0,
      filter: "blur(0.55px)",
      duration: 0.55,
      stagger: 0.08,
      ease: "power3.out",
      delay: 0.12,
      onComplete: initBlurPulse
    });

    gsap.utils.toArray(".lineup-columns li").forEach(function (li) {
      gsap.from(li, {
        opacity: 0,
        y: 28,
        filter: "blur(4px)",
        duration: 0.55,
        ease: "power3.out",
        clearProps: "filter",
        scrollTrigger: {
          trigger: li,
          start: "top 92%",
          toggleActions: "play none none none"
        }
      });
    });

    gsap.from(".info-band", {
      opacity: 0,
      y: 40,
      filter: "blur(8px)",
      duration: 0.7,
      ease: "power2.out",
      clearProps: "filter",
      scrollTrigger: { trigger: ".info-band", start: "top 85%" }
    });

    gsap.from(".cta-block", {
      opacity: 0,
      x: 50,
      filter: "blur(6px)",
      duration: 0.7,
      ease: "power2.out",
      clearProps: "filter",
      scrollTrigger: { trigger: ".cta-block", start: "top 88%" }
    });
  }

  function initSplitLines() {
    ensureTapePlates();

    function afterSplit() {
      initTextShake();
      initEnterAnimations();
    }

    if (typeof SplitText === "undefined" || typeof gsap === "undefined") {
      afterSplit();
      return;
    }
    gsap.registerPlugin(SplitText);
    try {
      SplitText.create(".splitspan", {
        type: "lines",
        tag: "span",
        linesClass: "splitspan-line",
        autoSplit: true,
        aria: "auto",
        onSplit: function (self) {
          self.lines.forEach(function (line) {
            line.style.display = "block";
          });
          afterSplit();
        }
      });
    } catch (_) {
      afterSplit();
    }
  }

  function boot() {
    initGenerativeBg();
    initSplitLines();
    window.setTimeout(initTextShake, 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
