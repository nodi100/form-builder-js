import type { ClassNames } from "./class-names";

type Props = {
  /** Visible steps only; `index` is the step's position in the full list */
  items: { index: number; title?: string }[];
  current: number;
  /** Furthest step index reached; steps after it can't be clicked yet */
  furthest: number;
  onSelect: (index: number) => void;
  label: string;
  classNames: ClassNames;
};

export function Stepper({ items, current, furthest, onSelect, label, classNames }: Props) {
  return (
    <nav aria-label={label}>
      <ol className={classNames.stepper}>
        {items.map((item, n) => {
          const isCurrent = item.index === current;
          const reachable = !isCurrent && item.index <= furthest;

          return (
            <li key={item.index}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onSelect(item.index)}
                className={
                  isCurrent
                    ? classNames.stepperItemCurrent
                    : reachable
                      ? classNames.stepperItem
                      : classNames.stepperItemUpcoming
                }
              >
                {n + 1}. {item.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
