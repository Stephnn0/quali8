import { Icon, type IconSource } from "@shopify/polaris";
import styles from "../../app.actions.discounts/smartShipping.module.css";

export type TileOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: IconSource;
};

type Props<T extends string> = {
  name: string;
  options: TileOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Radio cards: one big, clearly selected tile per option. */
export function ChoiceTiles<T extends string>({
  name,
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div role="radiogroup" aria-label={name} className={styles.tiles}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`${styles.tile} ${selected ? styles.tileSelected : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon ? (
              <span className={styles.tileIcon}>
                <Icon source={option.icon} />
              </span>
            ) : null}
            <span>
              <span className={styles.tileLabel}>{option.label}</span>
              {option.description ? (
                <span className={styles.tileText}>{option.description}</span>
              ) : null}
            </span>
            <span className={styles.tileCheck} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
