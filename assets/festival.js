(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var video = document.getElementById("bgVideo");
  var bgWrap = document.querySelector(".bg-video");
  var overlay = document.getElementById("glitch-overlay");

  var VIDEO_SRC =
    "https://dantz.eu/festival/wp-content/uploads/sites/3/2026/03/Texture-Main-LQ-4-Scrubbing.mp4";

  function initVideoScroll() {
    if (!video || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("crossorigin", "anonymous");

    function bindScrub() {
      video.play().then(function () {
        video.pause();
        ScrollTrigger.create({
          start: 0,
          end: "max",
          scrub: true,
          onUpdate: function (self) {
            if (video.duration && isFinite(video.duration)) {
              video.currentTime = video.duration * self.progress;
            }
          }
        });
      }).catch(function () {
        video.loop = true;
        video.play().catch(function () {});
      });
    }

    if (video.readyState >= 1) bindScrub();
    else video.addEventListener("loadedmetadata", bindScrub, { once: true });
  }

  function initTextShake() {
    if (reduced || typeof gsap === "undefined") return;
    gsap.utils.toArray(".estilo-2026 .splitspan-line").forEach(function (el) {
      if (el.dataset.shakeBound === "1") return;
      el.dataset.shakeBound = "1";
      function shake() {
        gsap.to(el, {
          x: "random(-1.2, 1.2)",
          y: "random(-2.5, 2.5)",
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

  function randomFlicker() {
    if (reduced) return;
    var blocks = document.querySelectorAll(".estilo-2026");
    if (!blocks.length) return;
    var pick = blocks[Math.floor(Math.random() * blocks.length)];
    pick.classList.remove("is-flicker");
    void pick.offsetWidth;
    pick.classList.add("is-flicker");
    if (bgWrap) {
      bgWrap.classList.remove("is-burst");
      void bgWrap.offsetWidth;
      bgWrap.classList.add("is-burst");
    }
    window.setTimeout(function () {
      pick.classList.remove("is-flicker");
      if (bgWrap) bgWrap.classList.remove("is-burst");
    }, 280);
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
        var slices = 5 + (Math.random() * 7 | 0);
        var sh = bh / slices;
        for (var i = 0; i < slices; i++) {
          var sy = (i * sh) | 0;
          var h = i === slices - 1 ? bh - sy : (sh | 0);
          var dx = ((Math.random() - 0.5) * 48) | 0;
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
    timer = window.setInterval(drawGlitch, 110);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      } else if (!document.hidden && timer === null && !reduced) {
        timer = window.setInterval(drawGlitch, 110);
      }
    });
  }

  function boot() {
    if (video && !video.querySelector("source")) {
      var source = document.createElement("source");
      source.src = VIDEO_SRC;
      source.type = "video/mp4";
      video.appendChild(source);
      video.load();
    }
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
    initVideoScroll();
    initSplitLines();
    window.setTimeout(initTextShake, 800);
    initGlitchOverlay();
    if (!reduced) {
      window.setInterval(randomFlicker, 2400 + Math.random() * 2000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
