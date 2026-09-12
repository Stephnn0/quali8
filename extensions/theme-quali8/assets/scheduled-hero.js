/*
 * Quali8 — Seasonal hero / slider.
 *
 * Renders the live hero from the app proxy (up to 3 crossfading slides,
 * heading, description, button) with the theme-editor presentation
 * settings: eyebrow, second button, countdown, height mode, overlay style,
 * autoplay, slow zoom, dots, arrows. DOM built with createElement and
 * textContent only.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";

  var blocks = document.querySelectorAll("[data-quali8-hero]");
  if (!blocks.length) return;

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var HEIGHTS = { small: 360, medium: 520, large: 680 };

  function readSettings(block) {
    var node = block.querySelector("[data-q8-hero-settings]");
    try {
      return JSON.parse((node && node.textContent) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function cssUrl(url) {
    return 'url("' + String(url).replace(/"/g, "%22") + '")';
  }

  function arrow(direction) {
    var button = el("button", "q8-hero__arrow q8-hero__arrow--" + direction);
    button.type = "button";
    button.setAttribute("aria-label", direction === "prev" ? "Previous slide" : "Next slide");
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", direction === "prev" ? "M 10 3 L 5 8 L 10 13" : "M 6 3 L 11 8 L 6 13");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    button.appendChild(svg);
    return button;
  }

  /** "2d 04h" until the end of the end date (local midnight). */
  function countdownText(endDate) {
    var end = new Date(endDate + "T23:59:59");
    var diff = end.getTime() - Date.now();
    if (isNaN(diff) || diff <= 0) return null;
    var minutes = Math.floor(diff / 60000);
    var days = Math.floor(minutes / 1440);
    var hours = Math.floor((minutes % 1440) / 60);
    var mins = minutes % 60;
    if (days) return days + "d " + (hours < 10 ? "0" : "") + hours + "h";
    return hours + "h " + (mins < 10 ? "0" : "") + mins + "m";
  }

  function render(block, settings, hero) {
    Array.prototype.slice.call(block.children).forEach(function (child) {
      if (!child.hasAttribute("data-q8-hero-settings")) block.removeChild(child);
    });

    var images = [hero.imageUrl, hero.imageUrl2, hero.imageUrl3].filter(Boolean);
    var overlay =
      typeof hero.overlayOpacity === "number" ? hero.overlayOpacity : 35;
    var useApp = settings.useAppColors !== false;

    // Height
    var mode = settings.heightMode || "app";
    if (mode === "screen") {
      block.classList.add("q8-hero--screen");
    } else {
      block.style.setProperty(
        "--q8-hero-height",
        (HEIGHTS[mode] || hero.heightPx || 480) + "px",
      );
    }

    // Colours
    block.style.setProperty(
      "--q8-hero-text",
      (useApp ? hero.textColor : settings.textColor) || hero.textColor || "#ffffff",
    );
    block.style.setProperty(
      "--q8-hero-btn-bg",
      (useApp ? hero.buttonBackground : settings.buttonBackground) ||
        hero.buttonBackground ||
        "#ffffff",
    );
    block.style.setProperty(
      "--q8-hero-btn-text",
      (useApp ? hero.buttonTextColor : settings.buttonTextColor) ||
        hero.buttonTextColor ||
        "#1a1a1a",
    );

    // Overlay
    block.style.setProperty("--q8-hero-ov-color", settings.overlayColor || "#0a0818");
    block.style.setProperty("--q8-hero-ov-strong", String(Math.min(0.95, (overlay + 15) / 100)));
    block.style.setProperty("--q8-hero-ov-weak", String(Math.max(0, overlay - 20) / 100));
    block.style.setProperty("--q8-hero-ov-flat", String(overlay / 100));
    block.classList.add("q8-hero--ov-" + (settings.overlayStyle || "side"));

    if (settings.kenBurns !== false && !reducedMotion) {
      block.classList.add("q8-hero--zoom");
    }
    if (settings.animateIn !== false && !reducedMotion) {
      block.classList.add("q8-hero--animate");
    }

    // Slides
    var slides = images.map(function (url, index) {
      var slide = el("div", "q8-hero__slide");
      slide.style.backgroundImage = cssUrl(url);
      slide.setAttribute("role", "img");
      slide.setAttribute("aria-label", hero.heading);
      if (index === 0) slide.classList.add("q8-hero__slide--active");
      block.appendChild(slide);
      return slide;
    });

    // Content
    var inner = el("div", "q8-hero__inner");

    var top = el("div", "q8-hero__top");
    if (settings.eyebrow) {
      top.appendChild(el("span", "q8-hero__eyebrow", settings.eyebrow));
    }
    if (settings.showCountdown && hero.endDate) {
      var text = countdownText(hero.endDate);
      if (text) {
        var countdown = el("span", "q8-hero__countdown");
        if (settings.countdownLabel) {
          countdown.appendChild(el("span", "q8-hero__countdown-label", settings.countdownLabel));
        }
        var value = el("span", "q8-hero__countdown-value", text);
        countdown.appendChild(value);
        top.appendChild(countdown);
        setInterval(function () {
          value.textContent = countdownText(hero.endDate) || "0h 00m";
        }, 30000);
      }
    }
    if (top.childNodes.length) inner.appendChild(top);

    inner.appendChild(el("h2", "q8-hero__heading", hero.heading));
    if (hero.description) {
      inner.appendChild(el("p", "q8-hero__description", hero.description));
    }

    var actions = el("div", "q8-hero__actions");
    if (hero.buttonLabel && hero.buttonUrl) {
      var button = document.createElement("a");
      button.className = "q8-hero__button";
      button.textContent = hero.buttonLabel;
      button.href = hero.buttonUrl;
      actions.appendChild(button);
    }
    if (settings.secondaryLabel && settings.secondaryUrl) {
      var secondary = document.createElement("a");
      secondary.className = "q8-hero__button q8-hero__button--ghost";
      secondary.textContent = settings.secondaryLabel;
      secondary.href = settings.secondaryUrl;
      actions.appendChild(secondary);
    }
    if (actions.childNodes.length) inner.appendChild(actions);

    block.appendChild(inner);

    // Slider behaviour for 2+ images
    if (slides.length > 1) {
      var current = 0;
      var dotButtons = [];

      function go(index) {
        slides[current].classList.remove("q8-hero__slide--active");
        if (dotButtons[current]) dotButtons[current].classList.remove("q8-hero__dot--active");
        current = (index + slides.length) % slides.length;
        slides[current].classList.add("q8-hero__slide--active");
        if (dotButtons[current]) dotButtons[current].classList.add("q8-hero__dot--active");
      }

      var timer = null;
      function stop() {
        if (timer) clearInterval(timer);
        timer = null;
      }
      function restart() {
        stop();
        if (settings.autoplay === false || reducedMotion) return;
        timer = setInterval(function () {
          go(current + 1);
        }, Math.max(3, Number(settings.autoplaySeconds) || 5) * 1000);
      }

      if (settings.showDots !== false) {
        var dots = el("div", "q8-hero__dots");
        dotButtons = slides.map(function (_, index) {
          var dot = el("button", "q8-hero__dot");
          dot.type = "button";
          dot.setAttribute("aria-label", "Show slide " + (index + 1));
          if (index === 0) dot.classList.add("q8-hero__dot--active");
          dot.addEventListener("click", function () {
            go(index);
            restart();
          });
          dots.appendChild(dot);
          return dot;
        });
        block.appendChild(dots);
      }

      if (settings.showArrows) {
        var prev = arrow("prev");
        var next = arrow("next");
        prev.addEventListener("click", function () {
          go(current - 1);
          restart();
        });
        next.addEventListener("click", function () {
          go(current + 1);
          restart();
        });
        block.appendChild(prev);
        block.appendChild(next);
      }

      block.addEventListener("mouseenter", stop);
      block.addEventListener("mouseleave", restart);
      restart();
    }

    block.hidden = false;
  }

  fetch(ROOT + "apps/quali8/hero", { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var hero = data && data.hero;
      if (!hero || !hero.imageUrl || !hero.heading) return;
      blocks.forEach(function (block) {
        render(block, readSettings(block), hero);
      });
    })
    .catch(function () {
      /* never break the storefront */
    });
})();
