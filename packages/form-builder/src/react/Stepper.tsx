import type { ClassNames } from "./class-names";

export type StepperItem = {
  /** Position in `form.steps`; pass it to `onSelect` */
  index: number;
  /** 1-based number among the visible steps */
  number: number;
  id: string;
  title?: string;
  /** "complete" = before the current step, "upcoming" = after it */
  status: "complete" | "current" | "upcoming";
  /** Already reached and not current, so it can be clicked */
  reachable: boolean;
};

/**
 * Props every stepper gets, built-in or your own (see the `stepper` prop of
 * <FormBuilder>). Only visible steps are listed.
 */
export type StepperProps = {
  items: StepperItem[];
  /** Go to a step. Jumping forward still validates the current step. */
  onSelect: (index: number) => void;
  /** Accessible name for the <nav> (`messages.progressLabel`) */
  label: string;
  classNames: ClassNames;
};

/** Built-in stepper */
export function Stepper({ items, onSelect, label, classNames }: StepperProps) {
  return (
    <nav aria-label={label}>
      <ol className={classNames.stepper}>
        {items.map((item) => (
          <li key={item.index}>
            <button
              type="button"
              disabled={!item.reachable}
              aria-current={item.status === "current" ? "step" : undefined}
              onClick={() => onSelect(item.index)}
              className={
                item.status === "current"
                  ? classNames.stepperItemCurrent
                  : item.reachable
                    ? classNames.stepperItem
                    : classNames.stepperItemUpcoming
              }
            >
              {item.number}. {item.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
