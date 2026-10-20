// Core: no React, safe to import on the server (server actions, API routes).
// The React components live in "@nodari-pruidze/form-builder-js/react".

export type {
  Condition,
  CustomFieldSchema,
  FieldSchema,
  FieldType,
  FieldValidation,
  FormDefinition,
  FormLayout,
  FormStep,
  FormValues,
  JsonValue,
  Option,
  SubmitResult,
  UploadedFile,
} from "./core/types";
export { parseFormSchema } from "./core/parse-form-schema";
export { validateFormValues } from "./core/validate";
export type { ValidateOptions, ValidationResult } from "./core/validate";
export { buildZodSchema } from "./core/build-zod-schema";
export type { CustomValidator, SchemaOptions } from "./core/build-zod-schema";
export { buildDefaultValues } from "./core/defaults";
export {
  conditionMatches,
  flattenSteps,
  indexByName,
  isFieldVisible,
  isStepVisible,
  toConditions,
} from "./core/form-visibility";
export { isEmptyValue, isIsoDate, todayIso } from "./core/values";
export { defaultMessages, formatMessage, resolveMessages } from "./core/messages";
export type { FormMessages } from "./core/messages";
