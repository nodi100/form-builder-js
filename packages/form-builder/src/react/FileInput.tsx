import { useEffect, useState, type ChangeEvent } from "react";
import { useController } from "react-hook-form";
import type { UploadedFile } from "../core/types";
import { formatMessage } from "../core/messages";
import { devWarn, useFormBuilder } from "./context";
import type { FieldComponentProps } from "./types";

type Pending = { key: number; name: string; progress?: number };

let nextKey = 0;

/** Does the file match an `accept` string like ".pdf,image/*,application/zip"? */
export function matchesAccept(file: { name: string; type: string }, accept: string) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) =>
      rule.startsWith(".")
        ? name.endsWith(rule)
        : rule.endsWith("/*")
          ? type.startsWith(rule.slice(0, -1))
          : type === rule
    );
}

function toFiles(value: unknown): UploadedFile[] {
  if (Array.isArray(value)) return value as UploadedFile[];
  return value ? [value as UploadedFile] : [];
}

/**
 * Built-in file input. Each chosen file is checked against `accept` and
 * `maxSizeMb`, then uploaded right away with the `uploadFile` prop of
 * <FormBuilder>; the field's value is what `uploadFile` resolves with.
 */
export function FileInput({ field, name, id, control, aria, classNames, messages, disabled, readOnly }: FieldComponentProps) {
  const { uploadFile, trackUpload, setValue, getValues } = useFormBuilder();
  const { field: controller } = useController({ control, name });
  const files = toFiles(controller.value);
  const [pending, setPending] = useState<Pending[]>([]);
  const [uploadError, setUploadError] = useState<string>();
  const editable = !disabled && !readOnly;

  useEffect(() => {
    if (!uploadFile) {
      devWarn(
        `File field "${field.name}" is disabled: pass an uploadFile function to <FormBuilder> to upload files.`
      );
    }
  }, [uploadFile, field.name]);

  const update = (next: UploadedFile[]) =>
    setValue(name, field.multiple ? next : next[0], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

  const upload = async (file: File) => {
    const item: Pending = { key: nextKey++, name: file.name };
    setPending((p) => [...p, item]);
    trackUpload(1);
    try {
      const uploaded = await uploadFile!(file, field, {
        onProgress: (progress) =>
          setPending((p) => p.map((x) => (x.key === item.key ? { ...x, progress } : x))),
      });
      // read the value now, not when the upload started: other uploads may have finished meanwhile
      update(field.multiple ? [...toFiles(getValues(name)), uploaded] : [uploaded]);
    } catch {
      setUploadError(formatMessage(messages.uploadFailed, { name: file.name }));
    } finally {
      setPending((p) => p.filter((x) => x.key !== item.key));
      trackUpload(-1);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = ""; // so choosing the same file again fires onChange
    setUploadError(undefined);
    if (!uploadFile || !chosen.length) return;

    const selected = field.multiple ? chosen : chosen.slice(0, 1);
    for (const file of selected) {
      if (field.maxSizeMb !== undefined && file.size > field.maxSizeMb * 1024 * 1024) {
        setUploadError(formatMessage(messages.fileTooLarge, { name: file.name, max: field.maxSizeMb }));
        return;
      }
      if (field.accept && !matchesAccept(file, field.accept)) {
        setUploadError(formatMessage(messages.fileType, { name: file.name }));
        return;
      }
    }
    selected.forEach((file) => void upload(file));
  };

  const remove = (id: string) => update(files.filter((f) => f.id !== id));

  // a single-file field hides the input while it holds (or uploads) a file:
  // remove the file to choose another
  const showInput = editable && (field.multiple || (!files.length && !pending.length));

  return (
    <div className={classNames.file}>
      {showInput && (
        <input
          ref={controller.ref}
          type="file"
          {...aria}
          id={id}
          name={name}
          accept={field.accept}
          multiple={field.multiple}
          disabled={!uploadFile}
          onChange={onChange}
          onBlur={controller.onBlur}
          className={classNames.fileInput}
        />
      )}

      {(files.length > 0 || pending.length > 0) && (
        <ul className={classNames.fileList}>
          {files.map((file) => (
            <li key={file.id} className={classNames.fileItem}>
              <span className={classNames.fileName}>{file.name}</span>
              {editable && (
                <button
                  type="button"
                  onClick={() => remove(file.id)}
                  aria-label={`${messages.remove}: ${file.name}`}
                  className={classNames.fileRemove}
                >
                  {messages.remove}
                </button>
              )}
            </li>
          ))}
          {pending.map((item) => (
            <li key={item.key} aria-busy="true" className={classNames.fileItem}>
              <span className={classNames.fileName}>
                {formatMessage(messages.uploading, { name: item.name })}
              </span>
              {item.progress !== undefined && (
                <progress value={item.progress} max={1} className={classNames.fileProgress} />
              )}
            </li>
          ))}
        </ul>
      )}

      {uploadError && (
        <p role="alert" className={classNames.error}>
          {uploadError}
        </p>
      )}
    </div>
  );
}
