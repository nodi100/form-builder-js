import { resolveDateBound } from "../core/values";
import { useFormBuilder } from "./context";
import { FileInput } from "./FileInput";
import type { FieldComponentProps } from "./types";

/** Built-in input for each field type */
export function FieldInput(props: FieldComponentProps) {
  const { field, id, register, hasError, aria, classNames, messages, disabled, readOnly } = props;
  const className = hasError ? classNames.inputError : classNames.input;
  // selects, radios and checkboxes have no native read-only state
  const locked = disabled || readOnly;

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          {...register}
          {...aria}
          id={id}
          rows={4}
          placeholder={field.placeholder}
          readOnly={readOnly}
          disabled={disabled}
          className={className}
        />
      );

    case "select":
      return (
        <select {...register} {...aria} id={id} disabled={locked} className={className} defaultValue="">
          <option value="" disabled>
            {field.placeholder ?? messages.selectPlaceholder}
          </option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );

    case "radio":
      // the wrapping <fieldset> in FormField carries the group label + aria
      return (
        <div className={classNames.radioGroup}>
          {field.options?.map((o) => (
            <label key={o.value} className={classNames.radioLabel}>
              <input type="radio" value={o.value} {...register} disabled={locked} />
              {o.label}
            </label>
          ))}
        </div>
      );

    case "checkbox":
      return (
        <label className={classNames.checkboxLabel}>
          <input type="checkbox" {...register} {...aria} id={id} disabled={locked} />
          {field.label}
          {field.isRequired && <span className={classNames.required}>*</span>}
        </label>
      );

    case "number":
      return (
        <input
          type="number"
          {...register}
          {...aria}
          id={id}
          step={field.validation?.integer ? 1 : "any"}
          placeholder={field.placeholder}
          readOnly={readOnly}
          disabled={disabled}
          className={className}
        />
      );

    case "date":
      return <DateInput {...props} />;

    case "file":
      return <FileInput {...props} />;

    default:
      // text, email, tel
      return (
        <input
          type={field.type}
          {...register}
          {...aria}
          id={id}
          placeholder={field.placeholder}
          readOnly={readOnly}
          disabled={disabled}
          className={className}
        />
      );
  }
}

function DateInput({ field, id, register, hasError, aria, classNames, disabled, readOnly }: FieldComponentProps) {
  const { timeZone } = useFormBuilder();
  return (
    <input
      type="date"
      {...register}
      {...aria}
      id={id}
      min={resolveDateBound(field.validation?.min, timeZone)}
      max={resolveDateBound(field.validation?.max, timeZone)}
      readOnly={readOnly}
      disabled={disabled}
      className={hasError ? classNames.inputError : classNames.input}
    />
  );
}
