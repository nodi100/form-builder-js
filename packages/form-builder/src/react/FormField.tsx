import type { Control, UseFormRegisterReturn } from "react-hook-form";
import type { FieldSchema, FormValues } from "../core/types";
import type { FormMessages } from "../core/messages";
import type { ClassNames } from "./class-names";
import type { FieldAriaProps, FieldComponents } from "./types";
import { FieldInput } from "./FieldInput";

type Props = {
  field: FieldSchema;
  register: UseFormRegisterReturn;
  control: Control<FormValues>;
  error?: string;
  classNames: ClassNames;
  messages: FormMessages;
  components?: FieldComponents;
};

/** One field: label (or legend for radios), input and error message */
export function FormField({ field, register, control, error, classNames, messages, components }: Props) {
  const errorId = error ? `${field.name}-error` : undefined;
  // links the input to its error for screen readers
  const aria: FieldAriaProps = {
    "aria-invalid": !!error || undefined,
    "aria-describedby": errorId,
    "aria-required": field.isRequired || undefined,
  };

  const Input = components?.[field.type] ?? FieldInput;
  const labelText = (
    <>
      {field.label}
      {field.isRequired && <span className={classNames.required}> *</span>}
    </>
  );
  const input = (
    <Input
      field={field}
      id={field.name}
      register={register}
      control={control}
      hasError={!!error}
      // a radio group's aria lives on the <fieldset>
      aria={field.type === "radio" ? {} : aria}
      classNames={classNames}
      messages={messages}
    />
  );
  const errorText = error && (
    <p id={errorId} className={classNames.error}>
      {error}
    </p>
  );

  if (field.type === "radio") {
    return (
      <fieldset role="radiogroup" {...aria} className={classNames.field}>
        <legend className={classNames.legend}>{labelText}</legend>
        {input}
        {errorText}
      </fieldset>
    );
  }

  return (
    <div className={classNames.field}>
      {field.type !== "checkbox" && (
        <label htmlFor={field.name} className={classNames.label}>
          {labelText}
        </label>
      )}
      {input}
      {errorText}
    </div>
  );
}
