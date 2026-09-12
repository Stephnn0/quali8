/*
 * Quali8 — Announcement bar.
 *
 * Asks the app proxy whether a bar is scheduled for today and renders it
 * with the theme-editor presentation settings: prefix, link, countdown to
 * the end date, close button (remembered in localStorage), and a marquee
 * option. Stays hidden (zero layout shift) otherwise. DOM built with
 * createElement/textContent only.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var DISMISS_KEY = "q8-bar-dismissed";

  var blocks = document.querySelectorAll("[data-quali8-announcement]");
  if (!blocks.length) return;

  function readSettings(block) {
    var node = block.querySelector("[data-q8-bar-settings]");
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

  function dismissedUntil() {
    try {
      return Number(localStorage.getItem(DISMISS_KEY) || 0);
    } catch (e) {
      return 0;
    }
  }

  function rememberDismiss(days) {
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + Math.max(1, days || 1) * 86400000),
      );
    } catch (e) {
      /* private browsing — the bar will just come back */
    }
  }

  /** "2d 04h 12m" until the end of the end date (local midnight). */
  function countdownText(endDate) {
    var end = new Date(endDate + "T23:59:59");
    var diff = end.getTime() - Date.now();
    if (isNaN(diff) || diff <= 0) return null;
    var minutes = Math.floor(diff / 60000);
    var days = Math.floor(minutes / 1440);
    var hours = Math.floor((minutes % 1440) / 60);
    var mins = minutes % 60;
    var parts = [];
    if (days) parts.push(days + "d");
    parts.push((hours < 10 ? "0" : "") + hours + "h");
    parts.push((mins < 10 ? "0" : "") + mins + "m");
    return parts.join(" ");
  }

  function messageNode(settings, bar) {
    var wrap = el("span", "q8-bar__message");
    if (settings.prefix) {
      wrap.appendChild(el("span", "q8-bar__prefix", settings.prefix));
    }
    wrap.appendChild(el("span", "q8-bar__text", bar.message));

    if (settings.showCountdown && bar.endDate) {
      var text = countdownText(bar.endDate);
      if (text) {
        var countdown = el("span", "q8-bar__countdown");
        if (settings.countdownLabel) {
          countdown.appendChild(
            el("span", "q8-bar__countdown-label", settings.countdownLabel),
          );
        }
        var value = el("span", "q8-bar__countdown-value", text);
        countdown.appendChild(value);
        wrap.appendChild(countdown);
        setInterval(function () {
          var next = countdownText(bar.endDate);
          value.textContent = next || "0h 00m";
        }, 30000);
      }
    }

    if (settings.linkUrl && settings.linkLabel) {
      var link = document.createElement("a");
      link.className =
        "q8-bar__link" +
        (settings.linkStyle === "button" ? " q8-bar__link--button" : "");
      link.href = settings.linkUrl;
      link.textContent = settings.linkLabel;
      wrap.appendChild(link);
    }
    return wrap;
  }

  function render(block, settings, bar) {
    Array.prototype.slice.call(block.children).forEach(function (child) {
      if (!child.hasAttribute("data-q8-bar-settings")) block.removeChild(child);
    });

    var bg = settings.useAppColors !== false
      ? bar.backgroundColor || settings.backgroundColor
      : settings.backgroundColor || bar.backgroundColor;
    var fg = settings.useAppColors !== false
      ? bar.textColor || settings.textColor
      : settings.textColor || bar.textColor;
    block.style.setProperty("--q8-bar-bg", bg || "#2c1f58");
    block.style.setProperty("--q8-bar-text", fg || "#ffffff");

    var inner = el("div", "q8-bar__inner");

    if (settings.marquee) {
      var track = el("div", "q8-bar__track");
      // Two copies make the loop seamless
      track.appendChild(messageNode(settings, bar));
      var copy = messageNode(settings, bar);
      copy.setAttribute("aria-hidden", "true");
      track.appendChild(copy);
      inner.appendChild(track);
    } else {
      inner.appendChild(messageNode(settings, bar));
    }

    if (settings.dismissible !== false) {
      var close = el("button", "q8-bar__close");
      close.type = "button";
      close.setAttribute("aria-label", "Close announcement");
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("aria-hidden", "true");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M 4 4 L 12 12 M 12 4 L 4 12");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("fill", "none");
      svg.appendChild(path);
      close.appendChild(svg);
      close.addEventListener("click", function () {
        rememberDismiss(settings.dismissDays);
        block.classList.add("q8-bar--closing");
        setTimeout(function () {
          block.hidden = true;
        }, 220);
      });
      inner.appendChild(close);
    }

    block.appendChild(inner);
    block.classList.add("q8-bar--anim-" + (settings.animation || "slide"));
    block.hidden = false;
  }

  if (dismissedUntil() > Date.now()) return;

  fetch(ROOT + "apps/quali8/announcement", {
    headers: { Accept: "application/json" },
  })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var bar = data && data.bar;
      if (!bar || !bar.message) return;
      blocks.forEach(function (block) {
        render(block, readSettings(block), bar);
      });
    })
    .catch(function () {
      /* never break the storefront */
    });
})();
