const control =
  "w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 [&:is(input,textarea):read-only]:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";
const pill = "rounded-full border px-3 py-1 transition";
const button = "rounded-md px-5 py-2 text-sm font-medium transition disabled:opacity-50";
const smallButton =
  "rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-800 transition hover:bg-gray-100 disabled:opacity-50";

/**
 * Tailwind classes for every part of the form. A slot you pass in
 * `classNames` REPLACES the default (Tailwind can't reliably let an appended
 * class win), so to tweak one, build on the default:
 * `{ input: defaultClassNames.input + " h-12" }`.
 */
export const defaultClassNames = {
  form: "space-y-5",
  /** the grid that holds the fields of a step, a section or an array row */
  fieldGrid: "grid grid-cols-1 gap-5 sm:grid-cols-2",
  field: "flex min-w-0 flex-col gap-1.5",
  /** added to `field` for `width: "full"` (the default) */
  fieldFull: "sm:col-span-2",
  /** added to `field` for `width: "half"` */
  fieldHalf: "sm:col-span-1",
  label: "text-sm font-medium text-gray-800",
  legend: "mb-1.5 text-sm font-medium text-gray-800",
  required: "text-red-500",
  /** help text from the field's `description` */
  description: "text-xs text-gray-500",
  input: `${control} border-gray-300`,
  /** used instead of `input` when the field has an error */
  inputError: `${control} border-red-500`,
  checkboxLabel: "flex cursor-pointer items-center gap-2 text-sm",
  radioGroup: "flex flex-wrap gap-4",
  radioLabel: "flex cursor-pointer items-center gap-2 text-sm",
  error: "text-xs text-red-500",

  /** wrapper of a file field: input + list of files */
  file: "flex flex-col gap-2",
  fileInput:
    "text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-100 disabled:opacity-50",
  fileList: "flex flex-col gap-1",
  fileItem: "flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm",
  fileName: "min-w-0 truncate",
  fileProgress: "h-1.5 w-24 shrink-0",
  fileRemove: smallButton,

  /** an `info` field */
  info: "rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-gray-800",
  infoTitle: "mb-1 font-medium",
  infoText: "whitespace-pre-line",

  /** the list of rows of an `array` field */
  arrayItems: "flex flex-col gap-4",
  arrayItem: "space-y-4 rounded-md border border-gray-200 p-4",
  arrayItemHeader: "flex items-center justify-between gap-3",
  arrayItemTitle: "text-sm font-medium text-gray-600",
  arrayAdd: `${smallButton} self-start`,
  arrayRemove: smallButton,

  stepper: "flex flex-wrap gap-2 text-xs",
  /** a step that was already reached and can be clicked */
  stepperItem: `${pill} border-gray-300 text-gray-800 hover:bg-gray-100`,
  stepperItemCurrent: `${pill} border-gray-900 bg-gray-900 text-white`,
  stepperItemUpcoming: `${pill} border-gray-200 text-gray-400`,
  stepHeader: "space-y-1",
  stepCounter: "text-xs text-gray-500",
  stepTitle: "text-lg font-semibold outline-none",
  stepDescription: "text-sm text-gray-600",

  /** a step's <fieldset> in `layout: "sections"` */
  section: "min-w-0 space-y-4 border-b border-gray-200 pb-6",
  sectionHeader: "space-y-1",
  sectionTitle: "text-lg font-semibold",
  sectionDescription: "text-sm text-gray-600",

  statusSuccess: "text-sm text-green-600",
  statusError: "text-sm text-red-500",
  actions: "flex gap-3",
  button: `${button} bg-gray-900 text-white hover:bg-gray-700`,
  buttonSecondary: `${button} border border-gray-300 text-gray-800 hover:bg-gray-100`,
};

export type ClassNames = typeof defaultClassNames;
export type FormClassNames = Partial<ClassNames>;

/** Joins class strings, skipping empty ones */
export function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
