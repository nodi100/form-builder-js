# @nodari-pruidze/form-builder-js

Build React forms from JSON. Includes Zod validation, conditional fields, multi-step wizards or one-page sectioned forms, file uploads, repeating groups, and server-side re-validation that uses the same schema.

- **One JSON schema** drives the UI, the client validation and the server validation.
- **Conditional fields and steps** (`showWhen` with `equals`, `notEquals`, `notEmpty`). Hidden fields are never validated and are dropped from the submitted data.
- **Multi-step wizards** (each step validated on "Next", `?step=` in the URL) **or one-page forms split into sections** (`layout: "sections"`).
- **Field types:** text, email, tel, number, textarea, date, select, radio, checkbox, file (uploaded as soon as it's chosen), repeating groups (`array`), display-only `info` blocks, and your own `custom` components.
- **Prefill and review:** `defaultValue` per field, `defaultValues` for the whole form, `readOnly` fields, and a `disabled` form for reviewers.
- **Accessible** labels, fieldsets, `aria-invalid`/`aria-describedby` and live status messages. After a failed submit the first invalid field is focused.
- **Customizable:** override any text (i18n), any CSS class, or any input component.
- **Plain JSON everywhere:** the parsed form and the messages can be passed from a server component to the client.

> **Requires Tailwind CSS v4.** The default styles are Tailwind classes, so the package lists `tailwindcss@^4` as a peer dependency. Without Tailwind the form renders unstyled. You can still restyle it completely with `classNames`, but Tailwind must be set up in the project.

## Requirements

| Peer dependency | Version |
|---|---|
| react | 18.2+ or 19 |
| react-hook-form | ^7.55 |
| zod | ^4 |
| @hookform/resolvers | ^5.1 |
| tailwindcss | ^4 |

It works in any React app. The examples below use the Next.js App Router.

## Install

```bash
npm i @nodari-pruidze/form-builder-js react-hook-form zod @hookform/resolvers
# or
pnpm add @nodari-pruidze/form-builder-js react-hook-form zod @hookform/resolvers
# or
yarn add @nodari-pruidze/form-builder-js react-hook-form zod @hookform/resolvers
```

Tailwind only generates classes it finds in your source. Point it at the package in your main CSS file. Adjust the relative path to where your CSS file lives. The same path works with pnpm's symlinked `node_modules`.

```css
/* app/globals.css */
@import "tailwindcss";
@source "../node_modules/@nodari-pruidze/form-builder-js/dist";
```

## Quick start (Next.js)

**1. Describe the form** in JSON (a file, your DB, an API):

```json
{
  "steps": [
    {
      "id": "about",
      "title": "About you",
      "fields": [
        { "name": "fullName", "label": "Full name", "type": "text", "isRequired": true },
        { "name": "email", "label": "Email", "type": "email", "isRequired": true }
      ]
    },
    {
      "id": "work",
      "title": "Work",
      "fields": [
        {
          "name": "status",
          "label": "Status",
          "type": "radio",
          "isRequired": true,
          "options": [
            { "label": "Employed", "value": "employed" },
            { "label": "Student", "value": "student" }
          ]
        },
        {
          "name": "company",
          "label": "Company",
          "type": "text",
          "isRequired": true,
          "showWhen": { "field": "status", "equals": "employed" }
        }
      ]
    }
  ]
}
```

**2. Load it on the server.** `parseFormSchema` checks the JSON and throws a readable error on mistakes:

```ts
// lib/get-form.ts
import "server-only";
import { parseFormSchema } from "@nodari-pruidze/form-builder-js";
import contact from "@/data/contact.json";

export async function getForm() {
  return parseFormSchema("contact", contact);
}
```

**3. Validate on the server.** Never trust the client: load your own copy of the schema.

```ts
// app/actions.ts
"use server";
import { validateFormValues, type FormValues, type SubmitResult } from "@nodari-pruidze/form-builder-js";
import { getForm } from "@/lib/get-form";

export async function submitContact(values: FormValues): Promise<SubmitResult> {
  const result = validateFormValues(await getForm(), values);
  if (!result.success) return { success: false, fieldErrors: result.fieldErrors };

  // result.data: validated, visible fields only
  await saveSomewhere(result.data);
  return { success: true, message: "Thanks!" };
}
```

**4. Render it.** `@nodari-pruidze/form-builder-js/react` is already marked `"use client"`:

```tsx
// app/page.tsx (a server component)
import { FormBuilder } from "@nodari-pruidze/form-builder-js/react";
import { getForm } from "@/lib/get-form";
import { submitContact } from "./actions";

export default async function Page() {
  return <FormBuilder form={await getForm()} onSubmit={submitContact} />;
}
```

If `fieldErrors` comes back from the server, each message is shown under its field, the form jumps to that field's step, and the first invalid field is scrolled to and focused.

## Form JSON

A form can be written in three ways.

**1. A plain array of fields: a simple one-page form.** No steps, no stepper, no Back/Next buttons, just the fields and a Submit button:

```json
[
  { "name": "fullName", "label": "Full name", "type": "text", "isRequired": true },
  { "name": "email", "label": "Email", "type": "email", "isRequired": true },
  { "name": "message", "label": "Message", "type": "textarea", "validation": { "maxLength": 500 } }
]
```

**2. An object with `steps`: a multi-step wizard.** Each step gets its own page with a stepper, a "Step 1 of 2" counter and Back/Next buttons (see the [Quick start](#quick-start-nextjs) example).

```json
{
  "steps": [
    { "id": "about", "title": "About you", "fields": [ ... ] },
    { "id": "work", "title": "Work", "fields": [ ... ] }
  ]
}
```

A `steps` object with **one** step is also a one-page form, like the plain array, but lets you show a title and description above the fields:

```json
{
  "steps": [
    {
      "id": "contact",
      "title": "Contact us",
      "description": "We reply within one business day.",
      "fields": [
        { "name": "email", "label": "Email", "type": "email", "isRequired": true },
        { "name": "message", "label": "Message", "type": "textarea", "isRequired": true }
      ]
    }
  ]
}
```

**3. `"layout": "sections"`: a one-page form split into sections.** Every step is rendered on the same page as a titled `<fieldset>` section, with a single Submit button: no stepper, no Back/Next, no `?step=`. A step's `showWhen` still hides the whole section. This is the usual shape of a long application form:

```json
{
  "layout": "sections",
  "steps": [
    {
      "id": "applicant",
      "title": "1. Applicant",
      "fields": [
        { "name": "applicant", "label": "Personal number", "type": "custom", "component": "verifyPerson", "isRequired": true },
        { "name": "phone", "label": "Mobile phone", "type": "tel", "isRequired": true, "width": "half" },
        { "name": "email", "label": "Email", "type": "email", "width": "half" }
      ]
    },
    {
      "id": "address",
      "title": "2. Address",
      "fields": [
        { "name": "legalAddress", "label": "Legal address", "type": "text", "isRequired": true },
        { "name": "sameAddress", "label": "The actual address is the same as the legal address", "type": "checkbox", "defaultValue": true },
        { "name": "actualAddress", "label": "Actual address", "type": "text", "isRequired": true, "showWhen": { "field": "sameAddress", "notEquals": true } }
      ]
    },
    {
      "id": "documents",
      "title": "3. Documents",
      "description": "PDF or image, up to 5 MB each.",
      "fields": [
        { "name": "idCard", "label": "ID card copy", "type": "file", "isRequired": true, "accept": ".pdf,image/*", "maxSizeMb": 5 },
        { "name": "termInfo", "type": "info", "label": "Term and fee", "text": "The service is free.\nA decision is made within 10 working days." },
        { "name": "agree", "label": "I confirm the information above is correct", "type": "checkbox", "isRequired": true }
      ]
    }
  ]
}
```

All three formats are loaded the same way, with `parseFormSchema`, and conditional fields (`showWhen`) work in all of them. Without `layout` (or with `"layout": "wizard"`) a form with several steps is a wizard, exactly as before.

### Step

| Key | Type | |
|---|---|---|
| `id` | string | Unique. Shown in the URL as `?step=id` (wizard only). |
| `title` | string | Required when a **wizard** has more than one step. Optional in `sections`. |
| `description` | string | Optional text under the title. |
| `showWhen` | condition or condition[] | Skip the whole step / section unless it matches. Can only depend on fields from **earlier** steps. |
| `fields` | field[] | At least one. |

### Field

| Key | Type | |
|---|---|---|
| `name` | string | Unique across all steps. Used as the key in the submitted values. Can't contain `.`, `[` or `]`. |
| `label` | string | Required, except for `info`. |
| `type` | see [Field types](#field-types) | `text`, `email`, `tel`, `number`, `textarea`, `date`, `select`, `radio`, `checkbox`, `file`, `custom`, `array`, `info` |
| `isRequired` | boolean | A required checkbox must be checked; a required array needs at least one row. |
| `options` | `{ label, value }[]` | Required for `select` / `radio`. |
| `placeholder` | string | |
| `description` | string | Help text under the label, linked with `aria-describedby`. |
| `width` | `"full" \| "half"` | `"half"` puts two fields side by side on wider screens. Default `"full"`. |
| `readOnly` | boolean | Shown and submitted, but can't be edited. |
| `defaultValue` | depends on the type | Initial value: a string for text-like fields, a number for `number`, `true`/`false` for `checkbox`, an option value for `select`/`radio`, `"YYYY-MM-DD"` or `"today"` for `date`, any JSON for `custom`. Not for `file`, `array`, `info`. |
| `showWhen` | condition or condition[] | Shown only when it matches (an array means **all** must match). Can depend on fields from the same or earlier steps. |
| `validation` | object | `minLength`, `maxLength`, `min`, `max`, `integer`, `pattern`, `message` |

Each type also has its own keys, listed under [Field types](#field-types). `parseFormSchema` rejects keys a type doesn't support, with the path and the reason, for example `"accept" is not supported for type "text" → at steps[0].fields[2].accept`.

Notes:
- Text values are trimmed, and whitespace-only counts as empty.
- `pattern` is a regex string, and JSON needs double backslashes: `"^\\+?[0-9]+$"`.
- `message` replaces the default error for `pattern`, `min` and `max`.
- Patterns run on your server. Only load schemas from sources you trust.
- `readOnly` is a UI setting. The server validates a read-only field like any other, so if its value must not change (an applicant's personal number, say), take it from your own data on the server, not from the submitted values.

### Conditions

A condition compares another field's current value. It has `field` and **exactly one** of:

| Operator | Matches when | Example |
|---|---|---|
| `equals` | the value is this one, or one of these | `{ "field": "status", "equals": ["employed", "self-employed"] }` |
| `notEquals` | the value is none of these (an empty value counts as "not equal") | `{ "field": "sameAddress", "notEquals": true }` |
| `notEmpty: true` | the field has a value | `{ "field": "photos", "notEmpty": true }` |

- **Empty** means `undefined`, `null`, `""` or whitespace, `false` (an unchecked checkbox), `[]` or `{}`. `0` is not empty.
- `showWhen: [ ... ]` means **all** conditions must match.
- If the field a condition points at is itself hidden, the condition fails, so the whole chain is hidden (even with `notEquals`).
- `file` and `array` fields can only be used with `notEmpty`. `info` fields have no value and can't be used at all.
- Inside an `array` row, conditions point at **fields of the same row**.

## Field types

### `text`, `email`, `textarea`, `number`, `select`, `radio`, `checkbox`

Unchanged from earlier versions; see the [Quick start](#quick-start-nextjs).

### `tel`

An `<input type="tel">` (phone keyboard on mobile), validated like `text` with `minLength`, `maxLength` and `pattern`. **There is no built-in phone pattern**, because formats differ by country; add your own:

```json
{ "name": "phone", "label": "Mobile phone", "type": "tel", "isRequired": true,
  "validation": { "pattern": "^(\\+995)?5\\d{8}$", "message": "9 digits, starting with 5" } }
```

### `date`

The value is a string `"YYYY-MM-DD"`. `validation.min` and `validation.max` take a date or the keyword `"today"`, and the same check runs on the server. Impossible dates such as `"2025-02-30"` are rejected. The built-in input is a native `<input type="date">` (its `min`/`max` are set too); replace it with `components.date`.

```json
{ "name": "birthDate", "label": "Date of birth", "type": "date", "isRequired": true,
  "validation": { "min": "1900-01-01", "max": "today" } }
```

`"today"` is computed when validating, in the local time zone of the browser or the server. Those can differ (a server in UTC and a user in Tbilisi disagree about "today" between midnight and 4 am), so pass the same IANA time zone to both sides: `<FormBuilder timeZone="Asia/Tbilisi" />` and `validateFormValues(form, values, { timeZone: "Asia/Tbilisi" })`. `"defaultValue": "today"` fills in today's date.

### `file`

A file is uploaded **as soon as it's chosen**, with the `uploadFile` function you pass to `<FormBuilder>`. The field's value is what `uploadFile` resolves with (an array of them with `multiple`), so the form submits small JSON objects, not files.

| Key | Type | |
|---|---|---|
| `accept` | string | Like the input's `accept`: `".pdf,image/*"`. Checked before uploading. |
| `maxSizeMb` | number | Largest file, in MB. Checked before uploading. |
| `multiple` | boolean | Several files; the value is then an array. |

```json
{ "name": "idCard", "label": "ID card copy", "type": "file", "isRequired": true, "accept": ".pdf,image/*", "maxSizeMb": 5 }
```

See [File uploads](#file-uploads-uploadfile) for `uploadFile` and the server side.

### `custom`

Your own component, picked by `component`. Any extra keys are kept and handed to the component (and to the validator) as part of `field`:

```json
{ "name": "applicant", "label": "Personal number", "type": "custom", "component": "verifyPerson",
  "isRequired": true, "buttonText": "Verify" }
```

`component` is required. The value can be any JSON. See [Custom fields](#custom-fields-componentscustom-and-customvalidators).

### `array` (repeating group)

A list of rows, each with the same `fields`. The value is an array of objects keyed by the row's field names. Row fields can be of any type except `array`, and their `showWhen` points at fields of the same row.

| Key | Type | |
|---|---|---|
| `fields` | field[] | The fields of one row. Their names only need to be unique within the row. |
| `minItems` | integer | Fewest rows (default 0, or 1 when `isRequired`). The form starts with this many rows. |
| `maxItems` | integer | Most rows. The add button disappears at the limit. |
| `addLabel` | string | Text of the add button (default `messages.add`). |
| `removeLabel` | string | Text of each row's remove button (default `messages.remove`). |

```json
{
  "name": "personnel",
  "label": "Personnel",
  "type": "array",
  "minItems": 1,
  "maxItems": 20,
  "addLabel": "Add person",
  "removeLabel": "Remove",
  "fields": [
    { "name": "personalNumber", "label": "Personal number", "type": "text", "isRequired": true, "width": "half", "validation": { "pattern": "^\\d{11}$" } },
    { "name": "role", "label": "Role", "type": "select", "isRequired": true, "width": "half",
      "options": [{ "label": "Vet", "value": "vet" }, { "label": "Other", "value": "other" }] },
    { "name": "roleOther", "label": "Which role?", "type": "text", "isRequired": true, "showWhen": { "field": "role", "equals": "other" } }
  ]
}
```

Submitted value: `{ "personnel": [{ "personalNumber": "01001012345", "role": "vet" }] }`. Hidden row fields are dropped from each row, and a visible array is always submitted as an array (`[]` when empty).

**Errors inside rows** are keyed by path: `"personnel.2.personalNumber"`. The array's own errors (`minItems`, `maxItems`, required) use its name: `"personnel"`. Return the same keys from your server action and they are shown under the right row field:

```ts
return { success: false, fieldErrors: { "personnel.2.personalNumber": "Not found in the registry" } };
```

### `info`

A display-only text block: no value, never validated or submitted. `label` (optional) is shown as its title, and line breaks in `text` are kept. It supports `showWhen` and `width`.

```json
{ "name": "termInfo", "type": "info", "label": "Term and fee", "text": "The service is free.\nA decision is made within 10 working days." }
```

## Customizing

### Text and translations: `messages`

Every piece of text can be overridden. Templates use `{placeholders}`. **Pass the same messages to the server** so client and server errors match:

```ts
// lib/messages.ts
import type { FormMessages } from "@nodari-pruidze/form-builder-js";

export const messagesKa: Partial<FormMessages> = {
  required: "{label} სავალდებულოა",
  minLength: "მინიმუმ {min} სიმბოლო",
  next: "შემდეგი",
  back: "უკან",
  submit: "გაგზავნა",
};
```

```tsx
<FormBuilder form={form} onSubmit={submit} messages={messagesKa} />
```

```ts
validateFormValues(form, values, { messages: messagesKa });
```

See `defaultMessages` for every key. Keys added in 0.3: `invalidDate`, `dateMin`, `dateMax`, `minItems`, `maxItems` (validation, so pass them to the server too) and `fileTooLarge`, `fileType`, `uploadFailed`, `uploading`, `add`, `remove`, `arrayItem` (UI only).

### Styles: `classNames`

Every part of the form has a named **slot** that holds its Tailwind classes. Pass the slots you want to change in `classNames`; the rest keep their defaults.

| Group | Slot | Applies to |
|---|---|---|
| Layout | `form` | The `<form>` element (spacing between its parts) |
| | `fieldGrid` | The grid that holds the fields of a step, a section or an array row (2 columns from `sm:`) |
| | `field` | The wrapper around one field (label + input + error) |
| | `fieldFull` | Added to `field` for `width: "full"` (the default): spans both columns |
| | `fieldHalf` | Added to `field` for `width: "half"`: one column |
| | `actions` | The row that holds the Back / Next / Submit buttons |
| Sections | `section` | A step's `<fieldset>` in `layout: "sections"` |
| | `sectionHeader` | The wrapper around a section's title and description |
| | `sectionTitle` | The section title (an `<h2>`) |
| | `sectionDescription` | The text under the section title |
| Labels | `label` | The label above an input |
| | `legend` | The label of a radio group or an array |
| | `required` | The `*` after a required field's label |
| | `description` | The help text from a field's `description` |
| Inputs | `input` | Text, email, tel, number, date, textarea and select inputs |
| | `inputError` | The same inputs **when they have an error** (used instead of `input`) |
| | `checkboxLabel` | The `<label>` that wraps a checkbox and its text |
| | `radioGroup` | The wrapper around all options of a radio group |
| | `radioLabel` | The `<label>` that wraps one radio option and its text |
| | `error` | The error message under a field |
| Files | `file` | The wrapper of a file field (input + list) |
| | `fileInput` | The native `<input type="file">` |
| | `fileList` | The list of uploaded / uploading files |
| | `fileItem` | One file in the list |
| | `fileName` | The file name |
| | `fileProgress` | The `<progress>` bar while uploading (when `uploadFile` reports progress) |
| | `fileRemove` | A file's remove button |
| Arrays | `arrayItems` | The list of rows |
| | `arrayItem` | One row |
| | `arrayItemHeader` | The row's title + remove button |
| | `arrayItemTitle` | The row title (`messages.arrayItem`, "Personnel #1") |
| | `arrayAdd` | The add button |
| | `arrayRemove` | A row's remove button |
| Info | `info` | An `info` block |
| | `infoTitle` | Its title (the field's `label`) |
| | `infoText` | Its text |
| Stepper | `stepper` | The list that holds the step buttons |
| | `stepperItem` | A step already visited, which can be clicked to go back |
| | `stepperItemCurrent` | The step the user is on |
| | `stepperItemUpcoming` | A step not reached yet (disabled) |
| Step heading | `stepHeader` | The wrapper around the counter, title and description |
| | `stepCounter` | The "Step 1 of 3" text |
| | `stepTitle` | The step title |
| | `stepDescription` | The text under the title |
| Status | `statusSuccess` | The message after a successful submit |
| | `statusError` | The message after a failed submit |
| Buttons | `button` | The Next / Submit button |
| | `buttonSecondary` | The Back button |

**A slot you pass replaces the default, it doesn't add to it.** So `input: "h-12"` gives an input with *only* `h-12` (no border, no padding). To keep the default look and change one thing, build on `defaultClassNames`:

```tsx
import { FormBuilder, defaultClassNames } from "@nodari-pruidze/form-builder-js/react";

// keeps the default look, only makes inputs taller
classNames={{ input: defaultClassNames.input + " h-12" }}

// replaces the look completely
classNames={{ input: "w-full rounded-none border-b-2 border-gray-300 px-0 py-2 focus:border-indigo-600 outline-none" }}
```

You can print `defaultClassNames` (or read it in your editor) to see every default.

#### Example: restyle the inputs

Remember to set `inputError` too, otherwise a field with an error falls back to the default style.

```tsx
<FormBuilder
  form={form}
  onSubmit={submit}
  classNames={{
    label: "text-sm font-semibold text-slate-700",
    input: "w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
    inputError: "w-full rounded-lg border border-red-400 bg-red-50 px-4 py-3 outline-none focus:ring-2 focus:ring-red-200",
    error: "text-xs font-medium text-red-600",
    button: "rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500 disabled:opacity-50",
    buttonSecondary: "rounded-lg border border-slate-300 px-6 py-3 text-slate-700 hover:bg-slate-100",
  }}
/>
```

#### Example: restyle the stepper

The stepper is a row of buttons, one per step. Each button gets one of three slots depending on its state:

```text
 [ 1. About you ]   [ 2. Work ]   [ 3. Review ]
   stepperItem      stepperItem   stepperItem
   (visited)        Current       Upcoming
                    (you are      (not reached
                     here)         yet)
```

Tabs with an underline instead of the default pills:

```tsx
<FormBuilder
  form={form}
  onSubmit={submit}
  classNames={{
    stepper: "flex gap-6 border-b border-slate-200 text-sm",
    stepperItem: "pb-2 text-slate-600 hover:text-indigo-600",
    stepperItemCurrent: "-mb-px border-b-2 border-indigo-600 pb-2 font-semibold text-indigo-600",
    stepperItemUpcoming: "pb-2 text-slate-300",
    stepCounter: "text-xs uppercase tracking-wide text-indigo-600",
    stepTitle: "text-2xl font-bold outline-none",
  }}
/>
```

To hide the stepper or the "Step 1 of 3" counter, use `hidden`:

```tsx
classNames={{ stepper: "hidden", stepCounter: "hidden" }}
```

To change the stepper's **markup** (circles, icons, checkmarks), not only its classes, use the [`stepper` prop](#your-own-stepper-stepper).

#### Example: style radio buttons and checkboxes

There is no slot for the small native radio/checkbox `<input>` itself, only for the label around it. Style it through the label with Tailwind's `accent-*` (color) and `[&>input]:` (any other class):

```tsx
classNames={{
  checkboxLabel: defaultClassNames.checkboxLabel + " accent-indigo-600 [&>input]:size-5",
  radioLabel: defaultClassNames.radioLabel + " accent-indigo-600 [&>input]:size-5",
}}
```

For a fully custom look (for example toggle switches), use your own component, see [`components`](#your-own-inputs-components).

#### Styling one field differently

`classNames` applies to **every** field of that kind; the JSON has no per-field `className`. To style a single field, wrap the built-in `FieldInput` and change the classes for that field only:

```tsx
"use client";
import { FieldInput, FormBuilder, type FieldComponentProps, type FormBuilderProps } from "@nodari-pruidze/form-builder-js/react";

function TextInput(props: FieldComponentProps) {
  if (props.field.name !== "fullName") return <FieldInput {...props} />;
  const { input, inputError } = props.classNames;
  return <FieldInput {...props} classNames={{ ...props.classNames, input: input + " text-lg", inputError: inputError + " text-lg" }} />;
}

export function MyForm(props: FormBuilderProps) {
  return <FormBuilder {...props} components={{ text: TextInput }} />;
}
```

### Your own inputs: `components`

You can replace the input for any field type, for example to use your design system. The label, error message and radio `<fieldset>` are still rendered around it. A checkbox component renders its own label.

Components are functions, so in Next.js pass them from a client component:

```tsx
// components/MyForm.tsx
"use client";
import { FormBuilder, type FieldComponentProps, type FormBuilderProps } from "@nodari-pruidze/form-builder-js/react";

function MyTextInput({ id, register, aria, hasError }: FieldComponentProps) {
  return <input id={id} {...register} {...aria} className={hasError ? "my-input my-input--error" : "my-input"} />;
}

export function MyForm(props: FormBuilderProps) {
  return <FormBuilder {...props} components={{ text: MyTextInput, email: MyTextInput }} />;
}
```

For controlled components (for example a Radix/shadcn Select), use `control` with the `name` prop. Use `name`, not `field.name`: inside an `array` row it is the full path, like `"personnel.0.role"`.

```tsx
import { useController } from "react-hook-form";

function MySelect({ field, name, control, disabled, readOnly }: FieldComponentProps) {
  const { field: f } = useController({ control, name });
  return (
    <FancySelect
      value={(f.value as string) ?? ""}
      onChange={f.onChange}
      options={field.options ?? []}
      disabled={disabled || readOnly}
    />
  );
}
```

Besides `field`, `name`, `id`, `register`, `control`, `aria`, `hasError`, `classNames` and `messages`, every component gets `disabled` (the whole form is disabled) and `readOnly` (the field, or the array it's in, is read-only); honor both. `aria["aria-describedby"]` already points at the field's description and error.

The keys of `components` are the field types `text`, `email`, `tel`, `number`, `textarea`, `date`, `select`, `radio`, `checkbox` and `file`, plus `custom` (see below). `array` and `info` are rendered by the form itself; style them with `classNames`.

### Custom fields: `components.custom` and `customValidators`

A `"type": "custom"` field renders the component registered under its `component` key. It gets the usual `FieldComponentProps`, and `field` includes the extra JSON keys. Example: look a person up by personal number.

```tsx
"use client";
import { useState } from "react";
import { useController } from "react-hook-form";
import type { CustomFieldSchema } from "@nodari-pruidze/form-builder-js";
import { FormBuilder, type FieldComponentProps, type FormBuilderProps } from "@nodari-pruidze/form-builder-js/react";

function VerifyPerson({ field, name, control, id, aria, classNames, hasError, disabled, readOnly }: FieldComponentProps) {
  const { field: f } = useController({ control, name });
  const [input, setInput] = useState("");
  const verify = async () => {
    const person = await fetch(`/api/person/${input}`).then((r) => (r.ok ? r.json() : undefined));
    f.onChange(person ? { personalNumber: input, fullName: person.fullName } : undefined);
  };
  return (
    <div className="flex gap-2">
      <input ref={f.ref} id={id} {...aria} value={input} onChange={(e) => { setInput(e.target.value); f.onChange(undefined); }}
        disabled={disabled} readOnly={readOnly} className={hasError ? classNames.inputError : classNames.input} />
      <button type="button" onClick={verify} disabled={disabled || readOnly}>{(field as CustomFieldSchema).buttonText as string}</button>
    </div>
  );
}

export function MyForm(props: FormBuilderProps) {
  return <FormBuilder {...props} components={{ custom: { verifyPerson: VerifyPerson } }} />;
}
```

Pass `f.ref` to a focusable element so the field can be focused when it has an error. Read extra keys with a cast, or type `field` as `CustomFieldSchema`.

On the server, `validateFormValues` checks a custom field with the validator registered under the same key. A validator gets the value and the field, and returns an error message or `undefined`. It runs only for visible fields with a non-empty value. **Without a validator, only `isRequired` is checked and the value passes through unchanged.**

```ts
const result = validateFormValues(form, values, {
  customValidators: {
    verifyPerson: (value) => {
      const v = value as { personalNumber?: unknown };
      return typeof v.personalNumber === "string" && /^\d{11}$/.test(v.personalNumber)
        ? undefined
        : "Verify the personal number";
    },
  },
});
```

Validators are synchronous, like the rest of `validateFormValues`. Checks that need I/O (asking the registry again, which you should do, since the client's lookup result can be forged) go in your server action after `validateFormValues` succeeds; return their errors as `fieldErrors` keyed by the field name. You can pass the same `customValidators` to `<FormBuilder customValidators={...}>` (from a client component) to show the error before submitting.

### File uploads: `uploadFile`

`file` fields need an `uploadFile` function on `<FormBuilder>`. It is called once per chosen file, right after the file passes the `accept` / `maxSizeMb` checks, and resolves with `{ id, name, size?, type? }`; that object becomes the field's value. While uploads run, the file shows as "Uploading..." (with a progress bar if you call `onProgress`) and Submit is disabled. Uploaded files are listed with a remove button. If `uploadFile` throws, `messages.uploadFailed` is shown.

```tsx
"use client";
import { FormBuilder, type FormBuilderProps, type UploadFile } from "@nodari-pruidze/form-builder-js/react";

const uploadFile: UploadFile = async (file, field, { onProgress }) => {
  const body = new FormData();
  body.append("file", file);
  body.append("field", field.name);
  const res = await fetch("/api/uploads", { method: "POST", body });
  if (!res.ok) throw new Error("Upload failed");
  onProgress(1);
  return res.json(); // { id, name, size, type }
};

export function MyForm(props: FormBuilderProps) {
  return <FormBuilder {...props} uploadFile={uploadFile} />;
}
```

Without `uploadFile`, file inputs are disabled and a warning is logged in development.

**On the server, `validateFormValues` only checks the shape:** each value must be `{ id: string, name: string, size?: number, type?: string }` (an array with `multiple`, a single object without), plus `isRequired`. Unknown keys are dropped. `size` and `type` are whatever the client sent, so **never use them for security decisions**. `accept` and `maxSizeMb` are only checked in the browser. Before saving, look up every `id` in your own upload store and check there that the upload exists, belongs to the current user or session, and that its real size and type are allowed.

### Prefill, read-only and review: `defaultValues`, `readOnly`, `disabled`

- A field's `defaultValue` is its initial value. `<FormBuilder defaultValues={{ ... }}>` prefills the whole form (an application being edited, say) and wins over `defaultValue`. For an array, pass an array of row objects. Values are kept while fields are hidden and shown again, and Submit resets the form back to them.
- `readOnly: true` on a field shows the value and submits it, but the user can't change it. On an `array` it also removes the add / remove buttons and makes every row field read-only.
- `<FormBuilder disabled>` renders the whole form read-only without a Submit button, for example for a reviewer looking at a submitted application. In a wizard, Next and Back still work, without validation.

```tsx
<FormBuilder form={form} onSubmit={noop} defaultValues={application.data} disabled />
```

### Your own stepper: `stepper`

The stepper of a multi-step form can be replaced too. It gets the visible steps, each with `index`, `number`, `id`, `title`, `status` (`"complete"`, `"current"` or `"upcoming"`) and `reachable` (already reached, so it can be clicked). Call `onSelect(item.index)` to go to a step; jumping forward still validates the current step.

```tsx
"use client";
import { FormBuilder, type FormBuilderProps, type StepperProps } from "@nodari-pruidze/form-builder-js/react";

function MyStepper({ items, onSelect, label }: StepperProps) {
  return (
    <nav aria-label={label}>
      <ol className="flex items-center gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={!item.reachable}
              aria-current={item.status === "current" ? "step" : undefined}
              onClick={() => onSelect(item.index)}
              className={item.status === "current" ? "font-semibold" : "text-gray-500"}
            >
              {item.status === "complete" ? "✓" : item.number} {item.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function MyForm(props: FormBuilderProps) {
  return <FormBuilder {...props} stepper={MyStepper} />;
}
```

To hide the stepper, pass `stepper={() => null}`.

## API

From `@nodari-pruidze/form-builder-js` (no React, safe on the server):

| Export | |
|---|---|
| `parseFormSchema(formId, json)` | Checks JSON and returns a `FormDefinition`. Throws on mistakes, with the path and the reason. |
| `validateFormValues(form, values, { messages?, customValidators?, timeZone? }?)` | Returns `{ success: true, data }` or `{ success: false, fieldErrors }`. `fieldErrors` keys are field names or array paths (`"personnel.2.personalNumber"`). |
| `buildZodSchema(fields, messages?, { customValidators?, timeZone? }?)` | The Zod schema used by both sides. |
| `buildDefaultValues(fields, overrides?, timeZone?)` | The initial values `<FormBuilder>` starts with. |
| `isFieldVisible`, `isStepVisible`, `conditionMatches`, `flattenSteps`, `indexByName`, `toConditions` | Visibility helpers. |
| `isEmptyValue`, `isIsoDate`, `todayIso` | Value helpers. |
| `defaultMessages`, `resolveMessages`, `formatMessage` | Text helpers. |
| Types | `FormDefinition`, `FormLayout`, `FormStep`, `FieldSchema`, `CustomFieldSchema`, `Condition`, `UploadedFile`, `FormValues`, `SubmitResult`, `FormMessages`, `CustomValidator`, `ValidateOptions` and more. |

From `@nodari-pruidze/form-builder-js/react`:

| Export | |
|---|---|
| `<FormBuilder form onSubmit messages? classNames? components? stepper? defaultValues? disabled? uploadFile? customValidators? timeZone? />` | The form. |
| `FieldInput` | The built-in input, handy to wrap. |
| `FileInput` | The built-in file input. |
| `Stepper` | The built-in stepper, handy to wrap. |
| `defaultClassNames` | All default Tailwind classes. |
| Types | `FormBuilderProps`, `FieldComponentProps`, `FieldComponents`, `UploadFile`, `StepperProps`, `StepperItem`, `FormClassNames`. |

## Behaviour notes

- Values are kept while moving between steps, but **not across page reloads**. A reload starts at step 1.
- Errors appear when a field loses focus, on "Next" or on Submit. Once shown, an error clears as soon as the field is fixed.
- After a failed submit (client or server), the first invalid field in page order is scrolled to and focused.
- Enter on a middle step acts as "Next".
- Submit is disabled while files are uploading.

## Changelog

See [CHANGELOG.md](https://github.com/nodi100/form-builder-js/blob/main/packages/form-builder/CHANGELOG.md) for what changed in each version.

## License

MIT
