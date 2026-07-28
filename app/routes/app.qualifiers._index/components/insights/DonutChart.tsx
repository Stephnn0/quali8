import { useState } from "react";
import { Text } from "@shopify/polaris";
import type { CountrySlice } from "app/services/audiences/customerInsights";
import styles from "./styles.module.css";

const SLICE_COLORS = [
  "var(--viz-cat-1)",
  "var(--viz-cat-2)",
  "var(--viz-cat-3)",
  "var(--viz-cat-4)",
  "var(--viz-cat-5)",
];

const sliceColor = (slice: CountrySlice, index: number) =>
  slice.label === "Other" ? "var(--viz-other)" : SLICE_COLORS[index % 5];

const TAU = Math.PI * 2;
/** Angular gap between slices, the donut equivalent of a 2px surface gap. */
const PAD_ANGLE = 0.03;

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const point = (r: number, angle: number) => {
    // Angles measured from 12 o'clock, clockwise
    const a = angle - Math.PI / 2;
    return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  };
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${point(rOuter, startAngle)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${point(rOuter, endAngle)}`,
    `L ${point(rInner, endAngle)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${point(rInner, startAngle)}`,
    "Z",
  ].join(" ");
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

/**
 * Donut of customers by country. The legend doubles as the table view
 * (label, count, share) and both directions of hover are linked.
 */
export function DonutChart({ slices }: { slices: CountrySlice[] }) {
  const [active, setActive] = useState<number | null>(null);

  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (total === 0) return null;

  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 80;
  const rInner = 56;

  let cursor = 0;
  const arcs = slices.map((slice, index) => {
    const sweep = (slice.count / total) * TAU;
    const pad = slices.length > 1 ? Math.min(PAD_ANGLE, sweep / 4) : 0;
    const path = arcPath(
      cx,
      cy,
      rOuter,
      rInner,
      cursor + pad / 2,
      cursor + sweep - pad / 2,
    );
    cursor += sweep;
    return { slice, index, path };
  });

  const center =
    active !== null && slices[active]
      ? { value: String(slices[active].count), label: slices[active].label }
      : { value: String(total), label: "customers" };

  return (
    <div className={`${styles.vizRoot} ${styles.donutLayout}`}>
      <svg
        className={styles.donutChart}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Customers by country"
      >
        {arcs.map(({ slice, index, path }) => (
          <path
            key={slice.label}
            d={path}
            fill={sliceColor(slice, index)}
            className={`${styles.donutSlice} ${
              active !== null && active !== index ? styles.donutMuted : ""
            }`}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <title>{`${slice.label}: ${slice.count} (${percent(slice.share)})`}</title>
          </path>
        ))}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className={styles.donutCenterValue}
        >
          {center.value}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className={styles.donutCenterLabel}
        >
          {center.label}
        </text>
      </svg>

      <div className={styles.legendTable}>
        {slices.map((slice, index) => (
          <div
            key={slice.label}
            className={`${styles.legendRow} ${
              active === index ? styles.legendRowActive : ""
            }`}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              className={styles.legendSwatch}
              style={{ background: sliceColor(slice, index) }}
            />
            <Text as="span" variant="bodySm" truncate>
              {slice.label}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued" numeric>
              {slice.count}
            </Text>
            <Text as="span" variant="bodySm" numeric>
              {percent(slice.share)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
