import type {
  Condition,
  FieldSchema,
  FormDefinition,
  FormStep,
  FormValues,
} from "./types";
import { isEmptyValue } from "./values";

export function indexByName(fields: FieldSchema[]): Record<string, FieldSchema> {
  return Object.fromEntries(fields.map((f) => [f.name, f]));
}

/** All fields of all steps, in order (an `array` field's own `fields` stay inside it) */
export function flattenSteps(form: FormDefinition): FieldSchema[] {
  return form.steps.flatMap((step) => step.fields);
}

/** `showWhen` may be one condition or a list (all must match) */
export function toConditions(showWhen: Condition | Condition[] | undefined): Condition[] {
  if (!showWhen) return [];
  return Array.isArray(showWhen) ? showWhen : [showWhen];
}

function isOneOf(expected: string | boolean | string[], current: unknown) {
  return Array.isArray(expected) ? expected.includes(current as string) : current === expected;
}

/** Does one condition match the value of the field it points at? */
export function conditionMatches(condition: Condition, current: unknown): boolean {
  if (condition.notEmpty) return !isEmptyValue(current);
  if (condition.notEquals !== undefined) return !isOneOf(condition.notEquals, current);
  return condition.equals !== undefined && isOneOf(condition.equals, current);
}

/**
 * A field is visible when it has no `showWhen`, or when every condition
 * matches AND each condition's parent field is visible. The parent check
 * makes chains work: if A hides B, then C (which depends on B) is hidden too,
 * whatever the condition (even `notEquals`).
 *
 * Inside an `array` row, pass the row's values and the row's fields.
 */
export function isFieldVisible(
  field: FieldSchema,
  values: FormValues,
  byName: Record<string, FieldSchema>,
  seen: Set<string> = new Set()
): boolean {
  const conditions = toConditions(field.showWhen);
  if (!conditions.length) return true;

  // guard against circular dependencies in bad JSON; the set is copied per
  // branch so two conditions sharing a parent aren't mistaken for a cycle
  if (seen.has(field.name)) return false;
  const path = new Set(seen).add(field.name);

  return conditions.every((condition) => {
    const parent = byName[condition.field];
    if (parent && !isFieldVisible(parent, values, byName, path)) return false;
    return conditionMatches(condition, values[condition.field]);
  });
}

/** A step is shown when any of its fields is. parseFormSchema copies the
 *  step's own `showWhen` into every field, so this covers step conditions. */
export function isStepVisible(
  step: FormStep,
  values: FormValues,
  byName: Record<string, FieldSchema>
): boolean {
  return step.fields.some((field) => isFieldVisible(field, values, byName));
}
