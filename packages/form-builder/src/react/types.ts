import type { ComponentType } from "react";
import type { Control, UseFormRegisterReturn } from "react-hook-form";
import type { FieldSchema, FieldType, FormValues, UploadedFile } from "../core/types";
import type { FormMessages } from "../core/messages";
import type { ClassNames } from "./class-names";

export type FieldAriaProps = {
  "aria-invalid"?: boolean;
  /** the field's description and/or error message */
  "aria-describedby"?: string;
  "aria-required"?: boolean;
};

/**
 * Props every input component gets, built-in or your own (see the
 * `components` prop of <FormBuilder>). The label, description, error message
 * and radio <fieldset> are rendered around it; a checkbox renders its own label.
 */
export type FieldComponentProps = {
  /** The field's JSON, including the extra keys of a `custom` field */
  field: FieldSchema;
  /** The react-hook-form name: `field.name`, or "personnel.0.name" inside
   *  an `array` row. Use it (not field.name) with useController / setValue. */
  name: string;
  /** id for the input, so the <label htmlFor> points at it */
  id: string;
  /** spread onto a native input: `<input {...register} />` */
  register: UseFormRegisterReturn;
  /** for controlled inputs: `useController({ control, name })` */
  control: Control<FormValues>;
  hasError: boolean;
  /** spread onto the input: `<input {...aria} />` */
  aria: FieldAriaProps;
  classNames: ClassNames;
  messages: FormMessages;
  /** The whole form is disabled (the `disabled` prop of <FormBuilder>) */
  disabled: boolean;
  /** `field.readOnly`, or inherited from a read-only `array` field:
   *  show the value, don't let it change */
  readOnly: boolean;
};

/** Field types whose input can be replaced (`array` and `info` are rendered
 *  by the form itself; `custom` is keyed by `component`, see below) */
export type ReplaceableFieldType = Exclude<FieldType, "custom" | "array" | "info">;

/**
 * Replace the input for any field type with your own component, and provide
 * the components of `custom` fields, keyed by their `component`:
 * `{ date: MyDatePicker, custom: { verifyPerson: VerifyPerson } }`
 */
export type FieldComponents = Partial<
  Record<ReplaceableFieldType, ComponentType<FieldComponentProps>>
> & {
  custom?: Record<string, ComponentType<FieldComponentProps>>;
};

/**
 * Uploads one file as soon as it's chosen, e.g. to your API or object
 * storage, and resolves with what the field's value should hold. Call
 * `onProgress` with 0..1 to show a progress bar (optional).
 */
export type UploadFile = (
  file: File,
  field: FieldSchema,
  options: { onProgress: (fraction: number) => void }
) => Promise<UploadedFile>;
