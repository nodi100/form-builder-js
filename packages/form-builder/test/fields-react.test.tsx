// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useController } from "react-hook-form";
import { parseFormSchema, todayIso, type SubmitResult } from "../src";
import { FormBuilder, type FieldComponentProps } from "../src/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ok = async (): Promise<SubmitResult> => ({ success: true });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }));

const sectionsForm = parseFormSchema("sections", {
  layout: "sections",
  steps: [
    {
      id: "legal",
      title: "1. Legal address",
      description: "As registered",
      fields: [
        { name: "legalAddress", label: "Legal address", type: "text", isRequired: true, width: "half" },
        { name: "same", label: "Actual address is the same", type: "checkbox", width: "half" },
      ],
    },
    {
      id: "actual",
      title: "2. Actual address",
      showWhen: { field: "same", notEquals: true },
      fields: [{ name: "actualAddress", label: "Actual address", type: "text", isRequired: true }],
    },
    {
      id: "terms",
      title: "3. Terms",
      fields: [{ name: "fee", type: "info", label: "Fee", text: "20 GEL" }],
    },
  ],
});

describe("layout: sections", () => {
  it("renders every section on one page with a single Submit", async () => {
    const onSubmit = vi.fn(ok);
    render(<FormBuilder form={sectionsForm} onSubmit={onSubmit} />);

    expect(screen.getByRole("group", { name: "1. Legal address" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "2. Actual address" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "3. Terms" })).toBeTruthy();
    expect(screen.getByText("As registered")).toBeTruthy();
    expect(screen.getByText("20 GEL")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);

    // checking "same" hides the whole second section
    fireEvent.click(screen.getByLabelText("Actual address is the same"));
    expect(screen.queryByRole("group", { name: "2. Actual address" })).toBeNull();

    fireEvent.change(screen.getByLabelText(/^Legal address/), { target: { value: "Tbilisi" } });
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ legalAddress: "Tbilisi", same: true }));
  });

  it("puts half-width fields in the grid", () => {
    render(<FormBuilder form={sectionsForm} onSubmit={ok} classNames={{ fieldHalf: "half", fieldFull: "full" }} />);
    const field = screen.getByLabelText(/^Legal address/).parentElement!;
    expect(field.className).toContain("half");
    expect(screen.getByLabelText(/Actual address \*/).parentElement!.className).toContain("full");
  });

  it("focuses the first invalid field, in page order, after server errors", async () => {
    const onSubmit = vi.fn(async (): Promise<SubmitResult> => ({
      success: false,
      fieldErrors: { actualAddress: "Not found", legalAddress: "Not in registry", ghost: "Hidden problem" },
    }));
    render(<FormBuilder form={sectionsForm} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/^Legal address/), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText(/Actual address \*/), { target: { value: "y" } });
    submit();

    expect(await screen.findByText("Not in registry")).toBeTruthy();
    expect(screen.getByText("Not found")).toBeTruthy();
    // an error without a visible field goes to the status line
    expect(screen.getByText("Hidden problem")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/^Legal address/)));
  });
});

