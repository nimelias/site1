(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bgWrap = document.querySelector(".bg-gen");
  var canvas = document.getElementById("bg-canvas");
  var scrollProgress = 0;
  var genPhase = 0;

  /* —— Fondo generativo (pixel-streak + bandas) —— */
  function initGenerativeBg() {
    if (!canvas) return;
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    var w = 0;
    var h = 0;
    var dpr = 1;
    var raf = null;
    var palette = [
      [210, 190, 165],
      [175, 155, 130],
      [140, 120, 100],
      [95, 82, 70],
      [230, 215, 195],
      [60, 52, 44],
      [185, 168, 145]
    ];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(320, Math.floor(window.innerWidth * 0.55));
      h = Math.max(240, Math.floor(window.innerHeight * 0.55));
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = "116%";
      canvas.style.height = "116%";
    }

    function pick(i) {
      return palette[i % palette.length];
    }

    function drawFrame(t) {
      genPhase = t;
      var scrollShift = scrollProgress * h * 0.35;
      var img = ctx.createImageData(w, h);
      var data = img.data;
      var bands = 36 + Math.floor(h / 22);

      for (var y = 0; y < h; y++) {
        var yy = (y + scrollShift) % (h * 2);
        var band = Math.floor((yy / h) * bands);
        var wave =
          Math.sin(yy * 0.035 + t * 0.4) * 10 +
          Math.sin(yy * 0.011 - t * 0.25) * 14 +
          Math.sin(t * 0.6 + band) * 6;
        var c0 = pick(band);
        var c1 = pick(band + 3);
        var mix = (Math.sin(yy * 0.02 + t) + 1) * 0.5;

        for (var x = 0; x < w; x++) {
          var stretch = Math.sin(x * 0.008 + yy * 0.015 + t * 0.3) * 18;
          var nx = x + stretch + wave;
          var columnNoise = Math.sin(nx * 0.05 + t) * 8;
          var r = c0[0] * (1 - mix) + c1[0] * mix + columnNoise + wave * 0.3;
          var g = c0[1] * (1 - mix) + c1[1] * mix + columnNoise * 0.7;
          var b = c0[2] * (1 - mix) + c1[2] * mix + columnNoise * 0.5;
          /* Bandas verticales tipo pixel-sort */
          if ((band + Math.floor(x / 40)) % 7 === 0) {
            r *= 0.72;
            g *= 0.7;
            b *= 0.68;
          }
          var i = (y * w + x) * 4;
          data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
          data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
          data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
          data[i + 3] = 255;
        }
      }

      /* Smear horizontal aleatorio (glitch) */
      if (!reduced && Math.random() < 0.45) {
        var rows = 2 + (Math.random() * 5 | 0);
        for (var s = 0; s < rows; s++) {
          var sy = (Math.random() * h) | 0;
          var sw = 20 + (Math.random() * (w * 0.4) | 0);
          var sx = (Math.random() * (w - sw)) | 0;
          var dx = ((Math.random() - 0.5) * 80) | 0;
          for (var ry = 0; ry < 3 && sy + ry < h; ry++) {
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

      ctx.putImageData(img, 0, 0);
    }

    var last = 0;
    function loop(now) {
      if (document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (now - last > (reduced ? 120 : 55)) {
        last = now;
        drawFrame(now * 0.001);
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
        y: "12%",
        scale: 1.08,
        filter: "blur(2.2px) contrast(1.12) saturate(0.9)",
        ease: "none",
        scrollTrigger: {
          start: 0,
          end: "max",
          scrub: 0.5,
          onUpdate: function (self) {
            scrollProgress = self.progress;
          }
        }
      });
    }
  }

  function backgroundBurst() {
    if (reduced || !bgWrap) return;
    bgWrap.classList.remove("is-burst");
    void bgWrap.offsetWidth;
    bgWrap.classList.add("is-burst");
    window.setTimeout(function () {
      bgWrap.classList.remove("is-burst");
    }, 240);
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

  function initMarqueeGsap() {
    var track = document.querySelector(".marquee");
    if (!track || typeof gsap === "undefined" || reduced) return;
    var total = track.scrollWidth / 2;
    gsap.to(track, {
      x: -total,
      duration: 28,
      ease: "none",
      repeat: -1
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
    initMarqueeGsap();
    window.setTimeout(initTextShake, 700);
    if (!reduced) {
      window.setInterval(backgroundBurst, 9000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
