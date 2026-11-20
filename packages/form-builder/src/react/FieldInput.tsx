import type { ReactElement } from "react";
import { get, useController } from "react-hook-form";
import type { Option } from "../core/types";
import { resolveDateBound } from "../core/values";
import { cx } from "./class-names";
import { useFormBuilder } from "./context";
import { FileInput } from "./FileInput";
import type { FieldComponentProps } from "./types";

/** Built-in input for each field type */
export function FieldInput(props: FieldComponentProps) {
  const { field, id, register, hasError, classNames, messages, disabled, readOnly } = props;
  const className = hasError ? classNames.inputError : classNames.input;
  // selects, radios and checkboxes have no native read-only state
  const locked = disabled || readOnly;
  // the suffix ("kg") is read out after the input's own description
  const suffixId = field.suffix ? `${id}-suffix` : undefined;
  const aria = suffixId
    ? { ...props.aria, "aria-describedby": cx(props.aria["aria-describedby"], suffixId) }
    : props.aria;
  const withSuffix = (input: ReactElement) =>
    field.suffix ? (
      <div className={classNames.inputGroup}>
        {input}
        <span id={suffixId} className={classNames.inputSuffix}>
          {field.suffix}
        </span>
      </div>
    ) : (
      input
    );

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

    case "checkboxes":
      return <CheckboxesInput {...props} />;

    case "number":
      return withSuffix(
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
      return withSuffix(
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

/**
 * A group of checkboxes holding a list of option values. Ticking an
 * `exclusive` option clears the others; ticking any other option clears the
 * exclusive ones. The wrapping <fieldset> in FormField carries the label.
 */
function CheckboxesInput({ field, name, control, classNames, disabled, readOnly }: FieldComponentProps) {
  const { errors, trigger } = useFormBuilder();
  const { field: controller } = useController({ control, name });
  const selected: string[] = Array.isArray(controller.value) ? (controller.value as string[]) : [];
  const options = field.options ?? [];
  const exclusive = options.filter((o) => o.exclusive).map((o) => o.value);
  const locked = disabled || readOnly;

  const toggle = (option: Option, checked: boolean) => {
    const next = !checked
      ? selected.filter((v) => v !== option.value)
      : option.exclusive
        ? [option.value]
        : [...selected.filter((v) => !exclusive.includes(v)), option.value];
    controller.onChange(next);
    // once an error is shown, clear it as soon as the pick is fixed
    if (get(errors, name)) void trigger(name);
  };

  return (
    <div className={classNames.checkboxGroup}>
      {options.map((option, i) => (
        <label key={option.value} className={classNames.checkboxLabel}>
          <input
            type="checkbox"
            name={name}
            value={option.value}
            checked={selected.includes(option.value)}
            onChange={(e) => toggle(option, e.target.checked)}
            onBlur={controller.onBlur}
            // the first box takes the focus when the field has an error
            ref={i === 0 ? controller.ref : undefined}
            disabled={locked}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
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