describe("field options", () => {
  const form = parseFormSchema("opts", [
    { name: "pn", label: "Personal number", type: "text", readOnly: true, description: "11 digits" },
    { name: "region", label: "Region", type: "select", readOnly: true, options: [{ label: "Kakheti", value: "kakheti" }, { label: "Imereti", value: "imereti" }] },
    { name: "count", label: "Count", type: "number", defaultValue: 3 },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "born", label: "Born", type: "date", validation: { max: "today" } },
  ]);

  it("applies defaultValue and defaultValues, and submits read-only values", async () => {
    const onSubmit = vi.fn(ok);
    render(<FormBuilder form={form} onSubmit={onSubmit} defaultValues={{ pn: "01001012345", region: "imereti" }} />);

    const pn = screen.getByLabelText("Personal number") as HTMLInputElement;
    expect(pn.value).toBe("01001012345");
    expect(pn.readOnly).toBe(true);
    expect((screen.getByLabelText("Region") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("Count") as HTMLInputElement).value).toBe("3");
    expect((screen.getByLabelText("Phone") as HTMLInputElement).type).toBe("tel");
    expect((screen.getByLabelText("Born") as HTMLInputElement).max).toBe(todayIso());

    submit();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ pn: "01001012345", region: "imereti", count: 3 })
    );
  });

  it("links the description with aria-describedby", () => {
    render(<FormBuilder form={form} onSubmit={ok} />);
    const pn = screen.getByLabelText("Personal number");
    expect(pn.getAttribute("aria-describedby")).toBe("pn-description");
    expect(document.getElementById("pn-description")!.textContent).toBe("11 digits");
  });

  it("renders a disabled form without Submit", () => {
    render(<FormBuilder form={form} onSubmit={ok} disabled defaultValues={{ phone: "555" }} />);
    expect((screen.getByLabelText("Phone") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Phone") as HTMLInputElement).value).toBe("555");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("file fields", () => {
  const form = parseFormSchema("files", [
    { name: "doc", label: "Document", type: "file", isRequired: true, accept: ".pdf", maxSizeMb: 1 },
    { name: "photos", label: "Photos", type: "file", multiple: true },
  ]);
  const pdf = (name = "doc.pdf", size = 100) => new File([new Uint8Array(size)], name, { type: "application/pdf" });

  it("uploads on choose, shows pending state, and submits the returned object", async () => {
    let finish!: () => void;
    const uploadFile = vi.fn(
      (file: File, _field: unknown, { onProgress }: { onProgress: (n: number) => void }) =>
        new Promise<{ id: string; name: string }>((resolve) => {
          onProgress(0.5);
          finish = () => resolve({ id: "u-1", name: file.name });
        })
    );
    const onSubmit = vi.fn(ok);
    render(<FormBuilder form={form} onSubmit={onSubmit} uploadFile={uploadFile} />);

    fireEvent.change(screen.getByLabelText(/Document/), { target: { files: [pdf()] } });
    expect(await screen.findByText("Uploading doc.pdf...")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(true);
    expect(uploadFile.mock.calls[0][1]).toMatchObject({ name: "doc" });

    await act(async () => finish());
    expect(await screen.findByText("doc.pdf")).toBeTruthy();
    // single-file field: input hidden until the file is removed
    expect(screen.queryByLabelText(/Document/)).toBeNull();

    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ doc: { id: "u-1", name: "doc.pdf" } }));
  });

  it("checks size and type before uploading, and can remove files", async () => {
    let n = 0;
    const uploadFile = vi.fn(async (file: File) => ({ id: `u-${++n}`, name: file.name }));
    render(<FormBuilder form={form} onSubmit={ok} uploadFile={uploadFile} />);

    fireEvent.change(screen.getByLabelText(/Document/), { target: { files: [pdf("big.pdf", 2 * 1024 * 1024)] } });
    expect(await screen.findByText("big.pdf is larger than 1 MB")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Document/), { target: { files: [new File(["x"], "a.exe")] } });
    expect(await screen.findByText("a.exe is not an allowed file type")).toBeTruthy();
    expect(uploadFile).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Photos"), { target: { files: [pdf("1.pdf"), pdf("2.pdf")] } });
    expect(await screen.findByText("1.pdf")).toBeTruthy();
    expect(await screen.findByText("2.pdf")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove: 1.pdf" }));
    expect(screen.queryByText("1.pdf")).toBeNull();
    expect(screen.getByText("2.pdf")).toBeTruthy();
  });

  it("shows uploadFailed when the upload throws", async () => {
    const uploadFile = vi.fn(async () => {
      throw new Error("503");
    });
    render(<FormBuilder form={form} onSubmit={ok} uploadFile={uploadFile} />);
    fireEvent.change(screen.getByLabelText(/Document/), { target: { files: [pdf()] } });
    expect(await screen.findByText("doc.pdf could not be uploaded. Please try again.")).toBeTruthy();
  });

  it("is disabled with a warning without uploadFile", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<FormBuilder form={form} onSubmit={ok} />);
    expect((screen.getByLabelText(/Document/) as HTMLInputElement).disabled).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('File field "doc" is disabled'));
  });
});

describe("custom fields", () => {
  const form = parseFormSchema("custom", [
    { name: "person", label: "Person", type: "custom", component: "verifyPerson", isRequired: true, buttonText: "Verify" },
  ]);

  function VerifyPerson({ field, name, control, id, aria }: FieldComponentProps) {
    const { field: f } = useController({ control, name });
    return (
      <button
        type="button"
        id={id}
        {...aria}
        onClick={() => f.onChange({ personalNumber: "01001012345", fullName: "Nino" })}
      >
        {(field as { buttonText?: string }).buttonText}
      </button>
    );
  }

  it("renders the component from components.custom with the extra props", async () => {
    const onSubmit = vi.fn(ok);
    render(<FormBuilder form={form} onSubmit={onSubmit} components={{ custom: { verifyPerson: VerifyPerson } }} />);

    submit();
    expect(await screen.findByText("Person is required")).toBeTruthy();

    fireEvent.click(screen.getByText("Verify"));
    submit();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ person: { personalNumber: "01001012345", fullName: "Nino" } })
    );
  });

  it("runs client customValidators", async () => {
    const onSubmit = vi.fn(ok);
    render(
      <FormBuilder
        form={form}
        onSubmit={onSubmit}
        components={{ custom: { verifyPerson: VerifyPerson } }}
        customValidators={{ verifyPerson: () => "Not verified" }}
      />
    );
    fireEvent.click(screen.getByText("Verify"));
    submit();
    expect(await screen.findByText("Not verified")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("warns when the component is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<FormBuilder form={form} onSubmit={ok} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No component for custom field "person"'));
  });
});

