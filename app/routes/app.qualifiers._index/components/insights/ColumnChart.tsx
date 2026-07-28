import type { MonthPoint } from "app/services/audiences/customerInsights";
import styles from "./styles.module.css";

/**
 * Single-series columns (new customers per month). Rounded data ends
 * anchored to the baseline, direct value labels, recessive baseline only.
 */
export function ColumnChart({ points }: { points: MonthPoint[] }) {
  const width = 420;
  const height = 180;
  const paddingX = 16;
  const labelBand = 22;
  const valueBand = 18;
  const plotBottom = height - labelBand;
  const plotHeight = plotBottom - valueBand;

  const max = Math.max(...points.map((point) => point.count), 1);
  const step = (width - paddingX * 2) / points.length;
  const barWidth = Math.min(36, step * 0.55);

  return (
    <div className={styles.vizRoot}>
      <svg
        className={styles.columnChart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="New customers per month"
      >
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={plotBottom}
          y2={plotBottom}
          className={styles.columnBaseline}
        />
        {points.map((point, index) => {
          const x = paddingX + step * index + (step - barWidth) / 2;
          const barHeight = (point.count / max) * plotHeight;
          const y = plotBottom - barHeight;
          const radius = Math.min(4, barWidth / 2, barHeight);

          return (
            <g key={`${point.label}-${index}`}>
              {point.count > 0 ? (
                // Rounded top corners only — the bar stays anchored to the baseline
                <path
                  d={`M ${x} ${plotBottom}
                      L ${x} ${y + radius}
                      Q ${x} ${y} ${x + radius} ${y}
                      L ${x + barWidth - radius} ${y}
                      Q ${x + barWidth} ${y} ${x + barWidth} ${y + radius}
                      L ${x + barWidth} ${plotBottom} Z`}
                  fill="var(--viz-series)"
                >
                  <title>{`${point.label}: ${point.count}`}</title>
                </path>
              ) : null}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                className={styles.columnValue}
              >
                {point.count}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 6}
                className={styles.columnLabel}
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
