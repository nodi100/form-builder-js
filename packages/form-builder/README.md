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

A form is either `{ "steps": [...] }` or a plain array of fields, which makes a single-step form with no stepper.

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

Each part of the form has a slot (`input`, `inputError`, `label`, `button`, `stepperItemCurrent` and so on; see `defaultClassNames`). A slot you pass **replaces** the default. To tweak a default, build on it:

```tsx
import { FormBuilder, defaultClassNames } from "@nodari-pruidze/form-builder-js/react";

<FormBuilder
  form={form}
  onSubmit={submit}
  classNames={{
    button: "rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-500",
    input: defaultClassNames.input + " h-11",
  }}
/>;
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
| `<FormBuilder form onSubmit messages? classNames? components? />` | The form. |
| `FieldInput` | The built-in input, handy to wrap. |
| `defaultClassNames` | All default Tailwind classes. |
| Types | `FormBuilderProps`, `FieldComponentProps`, `FieldComponents`, `FormClassNames`. |

## Behaviour notes

- Values are kept while moving between steps, but **not across page reloads**. A reload starts at step 1.
- Errors appear when a field loses focus or on "Next". Once shown, an error clears as soon as the field is fixed.
- Enter on a middle step acts as "Next".

## Changelog

See [CHANGELOG.md](https://github.com/nodi100/form-builder-js/blob/main/packages/form-builder/CHANGELOG.md) for what changed in each version.

## License

MIT