describe("array fields", () => {
  const form = parseFormSchema("array", [
    {
      name: "personnel",
      label: "Personnel",
      type: "array",
      minItems: 1,
      maxItems: 2,
      addLabel: "Add person",
      removeLabel: "Delete",
      fields: [
        { name: "fullName", label: "Full name", type: "text", isRequired: true, width: "half" },
        { name: "role", label: "Role", type: "select", isRequired: true, width: "half", options: [{ label: "Vet", value: "vet" }, { label: "Other", value: "other" }] },
        { name: "roleOther", label: "Which role", type: "text", isRequired: true, showWhen: { field: "role", equals: "other" } },
      ],
    },
  ]);
  const row = (n: number) => within(screen.getByRole("group", { name: `Personnel #${n}` }));

  it("starts with minItems rows, adds and removes rows within the limits", async () => {
    render(<FormBuilder form={form} onSubmit={ok} />);
    expect(screen.getAllByRole("group", { name: /Personnel #/ })).toHaveLength(1);
    expect((row(1).getByRole("button", { name: /Delete/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    expect(screen.getAllByRole("group", { name: /Personnel #/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Add person" })).toBeNull();

    fireEvent.click(row(2).getByRole("button", { name: /Delete/ }));
    expect(screen.getAllByRole("group", { name: /Personnel #/ })).toHaveLength(1);
  });

  it("shows sibling-dependent fields per row and submits clean rows", async () => {
    const onSubmit = vi.fn(ok);
    render(<FormBuilder form={form} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Add person" }));

    fireEvent.change(row(1).getByLabelText(/Full name/), { target: { value: "Nino" } });
    fireEvent.change(row(1).getByLabelText(/Role/), { target: { value: "vet" } });
    fireEvent.change(row(2).getByLabelText(/Full name/), { target: { value: "Giorgi" } });
    fireEvent.change(row(2).getByLabelText(/Role/), { target: { value: "other" } });

    expect(row(1).queryByLabelText(/Which role/)).toBeNull();
    expect(row(2).getByLabelText(/Which role/)).toBeTruthy();

    submit();
    expect(await row(2).findByText("Which role is required")).toBeTruthy();
    expect(row(1).queryByText(/required/)).toBeNull();

    fireEvent.change(row(2).getByLabelText(/Which role/), { target: { value: "Cook" } });
    submit();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        personnel: [
          { fullName: "Nino", role: "vet" },
          { fullName: "Giorgi", role: "other", roleOther: "Cook" },
        ],
      })
    );
  });

  it("doesn't flag a row added after a failed submit, and moves errors along on remove", async () => {
    render(<FormBuilder form={form} onSubmit={ok} />);
    submit();
    expect(await row(1).findByText("Full name is required")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    await act(async () => {});
    expect(row(2).queryByText(/required/)).toBeNull();

    fireEvent.click(row(1).getByRole("button", { name: /Delete/ }));
    await act(async () => {});
    expect(screen.queryByText(/required/)).toBeNull();
  });

  it("clears a server minItems / maxItems error when rows change", async () => {
    const onSubmit = vi.fn(async (): Promise<SubmitResult> => ({
      success: false,
      fieldErrors: { personnel: "Add one more vet" },
    }));
    render(<FormBuilder form={form} onSubmit={onSubmit} defaultValues={{ personnel: [{ fullName: "X", role: "vet" }] }} />);
    submit();
    expect(await screen.findByText("Add one more vet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    await waitFor(() => expect(screen.queryByText("Add one more vet")).toBeNull());
  });

  it("shows nested server errors under the right row field", async () => {
    const onSubmit = vi.fn(async (): Promise<SubmitResult> => ({
      success: false,
      fieldErrors: { "personnel.0.fullName": "Person not found in registry" },
    }));
    render(<FormBuilder form={form} onSubmit={onSubmit} defaultValues={{ personnel: [{ fullName: "X", role: "vet" }] }} />);
    expect((row(1).getByLabelText(/Full name/) as HTMLInputElement).value).toBe("X");
    submit();
    expect(await row(1).findByText("Person not found in registry")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(row(1).getByLabelText(/Full name/)));
  });
});

describe("wizard layout still works with new field types", () => {
  it("validates a date step before Next", async () => {
    const form = parseFormSchema("wiz", {
      steps: [
        { id: "a", title: "A", fields: [{ name: "d", label: "Date", type: "date", isRequired: true }] },
        { id: "b", title: "B", fields: [{ name: "i", type: "info", text: "Done" }] },
      ],
    });
    const onSubmit = vi.fn(ok);
    render(<FormBuilder form={form} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Date is required")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Date/), { target: { value: "2020-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Done")).toBeTruthy();
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ d: "2020-01-01" }));
  });
});
