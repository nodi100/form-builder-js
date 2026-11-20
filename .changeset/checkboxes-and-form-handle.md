---
"@iteasa/form-builder-js": minor
---

New field type `checkboxes`: a group of checkboxes whose value is an array of option values, in option order. Options can be `exclusive` (ticking one clears the others, and the server rejects it together with another option). `isRequired` needs one ticked option; `minItems` / `maxItems` limit the count. New condition operator `contains` shows a field while an option of a `checkboxes` field is ticked. `text`, `tel` and `number` fields take a `suffix` (a unit shown after the input).

`<FormBuilder>` can now be driven from your own page: a `ref` (`FormBuilderHandle`) with `getValues()` (visible values, unvalidated), `validate()` (shows errors, focuses the first, resolves like `validateFormValues`) and `reset(values?)`; an `onValuesChange(values, { isValid })` callback; `hideActions` to render no buttons and a `<div>` instead of a `<form>`; and `onSubmit` is optional (no Submit button without it).

New core helpers: `describeValues(form, values, options?)` turns answers into labelled lines of text per step, and `pickVisibleValues(fields, values)` keeps only the visible fields. New messages `minSelected`, `maxSelected`, `yes`, `no`, `uploadsPending`; new class slots `inputGroup`, `inputSuffix`, `checkboxGroup`; new types `FormBuilderHandle`, `FormChangeInfo`, `DescribeOptions`, `DescribedStep`, `DescribedField`.
