# @nodari-pruidze/form-builder-js

## 0.3.0

### Minor Changes

- `layout: "sections"`: render every step on one page as a titled `<fieldset>` section with a single Submit button. A step's `showWhen` still hides the whole section. Without `layout` (or with `"wizard"`) forms behave as before. New class slots `section`, `sectionHeader`, `sectionTitle`, `sectionDescription`.
- New field types:
  - `tel`: validated like `text`, no built-in pattern.
  - `date`: `"YYYY-MM-DD"` value, `validation.min` / `max` take a date or `"today"`, checked on both sides. New `timeZone` option on `<FormBuilder>` and `validateFormValues` for `"today"`.
  - `file`: uploaded as soon as it's chosen through the new `uploadFile` prop. Supports `accept`, `maxSizeMb` and `multiple`, and shows pending state, progress, the file name and a remove button. Submit waits for uploads. The server checks only the `{ id, name, size?, type? }` shape and drops other keys.
  - `custom`: renders `components.custom[component]` and keeps any extra JSON keys on the field. The server runs `customValidators[component]` (new option of `validateFormValues`, also a `<FormBuilder>` prop). Without a validator, only `isRequired` is checked.
  - `array`: repeating groups with `fields`, `minItems`, `maxItems`, `addLabel` and `removeLabel`. Row fields' `showWhen` points at fields of the same row. Errors are keyed by path (`"personnel.2.personalNumber"`) on the server and shown under the right row field on the client.
  - `info`: a display-only text block. It is never validated or submitted.
- New field options: `defaultValue` (type-checked), `readOnly`, `description` (linked with `aria-describedby`) and `width: "full" | "half"` for two-column layouts.
- Conditions: `notEquals` and `notEmpty: true` next to `equals`. Each condition takes exactly one operator.
- `<FormBuilder>` props: `defaultValues` to prefill the form, `disabled` to render it read-only without Submit, plus `uploadFile`, `customValidators` and `timeZone`.
- After a failed submit, including server `fieldErrors`, the first invalid field in page order is scrolled to and focused.
- `parseFormSchema` checks every new key per type and reports the path and the reason, e.g. `"accept" is not supported for type "text"`.
- New messages: `invalidDate`, `dateMin`, `dateMax`, `minItems`, `maxItems`, `fileTooLarge`, `fileType`, `uploadFailed`, `uploading`, `add`, `remove`, `arrayItem`.
- New class slots: `fieldGrid`, `fieldFull`, `fieldHalf`, `description`, `file`, `fileInput`, `fileList`, `fileItem`, `fileName`, `fileProgress`, `fileRemove`, `info`, `infoTitle`, `infoText`, `arrayItems`, `arrayItem`, `arrayItemHeader`, `arrayItemTitle`, `arrayAdd`, `arrayRemove`.
- `FieldComponentProps` gains `name` (the full react-hook-form path; use it with `useController` instead of `field.name`), `disabled` and `readOnly`.
- New exports: `buildDefaultValues`, `conditionMatches`, `isEmptyValue`, `isIsoDate`, `todayIso`, `FileInput`, and the types `CustomFieldSchema`, `CustomValidator`, `FormLayout`, `JsonValue`, `SchemaOptions`, `UploadedFile`, `UploadFile`, `ReplaceableFieldType`.

### Notes for upgrading

v0.2 schemas parse and behave as before, with these small differences:

- Fields are now rendered inside a grid wrapper (`fieldGrid`). With the default classes the layout looks the same. If you replaced the `form` slot to space fields, move that spacing to `fieldGrid`.
- Field names containing `.`, `[` or `]` are rejected. They never worked with react-hook-form.
- The default `input` classes add read-only and disabled styles, and `field` adds `min-w-0`.
- In TypeScript, `Condition.equals` is now optional, `FieldValidation.min` / `max` accept strings (for dates), and `FieldComponents` has a `custom` key that holds a record of components.

## 0.2.0

### Minor Changes

- 03ef58b: Add a `stepper` prop to `<FormBuilder>` to replace the stepper of a multi-step form with your own component. Export the built-in `Stepper` and the `StepperProps` and `StepperItem` types.

## 0.1.1

### Patch Changes

- 8353cbb: Add a link to the changelog in the README.
