export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "textarea"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "custom"
  | "array"
  | "info";

/** Any value that survives JSON.stringify / JSON.parse unchanged */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Option = {
  label: string;
  value: string;
};

/**
 * Compares another field's current value. Exactly one of `equals`,
 * `notEquals` or `notEmpty` is set (parseFormSchema checks this).
 */
export type Condition = {
  /** Name of the field this one depends on (inside an `array` row: a
   *  sibling field of the same row) */
  field: string;
  /** Matches when the value is this one (or one of these) */
  equals?: string | boolean | string[];
  /** Matches when the value is NOT this one (and none of these) */
  notEquals?: string | boolean | string[];
  /** Matches when the field has a value (see isEmptyValue) */
  notEmpty?: true;
};

export type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  /** number fields: a number. date fields: "YYYY-MM-DD" or "today". */
  min?: number | string;
  /** number fields: a number. date fields: "YYYY-MM-DD" or "today". */
  max?: number | string;
  /** For number fields: reject decimals */
  integer?: boolean;
  /** Regex as a string (remember double backslashes in JSON) */
  pattern?: string;
  /** Custom message for pattern / range errors */
  message?: string;
};

export type FieldSchema = {
  name: string;
  /** Required for every type except `info` (parseFormSchema fills in "") */
  label: string;
  type: FieldType;
  isRequired?: boolean;
  /** For select / radio */
  options?: Option[];
  /** Dependency: field renders only when the condition matches
   *  (with an array, all conditions must match) */
  showWhen?: Condition | Condition[];
  validation?: FieldValidation;
  placeholder?: string;
  /** Help text under the label */
  description?: string;
  /** "half" puts two fields side by side on wider screens. Default "full". */
  width?: "full" | "half";
  /** Shown and submitted, but can't be edited */
  readOnly?: boolean;
  /** Initial value, of the field's type */
  defaultValue?: JsonValue;

  /** file: the input's `accept`, e.g. ".pdf,image/*" */
  accept?: string;
  /** file: largest allowed file, in megabytes (checked before uploading) */
  maxSizeMb?: number;
  /** file: allow several files; the value is then an array */
  multiple?: boolean;

  /** custom: key into `components.custom` and `customValidators` */
  component?: string;

  /** array: the fields of one row */
  fields?: FieldSchema[];
  /** array: fewest rows (default 0, or 1 when isRequired) */
  minItems?: number;
  /** array: most rows */
  maxItems?: number;
  /** array: text of the "add row" button (default `messages.add`) */
  addLabel?: string;
  /** array: text of the "remove row" button (default `messages.remove`) */
  removeLabel?: string;

  /** info: the text to show */
  text?: string;
};

/**
 * A `custom` field: any extra JSON keys are kept and handed to the component
 * and the validator, e.g. `(field as CustomFieldSchema).endpoint`.
 */
export type CustomFieldSchema = FieldSchema & {
  type: "custom";
  component: string;
  [extra: string]: unknown;
};

/** Value of a `file` field (an array of these when `multiple`) */
export type UploadedFile = {
  /** Your upload store's id. Look it up again on the server. */
  id: string;
  name: string;
  /** Reported by the client: never trust it on the server */
  size?: number;
  /** Reported by the client: never trust it on the server */
  type?: string;
};

export type FormStep = {
  id: string;
  /** Required when a wizard has more than one step */
  title?: string;
  description?: string;
  /** Skip the whole step unless this matches. May only depend on fields
   *  from earlier steps. */
  showWhen?: Condition | Condition[];
  fields: FieldSchema[];
};

/**
 * "wizard" (default): one step per page, with a stepper and Back/Next.
 * "sections": every step on one page as a titled section, one Submit button.
 */
export type FormLayout = "wizard" | "sections";

/** A parsed form. A plain field array in JSON becomes a single step. */
export type FormDefinition = {
  layout?: FormLayout;
  steps: FormStep[];
};

export type FormValues = Record<string, unknown>;

/** What the onSubmit (usually a server action) can return */
export type SubmitResult =
  | { success: true; message?: string }
  | {
      success: false;
      /** Keyed by field name, or by path inside an array:
       *  "personnel.2.personalNumber". "_form" is a form-level error. */
      fieldErrors?: Record<string, string>;
      message?: string;
    };
