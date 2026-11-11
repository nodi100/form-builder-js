"use client";

import { useEffect, useState } from "react";
import { useController } from "react-hook-form";
import {
  FormBuilder,
  type FieldComponentProps,
  type FormBuilderProps,
  type UploadFile,
} from "@iteasa/form-builder-js/react";

type Person = { personalNumber: string; fullName: string };

// stands in for a call to the population registry
const registry: Record<string, string> = { "01001012345": "Nino Beridze" };

/** A `custom` field: type a personal number, press Verify, get the person */
function VerifyPerson({ field, name, control, id, aria, classNames, hasError, disabled, readOnly }: FieldComponentProps) {
  const { field: f } = useController({ control, name });
  const person = f.value as Person | undefined;
  const [input, setInput] = useState(person?.personalNumber ?? "");
  const [notFound, setNotFound] = useState(false);
  const buttonText = (field as { buttonText?: string }).buttonText ?? "Verify";

  const verify = async () => {
    await new Promise((r) => setTimeout(r, 400));
    const fullName = registry[input];
    setNotFound(!fullName);
    f.onChange(fullName ? { personalNumber: input, fullName } : undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          ref={f.ref}
          id={id}
          {...aria}
          value={input}
          inputMode="numeric"
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => {
            setInput(e.target.value);
            setNotFound(false);
            f.onChange(undefined); // a changed number must be verified again
          }}
          onBlur={f.onBlur}
          className={hasError ? classNames.inputError : classNames.input}
        />
        <button type="button" onClick={verify} disabled={disabled || readOnly} className={classNames.buttonSecondary}>
          {buttonText}
        </button>
      </div>
      {person && <p className="text-sm text-green-700">✓ {person.fullName}</p>}
      {notFound && <p className={classNames.error}>No person with this personal number</p>}
    </div>
  );
}

type Option = { label: string; value: string };

/** A `custom` field: a select whose options come from `field.endpoint` (GET → [{ label, value }]) */
function RemoteSelect({ field, name, control, id, aria, classNames, messages, hasError, disabled, readOnly }: FieldComponentProps) {
  const { field: f } = useController({ control, name });
  const endpoint = (field as { endpoint?: string }).endpoint;
  const [options, setOptions] = useState<Option[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    setStatus("loading");
    fetch(endpoint, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Option[]>;
      })
      .then((data) => {
        setOptions(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [endpoint, attempt]);

  if (status === "error") {
    return (
      <div className="flex items-center gap-2">
        <p className={classNames.error}>Could not load options</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className={classNames.buttonSecondary}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <select
      ref={f.ref}
      id={id}
      {...aria}
      value={typeof f.value === "string" ? f.value : ""}
      onChange={(e) => f.onChange(e.target.value)}
      onBlur={f.onBlur}
      disabled={disabled || readOnly || status === "loading"}
      className={hasError ? classNames.inputError : classNames.input}
    >
      <option value="" disabled>
        {status === "loading" ? "Loading…" : (field.placeholder ?? messages.selectPlaceholder)}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// stands in for a POST to your upload endpoint; reports fake progress
const uploadFile: UploadFile = async (file, _field, { onProgress }) => {
  for (const step of [0.25, 0.5, 0.75, 1]) {
    await new Promise((r) => setTimeout(r, 150));
    onProgress(step);
  }
  return { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type };
};

export function FarmForm(props: Omit<FormBuilderProps, "components" | "uploadFile">) {
  return (
    <FormBuilder
      {...props}
      uploadFile={uploadFile}
      components={{ custom: { verifyPerson: VerifyPerson, remoteSelect: RemoteSelect } }}
    />
  );
}
