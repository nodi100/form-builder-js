// Core: no React, safe to import on the server (server actions, API routes).
// The React components live in "form-builder-js/react".

export type {
  Condition,
  FieldSchema,
  FieldType,
  FieldValidation,
  FormDefinition,
  FormStep,
  FormValues,
  Option,
  SubmitResult,
} from "./core/types";
export { parseFormSchema } from "./core/parse-form-schema";
export { validateFormValues } from "./core/validate";
export type { ValidateOptions, ValidationResult } from "./core/validate";
export { buildZodSchema } from "./core/build-zod-schema";
export {
  flattenSteps,
  indexByName,
  isFieldVisible,
  isStepVisible,
  toConditions,
} from "./core/form-visibility";
export { defaultMessages, formatMessage, resolveMessages } from "./core/messages";
export type { FormMessages } from "./core/messages";
