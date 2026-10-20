import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldSchema, FormDefinition, FormValues, SubmitResult } from "../core/types";
import { buildZodSchema, type CustomValidator } from "../core/build-zod-schema";
import { buildDefaultValues } from "../core/defaults";
import {
  flattenSteps,
  indexByName,
  isFieldVisible,
  isStepVisible,
  toConditions,
} from "../core/form-visibility";
import { formatMessage, resolveMessages, type FormMessages } from "../core/messages";
import { isPlainObject } from "../core/values";
import { defaultClassNames, type FormClassNames } from "./class-names";
import { FormBuilderContext, type FormBuilderContextValue } from "./context";
import type { FieldComponents, UploadFile } from "./types";
import { FieldList } from "./Fields";
import { Stepper, type StepperItem, type StepperProps } from "./Stepper";

export type FormBuilderProps = {
  /** Result of parseFormSchema, usually loaded on the server */
  form: FormDefinition;
  /** Usually a server action that calls validateFormValues */
  onSubmit: (values: FormValues) => Promise<SubmitResult>;
  /** Override any text; pass the same object to validateFormValues */
  messages?: Partial<FormMessages>;
  /** Replace the Tailwind classes of any part (see defaultClassNames) */
  classNames?: FormClassNames;
  /** Replace the input for any field type, and provide `custom` components */
  components?: FieldComponents;
  /** Replace the stepper of a multi-step wizard with your own component */
  stepper?: ComponentType<StepperProps>;
  /** Prefill the form (edit / review flows); wins over each field's `defaultValue` */
  defaultValues?: FormValues;
  /** Show the whole form read-only, without a Submit button */
  disabled?: boolean;
  /** Uploads a file as soon as it's chosen; required for `file` fields */
  uploadFile?: UploadFile;
  /** Same as validateFormValues' `customValidators`, to show errors before submitting */
  customValidators?: Record<string, CustomValidator>;
  /** IANA time zone for the "today" keyword of date fields; use the same as on the server */
  timeZone?: string;
};

/** Current URL with ?step=<id> */
function stepUrl(stepId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("step", stepId);
  return url;
}

