/*
 * Quali8 — Scheduled announcement bar.
 *
 * Asks the app proxy whether an announcement is scheduled for today and
 * renders it with the merchant-configured message and colors. Stays hidden
 * (zero layout shift) otherwise. DOM built with textContent only.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";

  var blocks = document.querySelectorAll("[data-quali8-announcement]");
  if (!blocks.length) return;

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
        block.textContent = bar.message;
        block.style.background = bar.backgroundColor || "#2c1f58";
        block.style.color = bar.textColor || "#ffffff";
        block.hidden = false;
      });
    })
    .catch(function () {
      /* never break the storefront */
    });
})();
