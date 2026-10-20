import { useEffect } from "react";
import { get } from "react-hook-form";
import type { FieldSchema } from "../core/types";
import { cx } from "./class-names";
import { devWarn, useFormBuilder } from "./context";
import type { FieldAriaProps } from "./types";
import { FieldInput } from "./FieldInput";

type Props = {
  field: FieldSchema;
  /** react-hook-form name: field.name, or "personnel.0.name" in an array row */
  path: string;
  /** inherited from a read-only array */
  readOnly?: boolean;
};

/** One field: label (or legend for radios), description, input and error message */
export function FormField({ field, path, readOnly = false }: Props) {
  const { register, control, errors, trigger, classNames, messages, components, disabled } =
    useFormBuilder();
  const error = get(errors, path)?.message as string | undefined;
  const id = path;
  const descriptionId = field.description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  // links the input to its description and error for screen readers
  const aria: FieldAriaProps = {
    "aria-invalid": !!error || undefined,
    "aria-describedby": cx(descriptionId, errorId) || undefined,
    "aria-required": field.isRequired || undefined,
  };

  const Input =
    field.type === "custom"
      ? components?.custom?.[field.component ?? ""]
      : (components?.[field.type as keyof typeof components] as typeof FieldInput | undefined) ??
        FieldInput;

  useEffect(() => {
    if (!Input) {
      devWarn(
        `No component for custom field "${field.name}": pass components={{ custom: { ${field.component}: YourComponent } }} to <FormBuilder>.`
      );
    }
  }, [Input, field.name, field.component]);

  const labelText = (
    <>
      {field.label}
      {field.isRequired && <span className={classNames.required}> *</span>}
    </>
  );
  const description = field.description && (
    <p id={descriptionId} className={classNames.description}>
      {field.description}
    </p>
  );
  const input = Input && (
    <Input
      field={field}
      name={path}
      id={id}
      register={register(path, {
        // once "Next" or Submit has shown an error, clear it as soon as it's fixed
        onChange: () => {
          if (get(errors, path)) void trigger(path);
        },
      })}
      control={control}
      hasError={!!error}
      // a radio group's aria lives on the <fieldset>
      aria={field.type === "radio" ? {} : aria}
      classNames={classNames}
      messages={messages}
      disabled={disabled}
      readOnly={readOnly || !!field.readOnly}
    />
  );
  const errorText = error && (
    <p id={errorId} className={classNames.error}>
      {error}
    </p>
  );
  const className = cx(
    classNames.field,
    field.width === "half" ? classNames.fieldHalf : classNames.fieldFull
  );

  if (field.type === "radio") {
    return (
      <fieldset role="radiogroup" {...aria} className={className}>
        <legend className={classNames.legend}>{labelText}</legend>
        {description}
        {input}
        {errorText}
      </fieldset>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className={className}>
        {input}
        {description}
        {errorText}
      </div>
    );
  }

  return (
    <div className={className}>
      <label htmlFor={id} className={classNames.label}>
        {labelText}
      </label>
      {description}
      {input}
      {errorText}
    </div>
  );
}
