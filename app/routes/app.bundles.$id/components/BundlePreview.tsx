import { Fragment } from "react";
import { computeBundlePricing, applyPercentDiscount } from "app/utils/bundlePricing";
import type { BundleFormItemState } from "../types";

/**
 * Storefront-style live preview of the bundle widget. Mirrors the markup and
 * styling of the theme app block (extensions/theme-quali8/assets/bundles.css)
 * so what the merchant sees here matches what shoppers get.
 */

type BundlePreviewProps = {
  title: string;
  description: string;
  discountPercent: number;
  items: BundleFormItemState[];
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

const card: React.CSSProperties = {
  background: "#ffffff",
  color: "#1a1a1a",
  border: "1px solid rgba(0, 0, 0, 0.12)",
  borderRadius: 12,
  padding: "1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const thumbBox: React.CSSProperties = {
  margin: 0,
  position: "relative",
  width: 72,
  height: 72,
  border: "1px solid rgba(0, 0, 0, 0.08)",
  borderRadius: 8,
  overflow: "hidden",
  background: "rgba(0, 0, 0, 0.03)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
};

export function BundlePreview({
  title,
  description,
  discountPercent,
  items,
}: BundlePreviewProps) {
  if (items.length === 0) {
    return (
      <div style={{ ...card, alignItems: "center", padding: "2.5rem 1.25rem" }}>
        <span style={{ opacity: 0.6, fontSize: "0.9rem", textAlign: "center" }}>
          Select products to see how the bundle will look on your storefront.
        </span>
      </div>
    );
  }

  const pricing = computeBundlePricing(items, discountPercent);
  const hasDiscount = pricing.discountAmount > 0;

  return (
    <div style={card}>
      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, lineHeight: 1.3 }}>
        {title.trim() || "Frequently bought together"}
      </h3>
      {description.trim() ? (
        <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.7 }}>
          {description.trim()}
        </p>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        {items.map((item, index) => (
          <Fragment key={item.productId}>
            {index > 0 ? (
              <span style={{ fontSize: "1.1rem", opacity: 0.55 }}>+</span>
            ) : null}
            <figure style={thumbBox}>
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.productTitle}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <span style={{ fontSize: "1.5rem", opacity: 0.5 }}>🛍</span>
              )}
            </figure>
          </Fragment>
        ))}
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
        }}
      >
        {items.map((item) => (
          <li
            key={item.productId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
              fontSize: "0.9rem",
            }}
          >
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {item.productTitle}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>
              {hasDiscount ? (
                <>
                  <s style={{ opacity: 0.55, marginRight: "0.4rem" }}>
                    {money(item.price)}
                  </s>
                  {money(applyPercentDiscount(item.price, discountPercent))}
                </>
              ) : (
                money(item.price)
              )}
            </span>
          </li>
        ))}
      </ul>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          paddingTop: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          {hasDiscount ? (
            <s style={{ opacity: 0.55, fontSize: "0.95rem" }}>
              {money(pricing.originalTotal)}
            </s>
          ) : null}
          <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {money(pricing.finalTotal)}
          </span>
        </div>
        {pricing.savingsPercent > 0 ? (
          <span
            style={{
              background: "rgba(26, 26, 26, 0.12)",
              color: "#1a1a1a",
              fontSize: "0.8rem",
              fontWeight: 600,
              padding: "0.25rem 0.6rem",
              borderRadius: 999,
            }}
          >
            {`Save ${money(pricing.discountAmount)} (${pricing.savingsPercent}%)`}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        disabled
        style={{
          appearance: "none",
          border: "none",
          background: "#1a1a1a",
          color: "#fff",
          fontSize: "0.95rem",
          fontWeight: 600,
          padding: "0.8rem 1.25rem",
          borderRadius: 8,
          alignSelf: "flex-start",
          cursor: "default",
        }}
      >
        Add bundle to cart
      </button>

      <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.6 }}>
        Discounts will be applied at checkout.
      </p>
    </div>
  );
}
