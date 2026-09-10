(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var canvas = document.getElementById("field");
  var hudNum = document.getElementById("hud-num");
  var hudLabel = document.getElementById("hud-label");
  var hudFill = document.getElementById("hud-fill");
  var hudFid = document.getElementById("hud-fid");
  var hudMeter = document.querySelector(".hud-meter");
  var concrete = 0;
  var scrollProgress = 0;

  function setConcrete(v) {
    concrete = Math.max(0, Math.min(1, v));
    root.style.setProperty("--concrete", String(concrete));
    var pct = Math.round(concrete * 100);
    if (hudFill) hudFill.style.width = pct + "%";
    if (hudFid) hudFid.textContent = "fidelidad " + pct + "%";
    if (hudMeter) hudMeter.setAttribute("aria-valuenow", String(pct));
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /* Fondo: de mancha a retícula */
  function initField() {
    if (!canvas) return;
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    var w = 0;
    var h = 0;
    var last = 0;

    function resize() {
      w = Math.max(240, Math.floor(window.innerWidth * 0.42));
      h = Math.max(180, Math.floor(window.innerHeight * 0.42));
      canvas.width = w;
      canvas.height = h;
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function draw(t) {
      var img = ctx.createImageData(w, h);
      var data = img.data;
      var c = concrete;
      var bands = 16 + Math.floor(c * 28);
      var grid = 8 + Math.floor(c * 36);

      for (var y = 0; y < h; y++) {
        var yy = y + scrollProgress * h * 0.25;
        for (var x = 0; x < w; x++) {
          var n =
            Math.sin((x + yy) * 0.02 + t * 0.4) * (1 - c) +
            Math.sin(x * 0.04 - t * 0.3) * (0.6 - c * 0.4);
          var gx = Math.floor(x / Math.max(4, grid));
          var gy = Math.floor(y / Math.max(4, grid));
          var cell = ((gx + gy) % 2) * c;
          var mix = (Math.sin(yy * 0.03 + t * 0.5 + n) + 1) * 0.5;
          var band = Math.floor((yy / h) * bands) % 7;

          var r = lerp(55 + band * 12, 18 + gx * 2, c) + n * 40 * (1 - c);
          var g = lerp(48 + band * 8, 42 + gy, c) + n * 28 * (1 - c) + c * 35;
          var b = lerp(40 + band * 6, 62 + cell * 20, c) + n * 18 * (1 - c) + c * 48;

          if (c > 0.45 && (x % grid < 1 || y % grid < 1)) {
            r = lerp(r, 210, (c - 0.45) * 0.35);
            g = lerp(g, 240, (c - 0.45) * 0.35);
            b = lerp(b, 220, (c - 0.45) * 0.25);
          }

          var i = (y * w + x) * 4;
          data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
          data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
          data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
          data[i + 3] = 255;
        }
      }

      if (!reduced && c < 0.7 && Math.random() < 0.28 * (1 - c)) {
        var sy = (Math.random() * h) | 0;
        var sh = 2 + (Math.random() * 10 | 0);
        var dx = ((Math.random() - 0.5) * 40 * (1 - c)) | 0;
        for (var ry = 0; ry < sh && sy + ry < h; ry++) {
          for (var x2 = 0; x2 < w; x2++) {
            var src = ((sy + ry) * w + x2) * 4;
            var dstX = x2 + dx;
            if (dstX < 0 || dstX >= w) continue;
            var dst = ((sy + ry) * w + dstX) * 4;
            data[dst] = data[src];
            data[dst + 1] = data[src + 1];
            data[dst + 2] = data[src + 2];
          }
        }
      }

      ctx.putImageData(img, 0, 0);
    }

    function loop(now) {
      if (!document.hidden && now - last > (reduced ? 160 : 50)) {
        last = now;
        draw(now * 0.001);
      }
      requestAnimationFrame(loop);
    }

    resize();
    draw(0);
    window.addEventListener("resize", function () {
      resize();
      draw(0);
    });
    requestAnimationFrame(loop);
  }

  function ensureTapePlates() {
    document.querySelectorAll(".tape .splitspan").forEach(function (span) {
      if (span.querySelector(".splitspan-line")) return;
      var line = document.createElement("span");
      line.className = "splitspan-line";
      while (span.firstChild) line.appendChild(span.firstChild);
      span.appendChild(line);
    });
  }

  function initGsap() {
    if (typeof gsap === "undefined") return;
    if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

    var marquee = document.getElementById("marquee");
    var marqueeTween;
    if (marquee && !reduced) {
      marqueeTween = gsap.to(marquee, {
        x: "-50%",
        duration: 32,
        ease: "none",
        repeat: -1
      });
    }

    gsap.to(root, {
      ease: "none",
      scrollTrigger: {
        start: 0,
        end: "max",
        scrub: 0.35,
        onUpdate: function (self) {
          scrollProgress = self.progress;
          setConcrete(self.progress);
          if (marqueeTween) marqueeTween.timeScale(1.35 - self.progress * 0.95);
        }
      }
    });

    var acts = gsap.utils.toArray(".act");
    acts.forEach(function (act) {
      ScrollTrigger.create({
        trigger: act,
        start: "top 55%",
        end: "bottom 45%",
        onEnter: function () { applyHud(act); },
        onEnterBack: function () { applyHud(act); }
      });
    });

    if (!reduced) {
      gsap.to(".blob.b1", { attr: { cx: 360, cy: 300, rx: 90, ry: 90 }, duration: 4.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(".blob.b2", { attr: { cx: 420, cy: 310, rx: 80, ry: 80 }, duration: 5.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(".blob.b3", { attr: { cx: 390, cy: 290, rx: 70, ry: 70 }, duration: 3.8, yoyo: true, repeat: -1, ease: "sine.inOut" });

      gsap.utils.toArray(".glyph-cloud span").forEach(function (el, i) {
        gsap.to(el, {
          x: "random(-40, 40)",
          y: "random(-30, 30)",
          rotation: "random(-20, 20)",
          duration: 2.4 + (i % 5) * 0.3,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut"
        });
      });
    }

    var heroTape = document.querySelector(".act-0 .tape");
    if (heroTape) {
      gsap.from(heroTape, {
        opacity: 0,
        y: 40,
        filter: "blur(12px)",
        duration: reduced ? 0.01 : 1.1,
        ease: "power3.out",
        delay: 0.15
      });
    }

    gsap.utils.toArray(".manifesto-line").forEach(function (el) {
      gsap.from(el, {
        x: -48,
        opacity: 0,
        filter: "blur(8px)",
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

    gsap.utils.toArray(".signal-list li").forEach(function (el, i) {
      gsap.from(el, {
        x: -24,
        opacity: 0,
        duration: 0.5,
        delay: i * 0.08,
        scrollTrigger: { trigger: el, start: "top 90%" }
      });
    });

    gsap.utils.toArray(".morph-card").forEach(function (card) {
      var depth = Number(card.dataset.depth || 0);
      gsap.fromTo(card, {
        opacity: 0.25,
        filter: "blur(10px)",
        rotate: (depth - 1) * 4,
        scale: 0.92,
        borderRadius: "50%"
      }, {
        opacity: 1,
        filter: "blur(0px)",
        rotate: 0,
        scale: 1,
        borderRadius: "18px",
        ease: "none",
        scrollTrigger: {
          trigger: card,
          start: "top 88%",
          end: "top 40%",
          scrub: 0.6
        }
      });
    });

    gsap.utils.toArray(".step").forEach(function (step, i) {
      gsap.from(step, {
        opacity: 0,
        x: i % 2 === 0 ? -36 : 36,
        filter: "blur(6px)",
        duration: 0.65,
        ease: "power2.out",
        scrollTrigger: { trigger: step, start: "top 86%" }
      });
    });

    gsap.utils.toArray(".reveal-product").forEach(function (el) {
      gsap.from(el, {
        opacity: 0,
        y: 48,
        filter: "blur(8px)",
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 82%" }
      });
    });

    gsap.utils.toArray(".product-shot img, .product-gallery img").forEach(function (img) {
      gsap.fromTo(img, {
        filter: "blur(16px) saturate(0.2)",
        scale: 1.08,
        clipPath: "inset(38% 28% 38% 28% round 40px)"
      }, {
        filter: "blur(0px) saturate(1)",
        scale: 1,
        clipPath: "inset(0% 0% 0% 0% round 12px)",
        ease: "none",
        scrollTrigger: {
          trigger: img,
          start: "top 90%",
          end: "top 42%",
          scrub: 0.5
        }
      });
    });

    gsap.from(".cta-panel", {
      opacity: 0,
      y: 30,
      duration: 0.7,
      scrollTrigger: { trigger: ".cta-panel", start: "top 88%" }
    });

    if (canvas && !reduced) {
      gsap.to(canvas, {
        y: "10%",
        scale: 1.08,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.4 }
      });
    }
  }

  function applyHud(act) {
    var n = act.getAttribute("data-iter") || "0";
    var label = act.getAttribute("data-label") || "";
    if (hudNum) hudNum.textContent = pad(Number(n));
    if (hudLabel) hudLabel.textContent = label;
  }

  function initSplit() {
    ensureTapePlates();
    var gsapReady = false;
    function go() {
      if (!gsapReady) {
        gsapReady = true;
        initGsap();
      }
      if (reduced || typeof gsap === "undefined") return;
      gsap.utils.toArray(".tape .splitspan-line").forEach(function (el) {
        if (el.dataset.shakeBound === "1") return;
        el.dataset.shakeBound = "1";
        var amp = el.closest(".act-0") ? 1.6 : 0.45;
        (function shake() {
          gsap.to(el, {
            x: "random(" + -amp + ", " + amp + ")",
            y: "random(" + -amp + ", " + amp + ")",
            duration: 0.09,
            ease: "none",
            onComplete: shake
          });
        })();
      });
    }

    if (typeof SplitText === "undefined" || typeof gsap === "undefined") {
      go();
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
          go();
        }
      });
    } catch (_) {
      go();
    }
  }

  function boot() {
    setConcrete(0);
    initField();
    initSplit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
