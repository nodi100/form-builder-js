import type { ComponentType } from "react";
import type { Control, UseFormRegisterReturn } from "react-hook-form";
import type { FieldSchema, FieldType, FormValues } from "../core/types";
import type { FormMessages } from "../core/messages";
import type { ClassNames } from "./class-names";

export type FieldAriaProps = {
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
};

/**
 * Props every input component gets, built-in or your own (see the
 * `components` prop of <FormBuilder>). The label, error message and radio
 * <fieldset> are rendered around it; a checkbox renders its own label.
 */
export type FieldComponentProps = {
  field: FieldSchema;
  /** id for the input, so the <label htmlFor> points at it */
  id: string;
  /** spread onto a native input: `<input {...register} />` */
  register: UseFormRegisterReturn;
  /** for controlled inputs: `useController({ control, name: field.name })` */
  control: Control<FormValues>;
  hasError: boolean;
  /** spread onto the input: `<input {...aria} />` */
  aria: FieldAriaProps;
  classNames: ClassNames;
  messages: FormMessages;
};

/** Replace the input for any field type with your own component */
export type FieldComponents = Partial<Record<FieldType, ComponentType<FieldComponentProps>>>;
