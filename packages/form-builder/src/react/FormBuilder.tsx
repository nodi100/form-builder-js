import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormDefinition, FormValues, SubmitResult } from "../core/types";
import { buildZodSchema } from "../core/build-zod-schema";
import {
  flattenSteps,
  indexByName,
  isFieldVisible,
  isStepVisible,
  toConditions,
} from "../core/form-visibility";
import { formatMessage, resolveMessages, type FormMessages } from "../core/messages";
import { defaultClassNames, type FormClassNames } from "./class-names";
import type { FieldComponents } from "./types";
import { FormField } from "./FormField";
import { Stepper } from "./Stepper";

export type FormBuilderProps = {
  /** Result of parseFormSchema, usually loaded on the server */
  form: FormDefinition;
  /** Usually a server action that calls validateFormValues */
  onSubmit: (values: FormValues) => Promise<SubmitResult>;
  /** Override any text; pass the same object to validateFormValues */
  messages?: Partial<FormMessages>;
  /** Replace the Tailwind classes of any part (see defaultClassNames) */
  classNames?: FormClassNames;
  /** Replace the input for any field type with your own component */
  components?: FieldComponents;
};

/** Current URL with ?step=<id> */
function stepUrl(stepId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("step", stepId);
  return url;
}

export function FormBuilder({ form, onSubmit, messages, classNames, components }: FormBuilderProps) {
  const { steps } = form;
  const isMultiStep = steps.length > 1;

  const m = useMemo(() => resolveMessages(messages), [messages]);
  const cn = useMemo(() => ({ ...defaultClassNames, ...classNames }), [classNames]);
  const fields = useMemo(() => flattenSteps(form), [form]);
  const zodSchema = useMemo(() => buildZodSchema(fields, m), [fields, m]);
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

  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  // furthest step reached; the stepper can jump back to anything up to it
  const [furthest, setFurthest] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(zodSchema),
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
  const current = visibleSteps.includes(stepIndex)
    ? stepIndex
    : (visibleSteps.findLast((i) => i < stepIndex) ?? visibleSteps[0] ?? 0);
  const prevStep = visibleSteps.findLast((i) => i < current);
  const nextStep = visibleSteps.find((i) => i > current);
  const step = steps[current];
  const stepFields = step.fields.filter((f) => isFieldVisible(f, values, byName));

  const goTo = (index: number, mode: "push" | "replace" = "push") => {
    setStepIndex(index);
    setFurthest((f) => Math.max(f, index));
    focusHeading.current = true;
    if (isMultiStep) {
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

  // values aren't kept across reloads, so a reload always starts at step 1
  useEffect(() => {
    if (isMultiStep) window.history.replaceState(null, "", stepUrl(steps[0].id));
  }, [isMultiStep, steps]);

  // browser back/forward: follow ?step=, but never past the furthest step reached
  useEffect(() => {
    if (!isMultiStep) return;
    const onPopState = () => {
      const id = new URLSearchParams(window.location.search).get("step");
      const index = steps.findIndex((s) => s.id === id);
      setStepIndex(index >= 0 && index <= furthest ? index : 0);
      focusHeading.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isMultiStep, steps, furthest]);

  const validateCurrentStep = () =>
    trigger(
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
  const showFirstStepWithError = (names: string[]) => {
    const indexes = names.map((name) => stepOf[name]).filter((i) => i !== undefined);
    if (!indexes.length) return;
    const first = Math.min(...indexes);
    if (first !== current) goTo(first);
  };

  const submit = async (data: FormValues) => {
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
      if (isMultiStep) goTo(0, "replace");
      setStatus({ ok: true, message: result.message ?? m.submitted });
      return;
    }

    // show server-side errors under the matching fields; errors with no
    // visible field to attach to (e.g. "_form") go in the status message
    const fieldNames: string[] = [];
    let formMessage: string | undefined;
    for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
      const field = byName[name];
      if (field && isFieldVisible(field, values, byName)) {
        setError(name, { type: "server", message });
        fieldNames.push(name);
      } else {
        formMessage ??= message;
      }
    }
    showFirstStepWithError(fieldNames);
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

  return (
    <form onSubmit={onFormSubmit} noValidate className={cn.form}>
      {isMultiStep && (
        <Stepper
          items={visibleSteps.map((index) => ({ index, title: steps[index].title }))}
          current={current}
          furthest={furthest}
          onSelect={selectStep}
          label={m.progressLabel}
          classNames={cn}
        />
      )}

      {step.title && (
        <div className={cn.stepHeader}>
          {isMultiStep && (
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

      {stepFields.map((field) => (
        <FormField
          key={field.name}
          field={field}
          register={register(field.name, {
            // once "Next" has shown an error, clear it as soon as it's fixed
            onChange: () => {
              if (errors[field.name]) void trigger(field.name);
            },
          })}
          control={control}
          error={errors[field.name]?.message as string | undefined}
          classNames={cn}
          messages={m}
          components={components}
        />
      ))}

      <div aria-live="polite">
        {status && (
          <p className={status.ok ? cn.statusSuccess : cn.statusError}>{status.message}</p>
        )}
      </div>

      <div className={cn.actions}>
        {prevStep !== undefined && (
          <button type="button" onClick={back} disabled={isSubmitting} className={cn.buttonSecondary}>
            {m.back}
          </button>
        )}
        <button type="submit" disabled={isSubmitting} className={cn.button}>
          {nextStep !== undefined ? m.next : isSubmitting ? m.submitting : m.submit}
        </button>
      </div>
    </form>
  );
}
