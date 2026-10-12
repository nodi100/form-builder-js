const control =
  "w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500";
const pill = "rounded-full border px-3 py-1 transition";
const button = "rounded-md px-5 py-2 text-sm font-medium transition disabled:opacity-50";

/**
 * Tailwind classes for every part of the form. A slot you pass in
 * `classNames` REPLACES the default (Tailwind can't reliably let an appended
 * class win), so to tweak one, build on the default:
 * `{ input: defaultClassNames.input + " h-12" }`.
 */
export const defaultClassNames = {
  form: "space-y-5",
  field: "flex flex-col gap-1.5",
  label: "text-sm font-medium text-gray-800",
  legend: "mb-1.5 text-sm font-medium text-gray-800",
  required: "text-red-500",
  input: `${control} border-gray-300`,
  /** used instead of `input` when the field has an error */
  inputError: `${control} border-red-500`,
  checkboxLabel: "flex cursor-pointer items-center gap-2 text-sm",
  radioGroup: "flex flex-wrap gap-4",
  radioLabel: "flex cursor-pointer items-center gap-2 text-sm",
  error: "text-xs text-red-500",

  stepper: "flex flex-wrap gap-2 text-xs",
  /** a step that was already reached and can be clicked */
  stepperItem: `${pill} border-gray-300 text-gray-800 hover:bg-gray-100`,
  stepperItemCurrent: `${pill} border-gray-900 bg-gray-900 text-white`,
  stepperItemUpcoming: `${pill} border-gray-200 text-gray-400`,
  stepHeader: "space-y-1",
  stepCounter: "text-xs text-gray-500",
  stepTitle: "text-lg font-semibold outline-none",
  stepDescription: "text-sm text-gray-600",

  statusSuccess: "text-sm text-green-600",
  statusError: "text-sm text-red-500",
  actions: "flex gap-3",
  button: `${button} bg-gray-900 text-white hover:bg-gray-700`,
  buttonSecondary: `${button} border border-gray-300 text-gray-800 hover:bg-gray-100`,
};

export type ClassNames = typeof defaultClassNames;
export type FormClassNames = Partial<ClassNames>;
