import type { FieldComponentProps } from "./types";

/** Built-in input for each field type */
export function FieldInput({ field, id, register, hasError, aria, classNames, messages }: FieldComponentProps) {
  const className = hasError ? classNames.inputError : classNames.input;

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          {...register}
          {...aria}
          id={id}
          rows={4}
          placeholder={field.placeholder}
          className={className}
        />
      );

    case "select":
      return (
        <select {...register} {...aria} id={id} className={className} defaultValue="">
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
              <input type="radio" value={o.value} {...register} />
              {o.label}
            </label>
          ))}
        </div>
      );

    case "checkbox":
      return (
        <label className={classNames.checkboxLabel}>
          <input type="checkbox" {...register} {...aria} id={id} />
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
          className={className}
        />
      );

    default:
      return (
        <input
          type={field.type}
          {...register}
          {...aria}
          id={id}
          placeholder={field.placeholder}
          className={className}
        />
      );
  }
}