export function FormBuilder({
  form,
  onSubmit,
  messages,
  classNames,
  components,
  stepper: StepperComponent = Stepper,
  defaultValues,
  disabled = false,
  uploadFile,
  customValidators,
  timeZone,
}: FormBuilderProps) {
  const { steps } = form;
  const isSections = form.layout === "sections";
  const isWizard = !isSections && steps.length > 1;

  const m = useMemo(() => resolveMessages(messages), [messages]);
  const cn = useMemo(() => ({ ...defaultClassNames, ...classNames }), [classNames]);
  const fields = useMemo(() => flattenSteps(form), [form]);
  const zodSchema = useMemo(
    () => buildZodSchema(fields, m, { customValidators, timeZone }),
    [fields, m, customValidators, timeZone]
  );
  const byName = useMemo(() => indexByName(fields), [fields]);
  const stepOf = useMemo(
    () =>
      Object.fromEntries(
        steps.flatMap((step, i) => step.fields.map((f) => [f.name, i] as const))
      ),
    [steps]
  );
  // only fields that others depend on need watching, so typing in any
  // other field doesn't re-render the whole form
  const watchedNames = useMemo(
    () => [...new Set(fields.flatMap((f) => toConditions(f.showWhen).map((c) => c.field)))],
    [fields]
  );
  // the initial values are only read on mount (and by reset after a submit)
  const initialValues = useMemo(
    () => buildDefaultValues(fields, defaultValues, timeZone),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  // furthest step reached; the stepper can jump back to anything up to it
  const [furthest, setFurthest] = useState(0);
  const [uploads, setUploads] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  // server errors to focus once they are rendered
  const focusErrors = useRef<string[] | null>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    setFocus,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(zodSchema),
    defaultValues: initialValues,
    // values of other steps must survive while their inputs are unmounted;
    // hidden fields are dropped by the Zod schema instead
    shouldUnregister: false,
    // validate a field once it's been left, then on every change
    mode: "onTouched",
  });

  const watchedValues = useWatch({ control, name: watchedNames });
  const values: FormValues = Object.fromEntries(
    watchedNames.map((name, i) => [name, watchedValues[i]])
  );

  const visibleSteps = steps.flatMap((step, i) =>
    isStepVisible(step, values, byName) ? [i] : []
  );
  // if the current step was just hidden, fall back to the closest earlier one
  const current = isSections
    ? 0
    : visibleSteps.includes(stepIndex)
      ? stepIndex
      : (visibleSteps.findLast((i) => i < stepIndex) ?? visibleSteps[0] ?? 0);
  const prevStep = isSections ? undefined : visibleSteps.findLast((i) => i < current);
  const nextStep = isSections ? undefined : visibleSteps.find((i) => i > current);
  const step = steps[current];
  const stepFields = step.fields.filter(
    (f) => f.type !== "info" && isFieldVisible(f, values, byName)
  );
  const stepperItems = visibleSteps.map(
    (index, n): StepperItem => ({
      index,
      number: n + 1,
      id: steps[index].id,
      title: steps[index].title,
      status: index < current ? "complete" : index === current ? "current" : "upcoming",
      reachable: index !== current && index <= furthest,
    })
  );

  const goTo = (index: number, mode: "push" | "replace" = "push") => {
    setStepIndex(index);
    setFurthest((f) => Math.max(f, index));
    focusHeading.current = true;
    if (isWizard) {
      const url = stepUrl(steps[index].id);
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    }
  };

  // move focus to the new step's heading, so screen readers announce it
  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    headingRef.current?.focus();
  }, [current]);

  // after server errors: scroll to and focus the first invalid field (in
  // page order). Runs after the heading effect, so it wins on a step change.
  useEffect(() => {
    const paths = focusErrors.current;
    if (!paths) return;
    focusErrors.current = null;
    const rendered = paths
      .map((path) => ({ path, el: document.getElementById(`${path}-error`) }))
      .filter((x): x is { path: string; el: HTMLElement } => !!x.el)
      .sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const first = rendered[0];
    if (!first) return;
    // custom inputs may not pass a ref to focus, so scroll to the field too
    first.el.parentElement?.scrollIntoView?.({ block: "center" });
    setFocus(first.path);
  });

  // values aren't kept across reloads, so a reload always starts at step 1
  useEffect(() => {
    if (isWizard) window.history.replaceState(null, "", stepUrl(steps[0].id));
  }, [isWizard, steps]);

  // browser back/forward: follow ?step=, but never past the furthest step reached
  useEffect(() => {
    if (!isWizard) return;
    const onPopState = () => {
      const id = new URLSearchParams(window.location.search).get("step");
      const index = steps.findIndex((s) => s.id === id);
      setStepIndex(index >= 0 && index <= furthest ? index : 0);
      focusHeading.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isWizard, steps, furthest]);

  const validateCurrentStep = () =>
    disabled
      ? Promise.resolve(true)
      : trigger(
          stepFields.map((f) => f.name),
          { shouldFocus: true }
        );

  const next = async () => {
    setStatus(null);
    if (nextStep !== undefined && (await validateCurrentStep())) goTo(nextStep);
  };

  const back = () => {
    setStatus(null);
    if (prevStep !== undefined) goTo(prevStep);
  };

  const selectStep = async (index: number) => {
    // jumping forward still requires the current step to be valid
    if (index > current && !(await validateCurrentStep())) return;
    setStatus(null);
    goTo(index);
  };

  /** Errors can belong to an earlier step (e.g. from the server): go there */
  const showFirstStepWithError = (paths: string[]) => {
    if (isSections) return;
    const indexes = paths.map((path) => stepOf[path.split(".")[0]]).filter((i) => i !== undefined);
    if (!indexes.length) return;
    const first = Math.min(...indexes);
    if (first !== current) goTo(first);
  };

  /** Is there a visible field to show this server error under? Accepts
   *  "name" and, inside an array, "name.rowIndex.subName". */
  const isPathVisible = (path: string) => {
    const [name, row, sub, ...rest] = path.split(".");
    const field = byName[name];
    if (!field || field.type === "info" || !isFieldVisible(field, values, byName)) return false;
    if (row === undefined) return true;
    if (field.type !== "array" || sub === undefined || rest.length) return false;
    const rowValues = getValues(`${name}.${row}`);
    const rowFields = field.fields ?? [];
    const subField = rowFields.find((f: FieldSchema) => f.name === sub);
    return (
      isPlainObject(rowValues) &&
      !!subField &&
      subField.type !== "info" &&
      isFieldVisible(subField, rowValues, indexByName(rowFields))
    );
  };

  const submit = async (data: FormValues) => {
    if (disabled || uploads > 0) return;
    setStatus(null);

    let result: SubmitResult;
    try {
      result = await onSubmit(data);
    } catch {
      setStatus({ ok: false, message: m.networkError });
      return;
    }

    if (result.success) {
      reset();
      setFurthest(0);
      if (isWizard) goTo(0, "replace");
      setStatus({ ok: true, message: result.message ?? m.submitted });
      return;
    }

    // show server-side errors under the matching fields; errors with no
    // visible field to attach to (e.g. "_form") go in the status message
    const paths: string[] = [];
    let formMessage: string | undefined;
    for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
      if (isPathVisible(path)) {
        setError(path, { type: "server", message });
        paths.push(path);
      } else {
        formMessage ??= message;
      }
    }
    focusErrors.current = paths;
    showFirstStepWithError(paths);
    setStatus({ ok: false, message: result.message ?? formMessage ?? m.fixErrors });
  };

  // Enter on a middle step means "Next", not "submit"
  const onFormSubmit =
    nextStep === undefined
      ? handleSubmit(submit, (errs) => showFirstStepWithError(Object.keys(errs)))
      : (e: FormEvent) => {
          e.preventDefault();
          void next();
        };

  const trackUpload = useCallback((delta: 1 | -1) => setUploads((n) => n + delta), []);

  const context: FormBuilderContextValue = {
    register,
    control,
    trigger,
    clearErrors,
    setValue,
    getValues,
    errors,
    classNames: cn,
    messages: m,
    components,
    disabled,
    uploadFile,
    trackUpload,
    timeZone,
  };

  const busy = isSubmitting || uploads > 0;
  const showSubmit = nextStep === undefined && !disabled;

  return (
    <FormBuilderContext.Provider value={context}>
      <form onSubmit={onFormSubmit} noValidate aria-disabled={disabled || undefined} className={cn.form}>
        {isSections ? (
          visibleSteps.map((index) => {
            const section = steps[index];
            const headingId = `section-${section.id}`;
            return (
              <fieldset
                key={section.id}
                aria-labelledby={section.title ? headingId : undefined}
                className={cn.section}
              >
                {(section.title || section.description) && (
                  <div className={cn.sectionHeader}>
                    {section.title && (
                      <h2 id={headingId} className={cn.sectionTitle}>
                        {section.title}
                      </h2>
                    )}
                    {section.description && (
                      <p className={cn.sectionDescription}>{section.description}</p>
                    )}
                  </div>
                )}
                <FieldList fields={section.fields} values={values} byName={byName} />
              </fieldset>
            );
          })
        ) : (
          <>
            {isWizard && (
              <StepperComponent
                items={stepperItems}
                onSelect={selectStep}
                label={m.progressLabel}
                classNames={cn}
              />
            )}

            {step.title && (
              <div className={cn.stepHeader}>
                {isWizard && (
                  <p className={cn.stepCounter}>
                    {formatMessage(m.stepCounter, {
                      current: visibleSteps.indexOf(current) + 1,
                      total: visibleSteps.length,
                    })}
                  </p>
                )}
                <h2 ref={headingRef} tabIndex={-1} className={cn.stepTitle}>
                  {step.title}
                </h2>
                {step.description && <p className={cn.stepDescription}>{step.description}</p>}
              </div>
            )}

            <FieldList fields={step.fields} values={values} byName={byName} />
          </>
        )}

        <div aria-live="polite">
          {status && (
            <p className={status.ok ? cn.statusSuccess : cn.statusError}>{status.message}</p>
          )}
        </div>

        {(prevStep !== undefined || nextStep !== undefined || showSubmit) && (
          <div className={cn.actions}>
            {prevStep !== undefined && (
              <button type="button" onClick={back} disabled={isSubmitting} className={cn.buttonSecondary}>
                {m.back}
              </button>
            )}
            {nextStep !== undefined ? (
              <button type="submit" disabled={isSubmitting} className={cn.button}>
                {m.next}
              </button>
            ) : (
              showSubmit && (
                <button type="submit" disabled={busy} className={cn.button}>
                  {isSubmitting ? m.submitting : m.submit}
                </button>
              )
            )}
          </div>
        )}
      </form>
    </FormBuilderContext.Provider>
  );
}
