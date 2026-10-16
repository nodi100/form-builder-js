// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { parseFormSchema } from "../src";
import { FormBuilder, type FieldComponentProps, type StepperProps } from "../src/react";

afterEach(cleanup);

const form = parseFormSchema("t", {
  steps: [
    {
      id: "one",
      title: "Step one",
      fields: [{ name: "name", label: "Name", type: "text", isRequired: true }],
    },
    {
      id: "two",
      title: "Step two",
      fields: [{ name: "agree", label: "Agree", type: "checkbox", isRequired: true }],
    },
  ],
});

function CustomText({ id, register, aria }: FieldComponentProps) {
  return <input data-testid="custom" id={id} {...register} {...aria} />;
}

describe("<FormBuilder>", () => {
  it("uses custom components and messages, and blocks Next until the step is valid", async () => {
    const onSubmit = vi.fn(async () => ({ success: true as const }));
    render(
      <FormBuilder
        form={form}
        onSubmit={onSubmit}
        components={{ text: CustomText }}
        messages={{ next: "შემდეგი", required: "{label} სავალდებულოა", submit: "გაგზავნა" }}
      />
    );

    expect(screen.getByTestId("custom")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "შემდეგი" }));
    expect(await screen.findByText("Name სავალდებულოა")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Step one" })).toBeTruthy();

    fireEvent.change(screen.getByTestId("custom"), { target: { value: "Ann" } });
    fireEvent.click(screen.getByRole("button", { name: "შემდეგი" }));
    expect(await screen.findByRole("heading", { name: "Step two" })).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/Agree/));
    fireEvent.click(screen.getByRole("button", { name: "გაგზავნა" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Ann", agree: true }));
  });

  it("replaces a class slot", () => {
    render(
      <FormBuilder
        form={form}
        onSubmit={async () => ({ success: true })}
        classNames={{ button: "my-button" }}
      />
    );
    expect(screen.getByRole("button", { name: "Next" }).className).toBe("my-button");
  });

  it("uses a custom stepper", async () => {
    function CustomStepper({ items, onSelect }: StepperProps) {
      return (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                data-testid={`step-${item.id}`}
                data-status={item.status}
                disabled={!item.reachable}
                onClick={() => onSelect(item.index)}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      );
    }

    render(<FormBuilder form={form} onSubmit={async () => ({ success: true })} stepper={CustomStepper} />);

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByTestId("step-one").dataset.status).toBe("current");
    expect(screen.getByTestId("step-two").dataset.status).toBe("upcoming");
    expect((screen.getByTestId("step-two") as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Ann" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("heading", { name: "Step two" })).toBeTruthy();
    expect(screen.getByTestId("step-one").dataset.status).toBe("complete");
    expect(screen.getByTestId("step-two").dataset.status).toBe("current");

    fireEvent.click(screen.getByTestId("step-one"));
    expect(await screen.findByRole("heading", { name: "Step one" })).toBeTruthy();
    expect((screen.getByTestId("step-two") as HTMLButtonElement).disabled).toBe(false);
  });
});
