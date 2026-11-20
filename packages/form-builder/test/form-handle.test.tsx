// @vitest-environment jsdom
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { parseFormSchema } from "../src";
import { FormBuilder, type FormBuilderHandle } from "../src/react";

afterEach(cleanup);

const form = parseFormSchema("checklist", {
  layout: "sections",
  steps: [
    {
      id: "vehicle",
      title: "Vehicle",
      fields: [
        { name: "plate", label: "Plate", type: "text", isRequired: true },
        { name: "volume", label: "Volume", type: "number", suffix: "m³" },
      ],
    },
    {
      id: "media",
      title: "Media",
      fields: [
        {
          name: "media",
          label: "Photo / video",
          type: "checkboxes",
          isRequired: true,
          options: [
            { label: "Photos taken", value: "photo" },
            { label: "Video taken", value: "video" },
            { label: "None", value: "none", exclusive: true },
          ],
        },
        {
          name: "photoNote",
          label: "Photo note",
          type: "text",
          showWhen: { field: "media", contains: "photo" },
        },
      ],
    },
  ],
});

const box = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;

describe("checkboxes input", () => {
  it("ticks several options, and an exclusive one clears the rest", () => {
    render(<FormBuilder form={form} hideActions />);

    expect(screen.getByRole("group", { name: /Photo \/ video/ })).toBeTruthy();
    fireEvent.click(box("Photos taken"));
    fireEvent.click(box("Video taken"));
    expect([box("Photos taken").checked, box("Video taken").checked]).toEqual([true, true]);
    expect(screen.getByLabelText("Photo note")).toBeTruthy();

    fireEvent.click(box("None"));
    expect([box("Photos taken").checked, box("Video taken").checked, box("None").checked]).toEqual([
      false,
      false,
      true,
    ]);
    expect(screen.queryByLabelText("Photo note")).toBeNull();

    fireEvent.click(box("Video taken"));
    expect([box("Video taken").checked, box("None").checked]).toEqual([true, false]);
  });

  it("shows the suffix next to the input", () => {
    render(<FormBuilder form={form} hideActions />);
    const input = screen.getByLabelText("Volume");
    expect(screen.getByText("m³").id).toBe("volume-suffix");
    expect(input.getAttribute("aria-describedby")).toContain("volume-suffix");
  });
});

describe("hideActions and onSubmit", () => {
  it("renders a <div> with no buttons", () => {
    const { container } = render(<FormBuilder form={form} hideActions onSubmit={async () => ({ success: true })} />);
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("warns when a wizard hides its Next button", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const wizard = parseFormSchema("wizard", {
      steps: [
        { id: "a", title: "A", fields: [{ name: "a", label: "A", type: "text" }] },
        { id: "b", title: "B", fields: [{ name: "b", label: "B", type: "text" }] },
      ],
    });

    render(<FormBuilder form={form} hideActions />);
    expect(warn).not.toHaveBeenCalled();
    render(<FormBuilder form={wizard} hideActions />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("hideActions removes the Next button"));
    warn.mockRestore();
  });

  it("has no Submit button without onSubmit", () => {
    const { container } = render(<FormBuilder form={form} />);
    expect(container.querySelector("form")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();
  });
});

describe("ref", () => {
  it("getValues returns the visible values without validating", () => {
    const ref = createRef<FormBuilderHandle>();
    render(<FormBuilder ref={ref} form={form} hideActions />);

    fireEvent.change(screen.getByLabelText(/Plate/), { target: { value: " AA-1 " } });
    fireEvent.click(box("None"));
    expect(ref.current!.getValues()).toEqual({ plate: " AA-1 ", volume: "", media: ["none"] });
    expect(screen.queryByText("Plate is required")).toBeNull();
  });

  it("validate shows the errors and resolves with them, then with the clean data", async () => {
    const ref = createRef<FormBuilderHandle>();
    render(<FormBuilder ref={ref} form={form} hideActions />);

    let result = await act(() => ref.current!.validate());
    expect(result).toEqual({
      success: false,
      fieldErrors: { plate: "Plate is required", media: "Photo / video is required" },
    });
    expect(await screen.findByText("Plate is required")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Plate/)));

    fireEvent.change(screen.getByLabelText(/Plate/), { target: { value: " AA-1 " } });
    fireEvent.click(box("Photos taken"));
    await waitFor(() => expect(screen.queryByText("Photo / video is required")).toBeNull());

    result = await act(() => ref.current!.validate());
    expect(result).toEqual({ success: true, data: { plate: "AA-1", media: ["photo"] } });
  });

  it("reset replaces the values", async () => {
    const ref = createRef<FormBuilderHandle>();
    render(<FormBuilder ref={ref} form={form} hideActions />);
    act(() => ref.current!.reset({ plate: "BB-2", media: ["video"] }));
    expect((screen.getByLabelText(/Plate/) as HTMLInputElement).value).toBe("BB-2");
    expect(box("Video taken").checked).toBe(true);
  });
});

describe("onValuesChange", () => {
  it("reports the values and validity on mount and on every change", async () => {
    const onValuesChange = vi.fn();
    render(
      <FormBuilder
        form={form}
        hideActions
        defaultValues={{ plate: "AA-1" }}
        onValuesChange={onValuesChange}
      />
    );

    expect(onValuesChange).toHaveBeenLastCalledWith(
      { plate: "AA-1", volume: "", media: [] },
      { isValid: false }
    );

    fireEvent.click(box("Photos taken"));
    await waitFor(() =>
      expect(onValuesChange).toHaveBeenLastCalledWith(
        { plate: "AA-1", volume: "", media: ["photo"] },
        { isValid: true }
      )
    );

    // the reported object is a copy
    onValuesChange.mock.lastCall![0].media.push("video");
    expect(box("Video taken").checked).toBe(false);
  });

  it("isValid read later still reflects the change it was reported with", async () => {
    const infos: { isValid: boolean }[] = [];
    render(
      <FormBuilder
        form={form}
        hideActions
        defaultValues={{ plate: "AA-1" }}
        onValuesChange={(_values, info) => infos.push(info)}
      />
    );

    fireEvent.click(box("Photos taken"));
    fireEvent.click(box("Photos taken"));
    await waitFor(() => expect(infos.length).toBeGreaterThanOrEqual(3));
    // read only now: ticked (valid), then unticked again (invalid)
    expect(infos.slice(-2).map((info) => info.isValid)).toEqual([true, false]);
  });
});
