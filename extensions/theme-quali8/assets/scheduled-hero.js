/*
 * Quali8 — Scheduled hero. Renders the active hero (image, headline,
 * description, optional button) from the app proxy. textContent only.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";

  var blocks = document.querySelectorAll("[data-quali8-hero]");
  if (!blocks.length) return;

  fetch(ROOT + "apps/quali8/hero", { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var hero = data && data.hero;
      if (!hero || !hero.imageUrl || !hero.heading) return;

      blocks.forEach(function (block) {
        block.textContent = "";
        block.style.backgroundImage =
          "linear-gradient(rgba(15,10,30,.45), rgba(15,10,30,.45)), url(" +
          encodeURI(hero.imageUrl) +
          ")";

        var inner = document.createElement("div");
        inner.className = "q8-hero__inner";

        var heading = document.createElement("h2");
        heading.className = "q8-hero__heading";
        heading.textContent = hero.heading;
        inner.appendChild(heading);

        if (hero.description) {
          var description = document.createElement("p");
          description.className = "q8-hero__description";
          description.textContent = hero.description;
          inner.appendChild(description);
        }

        if (hero.buttonLabel && hero.buttonUrl) {
          var button = document.createElement("a");
          button.className = "q8-hero__button";
          button.textContent = hero.buttonLabel;
          button.href = hero.buttonUrl;
          inner.appendChild(button);
        }

        block.appendChild(inner);
        block.hidden = false;
      });
    })
    .catch(function () {
      /* never break the storefront */
    });
})();
