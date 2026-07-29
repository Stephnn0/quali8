/*
 * Quali8 — Scheduled hero / slider. Renders the active hero from the app
 * proxy: up to 3 crossfading slides, merchant-controlled height, text and
 * button colors, and overlay strength. textContent only.
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

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function cssUrl(url) {
    return 'url("' + String(url).replace(/"/g, "%22") + '")';
  }

  function render(block, hero) {
    block.textContent = "";

    var images = [hero.imageUrl, hero.imageUrl2, hero.imageUrl3].filter(
      Boolean,
    );
    var overlay = typeof hero.overlayOpacity === "number" ? hero.overlayOpacity : 35;

    block.style.setProperty("--q8-hero-height", (hero.heightPx || 480) + "px");
    block.style.setProperty("--q8-hero-text", hero.textColor || "#ffffff");
    block.style.setProperty("--q8-hero-btn-bg", hero.buttonBackground || "#ffffff");
    block.style.setProperty("--q8-hero-btn-text", hero.buttonTextColor || "#1a1a1a");
    block.style.setProperty("--q8-hero-ov-strong", String(Math.min(0.95, (overlay + 15) / 100)));
    block.style.setProperty("--q8-hero-ov-weak", String(Math.max(0, overlay - 20) / 100));

    // Slides
    var slides = images.map(function (url, index) {
      var slide = el("div", "q8-hero__slide");
      slide.style.backgroundImage = cssUrl(url);
      if (index === 0) slide.classList.add("q8-hero__slide--active");
      block.appendChild(slide);
      return slide;
    });

    var inner = el("div", "q8-hero__inner");
    var heading = el("h2", "q8-hero__heading", hero.heading);
    inner.appendChild(heading);
    if (hero.description) {
      inner.appendChild(el("p", "q8-hero__description", hero.description));
    }
    if (hero.buttonLabel && hero.buttonUrl) {
      var button = document.createElement("a");
      button.className = "q8-hero__button";
      button.textContent = hero.buttonLabel;
      button.href = hero.buttonUrl;
      inner.appendChild(button);
    }
    block.appendChild(inner);

    // Slider behavior for 2+ images
    if (slides.length > 1) {
      var current = 0;
      var dots = el("div", "q8-hero__dots");
      var dotButtons = slides.map(function (_, index) {
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

      function go(index) {
        slides[current].classList.remove("q8-hero__slide--active");
        dotButtons[current].classList.remove("q8-hero__dot--active");
        current = index;
        slides[current].classList.add("q8-hero__slide--active");
        dotButtons[current].classList.add("q8-hero__dot--active");
      }

      var timer = null;
      function restart() {
        if (reducedMotion) return;
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
          go((current + 1) % slides.length);
        }, 5000);
      }
      block.addEventListener("mouseenter", function () {
        if (timer) clearInterval(timer);
      });
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
        render(block, hero);
      });
    })
    .catch(function () {
      /* never break the storefront */
    });
})();
