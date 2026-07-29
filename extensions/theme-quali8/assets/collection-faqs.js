/*
 * Quali8 — Collection FAQs.
 *
 * Fetches the collection's FAQ entries from the app proxy and renders a
 * native <details> accordion plus FAQPage JSON-LD structured data. Visible
 * content is built with createElement/textContent only; the JSON-LD script
 * carries the same strings JSON-encoded.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";

  var blocks = document.querySelectorAll("[data-quali8-faqs]");
  if (!blocks.length) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function numericId(gid) {
    return String(gid || "").split("/").pop();
  }

  function injectJsonLd(faqs) {
    var payload = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(function (faq) {
        return {
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        };
      }),
    };
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(payload);
    document.head.appendChild(script);
  }

  function render(block, faqs) {
    block.textContent = "";

    var heading = block.dataset.heading;
    if (heading) block.appendChild(el("h2", "q8-faqs__heading", heading));

    var list = el("div", "q8-faqs__list");
    faqs.forEach(function (faq) {
      var item = document.createElement("details");
      item.className = "q8-faqs__item";
      var summary = document.createElement("summary");
      summary.className = "q8-faqs__question";
      summary.textContent = faq.question;
      var answer = el("p", "q8-faqs__answer", faq.answer);
      item.appendChild(summary);
      item.appendChild(answer);
      list.appendChild(item);
    });
    block.appendChild(list);
    block.hidden = false;
  }

  blocks.forEach(function (block) {
    var collectionId = numericId(block.dataset.collectionId);
    if (!collectionId) return;

    fetch(
      ROOT + "apps/quali8/faqs?collection_id=" + encodeURIComponent(collectionId),
      { headers: { Accept: "application/json" } },
    )
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        var faqs = (data && data.faqs) || [];
        if (!faqs.length) return;
        render(block, faqs);
        injectJsonLd(faqs);
      })
      .catch(function () {
        /* never break the storefront */
      });
  });
})();
