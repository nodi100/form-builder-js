import { createContext, useContext } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { FormValues } from "../core/types";
import type { FormMessages } from "../core/messages";
import type { ClassNames } from "./class-names";
import type { FieldComponents, UploadFile } from "./types";

/** What every field of one <FormBuilder> needs; internal, not exported */
export type FormBuilderContextValue = Pick<
  UseFormReturn<FormValues>,
  "register" | "control" | "trigger" | "clearErrors" | "setValue" | "getValues"
> & {
  errors: UseFormReturn<FormValues>["formState"]["errors"];
  classNames: ClassNames;
  messages: FormMessages;
  components?: FieldComponents;
  disabled: boolean;
  uploadFile?: UploadFile;
  /** +1 when an upload starts, -1 when it ends; Submit waits for all of them */
  trackUpload: (delta: 1 | -1) => void;
  timeZone?: string;
};

export const FormBuilderContext = createContext<FormBuilderContextValue | null>(null);

export function useFormBuilder(): FormBuilderContextValue {
  const value = useContext(FormBuilderContext);
  if (!value) throw new Error("Form fields must be rendered inside <FormBuilder>");
  return value;
}

// module-scoped, so it doesn't clash with @types/node; bundlers replace
// `process.env.NODE_ENV` with a literal
declare const process: { env: { NODE_ENV?: string } } | undefined;

/** Warnings for the developer, never shown in production builds */
export function devWarn(message: string) {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
  console.warn(`[form-builder] ${message}`);
}
