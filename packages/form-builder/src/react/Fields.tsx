import { useMemo } from "react";
import { get, useFieldArray, useWatch } from "react-hook-form";
import type { FieldSchema, FormValues } from "../core/types";
import { buildDefaultValues } from "../core/defaults";
import { indexByName, isFieldVisible } from "../core/form-visibility";
import { formatMessage } from "../core/messages";
import { cx } from "./class-names";
import { useFormBuilder } from "./context";
import { FormField } from "./FormField";

type FieldListProps = {
  fields: FieldSchema[];
  /** values the fields' conditions read: the form's, or one array row's */
  values: FormValues;
  byName: Record<string, FieldSchema>;
  /** "" at the top level, "personnel.0" inside an array row */
  prefix?: string;
  readOnly?: boolean;
};

/** The visible fields of a step, a section or an array row, in a grid */
export function FieldList({ fields, values, byName, prefix = "", readOnly = false }: FieldListProps) {
  const { classNames } = useFormBuilder();
  return (
    <div className={classNames.fieldGrid}>
      {fields
        .filter((field) => isFieldVisible(field, values, byName))
        .map((field) => {
          const path = prefix ? `${prefix}.${field.name}` : field.name;
          if (field.type === "info") return <InfoBlock key={field.name} field={field} />;
          if (field.type === "array")
            return <ArrayField key={field.name} field={field} path={path} readOnly={readOnly} />;
          return <FormField key={field.name} field={field} path={path} readOnly={readOnly} />;
        })}
    </div>
  );
}

function widthClass(field: FieldSchema, classNames: ReturnType<typeof useFormBuilder>["classNames"]) {
  return field.width === "half" ? classNames.fieldHalf : classNames.fieldFull;
}

/** A display-only `info` field */
function InfoBlock({ field }: { field: FieldSchema }) {
  const { classNames } = useFormBuilder();
  return (
    <div className={cx(classNames.info, widthClass(field, classNames))}>
      {field.label && <p className={classNames.infoTitle}>{field.label}</p>}
      <p className={classNames.infoText}>{field.text}</p>
    </div>
  );
}

/** A repeating group: one row of `field.fields` per item, with add / remove */
function ArrayField({ field, path, readOnly }: { field: FieldSchema; path: string; readOnly: boolean }) {
  const { control, errors, clearErrors, classNames, messages, disabled, timeZone } = useFormBuilder();
  // FormValues has no array keys at the type level, hence the cast
  const { fields: rows, append, remove } = useFieldArray({ control, name: path as never });
  // row values drive the conditions between fields of the same row
  const rowValues = useWatch({ control, name: path }) as FormValues[] | undefined;
  const rowFields = useMemo(() => field.fields ?? [], [field.fields]);
  const byName = useMemo(() => indexByName(rowFields), [rowFields]);

  const arrayError = get(errors, path);
  // zodResolver puts the error of a field array itself under `root`
  const error = (arrayError?.root?.message ?? arrayError?.message) as string | undefined;
  const id = path;
  const descriptionId = field.description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const locked = readOnly || !!field.readOnly;
  const editable = !disabled && !locked;
  const min = Math.max(field.minItems ?? 0, field.isRequired ? 1 : 0);
  const canAdd = field.maxItems === undefined || rows.length < field.maxItems;
  // react-hook-form moves row errors along when rows are removed; only a
  // "minItems / maxItems" message is cleared here (Submit checks it again).
  // Re-validating instead would flag the new, empty row right away.
  const clearCountError = () => {
    if (arrayError?.root) clearErrors(`${path}.root`);
    else if (arrayError?.message) clearErrors(path);
  };

  return (
    <fieldset
      aria-describedby={cx(descriptionId, errorId) || undefined}
      aria-invalid={!!error || undefined}
      className={cx(classNames.field, widthClass(field, classNames))}
    >
      <legend className={classNames.legend}>
        {field.label}
        {(field.isRequired || min > 0) && <span className={classNames.required}> *</span>}
      </legend>
      {field.description && (
        <p id={descriptionId} className={classNames.description}>
          {field.description}
        </p>
      )}

      {rows.length > 0 && (
        <div className={classNames.arrayItems}>
          {rows.map((row, i) => {
            const title = formatMessage(messages.arrayItem, { label: field.label, number: i + 1 });
            const titleId = `${id}-${i}-title`;
            return (
              <div key={row.id} role="group" aria-labelledby={titleId} className={classNames.arrayItem}>
                <div className={classNames.arrayItemHeader}>
                  <p id={titleId} className={classNames.arrayItemTitle}>
                    {title}
                  </p>
                  {editable && (
                    <button
                      type="button"
                      disabled={rows.length <= min}
                      onClick={() => {
                        remove(i);
                        clearCountError();
                      }}
                      aria-label={`${field.removeLabel ?? messages.remove}: ${title}`}
                      className={classNames.arrayRemove}
                    >
                      {field.removeLabel ?? messages.remove}
                    </button>
                  )}
                </div>
                <FieldList
                  fields={rowFields}
                  values={rowValues?.[i] ?? {}}
                  byName={byName}
                  prefix={`${path}.${i}`}
                  readOnly={locked}
                />
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p id={errorId} className={classNames.error}>
          {error}
        </p>
      )}

      {editable && canAdd && (
        <button
          type="button"
          onClick={() => {
            append(buildDefaultValues(rowFields, {}, timeZone));
            clearCountError();
          }}
          className={classNames.arrayAdd}
        >
          {field.addLabel ?? messages.add}
        </button>
      )}
    </fieldset>
  );
}
