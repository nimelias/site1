(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var video = document.getElementById("bgVideo");
  var bgWrap = document.querySelector(".bg-video");
  var overlay = document.getElementById("glitch-overlay");

  var VIDEO_LOCAL = "assets/festival/texture-main.mp4";

  function showVideoFrame(t) {
    if (!video || !video.duration || !isFinite(video.duration)) return;
    try {
      video.currentTime = Math.min(Math.max(t, 0.001), video.duration - 0.05);
    } catch (_) {}
  }

  function initVideoScroll() {
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.loop = true;

    function bindScrub() {
      showVideoFrame(0.08);

      if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.create({
          start: 0,
          end: "max",
          scrub: 0.35,
          onUpdate: function (self) {
            showVideoFrame(video.duration * self.progress);
          }
        });
      }

      if (!reduced) {
        video.play().catch(function () {});
      }
    }

    function onReady() {
      bindScrub();
      if (overlay) initGlitchOverlay();
    }

    if (video.readyState >= 1) onReady();
    else video.addEventListener("loadedmetadata", onReady, { once: true });

    video.addEventListener("error", function () {
      if (bgWrap) bgWrap.classList.add("bg-video--fallback");
    });
  }

  function initTextShake() {
    if (reduced || typeof gsap === "undefined") return;
    gsap.utils.toArray(".estilo-2026 .splitspan-line").forEach(function (el) {
      if (el.dataset.shakeBound === "1") return;
      el.dataset.shakeBound = "1";
      var inLineup = el.closest(".lineup-columns");
      var ampX = inLineup ? 0.45 : 1.2;
      var ampY = inLineup ? 1 : 2.5;
      function shake() {
        gsap.to(el, {
          x: "random(" + -ampX + ", " + ampX + ")",
          y: "random(" + -ampY + ", " + ampY + ")",
          duration: 0.07,
          ease: "none",
          onComplete: shake
        });
      }
      shake();
    });
  }

  function initSplitLines() {
    if (typeof SplitText === "undefined" || typeof gsap === "undefined") return;
    gsap.registerPlugin(SplitText);
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
        initTextShake();
      }
    });
  }

  function backgroundBurst() {
    if (reduced || !bgWrap) return;
    bgWrap.classList.remove("is-burst");
    void bgWrap.offsetWidth;
    bgWrap.classList.add("is-burst");
    window.setTimeout(function () {
      bgWrap.classList.remove("is-burst");
    }, 200);
  }

  function initGlitchOverlay() {
    if (!overlay || !video || reduced) return;
    var ctx = overlay.getContext("2d");
    if (!ctx) return;

    var buffer = document.createElement("canvas");
    var bctx = buffer.getContext("2d");
    var timer = null;
    var bw = 480;
    var bh = 270;

    function resize() {
      overlay.width = window.innerWidth;
      overlay.height = window.innerHeight;
      bh = Math.max(160, Math.floor(bw * (overlay.height / overlay.width)));
      buffer.width = bw;
      buffer.height = bh;
    }

    function drawGlitch() {
      if (document.hidden || video.readyState < 2 || !bctx) return;
      try {
        bctx.drawImage(video, 0, 0, bw, bh);
        var slices = 4 + (Math.random() * 5 | 0);
        var sh = bh / slices;
        for (var i = 0; i < slices; i++) {
          var sy = (i * sh) | 0;
          var h = i === slices - 1 ? bh - sy : (sh | 0);
          var dx = ((Math.random() - 0.5) * 36) | 0;
          if (!dx) continue;
          var strip = bctx.getImageData(0, sy, bw, h);
          bctx.putImageData(strip, dx, sy);
        }
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        ctx.drawImage(buffer, 0, 0, overlay.width, overlay.height);
      } catch (_) {
        if (timer !== null) {
          window.clearInterval(timer);
          timer = null;
        }
      }
    }

    resize();
    window.addEventListener("resize", resize);
    timer = window.setInterval(drawGlitch, 140);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      } else if (!document.hidden && timer === null && !reduced) {
        timer = window.setInterval(drawGlitch, 140);
      }
    });
  }

  function boot() {
    if (video && !video.currentSrc && !video.querySelector("source")) {
      video.src = VIDEO_LOCAL;
      video.load();
    }
    initVideoScroll();
    initSplitLines();
    window.setTimeout(initTextShake, 600);
    if (!reduced) {
      window.setInterval(backgroundBurst, 8000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
