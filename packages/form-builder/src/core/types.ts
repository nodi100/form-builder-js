export type FieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox";

export type Option = {
  label: string;
  value: string;
};

export type Condition = {
  /** Name of the field this one depends on */
  field: string;
  /** Value(s) of that field that make this field visible */
  equals: string | boolean | string[];
};

export type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  /** For number fields */
  min?: number;
  /** For number fields */
  max?: number;
  /** For number fields: reject decimals */
  integer?: boolean;
  /** Regex as a string (remember double backslashes in JSON) */
  pattern?: string;
  /** Custom message for pattern / range errors */
  message?: string;
};

export type FieldSchema = {
  name: string;
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
};

export type FormStep = {
  id: string;
  /** Required when the form has more than one step */
  title?: string;
  description?: string;
  /** Skip the whole step unless this matches. May only depend on fields
   *  from earlier steps. */
  showWhen?: Condition | Condition[];
  fields: FieldSchema[];
};

/** A parsed form. A plain field array in JSON becomes a single step. */
export type FormDefinition = {
  steps: FormStep[];
};

export type FormValues = Record<string, unknown>;

/** What the onSubmit (usually a server action) can return */
export type SubmitResult =
  | { success: true; message?: string }
  | { success: false; fieldErrors?: Record<string, string>; message?: string };
