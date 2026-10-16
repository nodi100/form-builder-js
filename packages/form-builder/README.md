# @nodari-pruidze/form-builder-js

Build React forms from JSON. Includes Zod validation, conditional fields, multi-step wizards, and server-side re-validation that uses the same schema.

- **One JSON schema** drives the UI, the client validation and the server validation.
- **Conditional fields and steps** (`showWhen`). Hidden fields are never validated and are dropped from the submitted data.
- **Multi-step wizards.** Each step is validated on "Next". The URL tracks the step (`?step=`). The form jumps to the step that has an error.
- **Accessible** labels, fieldsets, `aria-invalid`/`aria-describedby` and live status messages.
- **Customizable:** override any text (i18n), any CSS class, or any input component.

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

If `fieldErrors` comes back from the server, each message is shown under its field and the form jumps to that field's step.

## Form JSON

A form can be written in two ways.

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

Both formats are loaded the same way, with `parseFormSchema`, and conditional fields (`showWhen`) work in both.

### Step

| Key | Type | |
|---|---|---|
| `id` | string | Unique. Shown in the URL as `?step=id`. |
| `title` | string | Required when there's more than one step. |
| `description` | string | Optional text under the title. |
| `showWhen` | condition or condition[] | Skip the whole step unless it matches. Can only depend on fields from **earlier** steps. |
| `fields` | field[] | At least one. |

### Field

| Key | Type | |
|---|---|---|
| `name` | string | Unique across all steps. Used as the key in the submitted values. |
| `label` | string | |
| `type` | `text \| email \| number \| textarea \| select \| radio \| checkbox` | |
| `isRequired` | boolean | A required checkbox must be checked. |
| `options` | `{ label, value }[]` | Required for `select` / `radio`. |
| `placeholder` | string | |
| `showWhen` | condition or condition[] | Shown only when it matches (an array means **all** must match). Can depend on fields from the same or earlier steps. |
| `validation` | object | `minLength`, `maxLength`, `min`, `max`, `integer`, `pattern`, `message` |

A **condition** is `{ "field": "otherFieldName", "equals": "value" | true | ["a", "b"] }`.

Notes:
- Text values are trimmed, and whitespace-only counts as empty.
- `pattern` is a regex string, and JSON needs double backslashes: `"^\\+?[0-9]+$"`.
- `message` replaces the default error for `pattern`, `min` and `max`.
- Patterns run on your server. Only load schemas from sources you trust.

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

See `defaultMessages` for every key.

### Styles: `classNames`

Every part of the form has a named **slot** that holds its Tailwind classes. Pass the slots you want to change in `classNames`; the rest keep their defaults.

| Group | Slot | Applies to |
|---|---|---|
| Layout | `form` | The `<form>` element (spacing between fields) |
| | `field` | The wrapper around one field (label + input + error) |
| | `actions` | The row that holds the Back / Next / Submit buttons |
| Labels | `label` | The label above an input |
| | `legend` | The label of a radio group |
| | `required` | The `*` after a required field's label |
| Inputs | `input` | Text, email, number, textarea and select inputs |
| | `inputError` | The same inputs **when they have an error** (used instead of `input`) |
| | `checkboxLabel` | The `<label>` that wraps a checkbox and its text |
| | `radioGroup` | The wrapper around all options of a radio group |
| | `radioLabel` | The `<label>` that wraps one radio option and its text |
| | `error` | The error message under a field |
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

For controlled components (for example a Radix/shadcn Select), use `control`:

```tsx
import { useController } from "react-hook-form";

function MySelect({ field, control }: FieldComponentProps) {
  const { field: f } = useController({ control, name: field.name });
  return <FancySelect value={(f.value as string) ?? ""} onChange={f.onChange} options={field.options ?? []} />;
}
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
| `parseFormSchema(formId, json)` | Checks JSON and returns a `FormDefinition`. Throws on mistakes. |
| `validateFormValues(form, values, { messages }?)` | Returns `{ success: true, data }` or `{ success: false, fieldErrors }`. |
| `buildZodSchema(fields, messages?)` | The Zod schema used by both sides. |
| `isFieldVisible`, `isStepVisible`, `flattenSteps`, `indexByName`, `toConditions` | Visibility helpers. |
| `defaultMessages`, `resolveMessages`, `formatMessage` | Text helpers. |
| Types | `FormDefinition`, `FormStep`, `FieldSchema`, `Condition`, `FormValues`, `SubmitResult`, `FormMessages` and more. |

From `@nodari-pruidze/form-builder-js/react`:

| Export | |
|---|---|
| `<FormBuilder form onSubmit messages? classNames? components? stepper? />` | The form. |
| `FieldInput` | The built-in input, handy to wrap. |
| `Stepper` | The built-in stepper, handy to wrap. |
| `defaultClassNames` | All default Tailwind classes. |
| Types | `FormBuilderProps`, `FieldComponentProps`, `FieldComponents`, `StepperProps`, `StepperItem`, `FormClassNames`. |

## Behaviour notes

- Values are kept while moving between steps, but **not across page reloads**. A reload starts at step 1.
- Errors appear when a field loses focus or on "Next". Once shown, an error clears as soon as the field is fixed.
- Enter on a middle step acts as "Next".

## Changelog

See [CHANGELOG.md](https://github.com/nodi100/form-builder-js/blob/main/packages/form-builder/CHANGELOG.md) for what changed in each version.

## License

MIT
