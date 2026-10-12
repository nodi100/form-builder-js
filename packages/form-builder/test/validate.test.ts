import { describe, expect, it } from "vitest";
import type { FieldSchema } from "../src";
import { formatMessage, parseFormSchema, validateFormValues } from "../src";
import jobApplication from "./fixtures/job-application.json";

const schema = parseFormSchema("job-application", jobApplication);

const base = {
  fullName: "Ann Lee",
  email: "ann@example.com",
  phone: "+995555123456",
  age: "30",
  country: "de",
  employmentStatus: "unemployed",
  agreeToTerms: true,
};

describe("validateFormValues", () => {
  it("accepts a valid submission and parses numbers", () => {
    const result = validateFormValues(schema, base);
    expect(result).toEqual({ success: true, data: { ...base, age: 30 } });
  });

  it("treats whitespace-only text as empty for required fields", () => {
    const result = validateFormValues(schema, {
      ...base,
      employmentStatus: "employed",
      companyName: "Acme",
      yearsOfExperience: "3",
      position: "   ",
    });
    expect(result).toEqual({
      success: false,
      fieldErrors: { position: "Current position is required" },
    });
  });

  it("trims text values", () => {
    const result = validateFormValues(schema, { ...base, fullName: "  Ann Lee  " });
    expect(result.success && result.data.fullName).toBe("Ann Lee");
  });

  it("ignores invalid values in hidden fields and drops them", () => {
    const result = validateFormValues(schema, {
      ...base,
      employmentStatus: "student",
      university: "TSU",
      websiteUrl: "nope",
      companyName: "x",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty("websiteUrl");
    expect(result.success && result.data).not.toHaveProperty("companyName");
  });

  it("hides a whole chain when an ancestor hides it", () => {
    const result = validateFormValues(schema, {
      ...base,
      employmentStatus: "student",
      university: "TSU",
      hasWebsite: "yes",
    });
    expect(result.success).toBe(true);
  });

  it("rejects decimals for integer fields", () => {
    const result = validateFormValues(schema, { ...base, age: "25.5" });
    expect(result).toEqual({
      success: false,
      fieldErrors: { age: "Age must be a whole number" },
    });
  });

  it("requires a checked checkbox when the checkbox is required", () => {
    const result = validateFormValues(schema, { ...base, agreeToTerms: false });
    expect(result.success).toBe(false);
    expect(!result.success && result.fieldErrors.agreeToTerms).toBeDefined();
  });

  it("rejects options that are not in the schema", () => {
    const result = validateFormValues(schema, { ...base, country: "xx" });
    expect(!result.success && result.fieldErrors.country).toBe("Invalid option");
  });

  it("returns a form-level error for non-object input", () => {
    const result = validateFormValues(schema, null);
    expect(!result.success && result.fieldErrors._form).toBeDefined();
  });

  it("uses custom messages", () => {
    const result = validateFormValues(
      schema,
      { ...base, fullName: "", age: "25.5" },
      { messages: { required: "{label} სავალდებულოა", notAnInteger: "{label}: მთელი რიცხვი" } }
    );
    expect(result).toEqual({
      success: false,
      fieldErrors: { fullName: "Full name სავალდებულოა", age: "Age: მთელი რიცხვი" },
    });
  });
});

describe("formatMessage", () => {
  it("fills placeholders and keeps unknown ones", () => {
    expect(formatMessage("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
});

describe("parseFormSchema", () => {
  const field = (extra: Partial<FieldSchema>) => ({ name: "a", label: "A", type: "text", ...extra });

  it("rejects duplicate names", () => {
    expect(() => parseFormSchema("t", [field({}), field({})])).toThrow(/Duplicate field name/);
  });

  it("rejects showWhen pointing at an unknown field", () => {
    expect(() =>
      parseFormSchema("t", [field({ showWhen: { field: "missing", equals: "x" } })])
    ).toThrow(/unknown field "missing"/);
  });

  it("rejects select without options", () => {
    expect(() => parseFormSchema("t", [field({ type: "select" })])).toThrow(/needs options/);
  });

  it("rejects an invalid regex", () => {
    expect(() =>
      parseFormSchema("t", [field({ validation: { pattern: "(" } })])
    ).toThrow(/Invalid regex/);
  });

  it("rejects unknown keys (typos)", () => {
    expect(() => parseFormSchema("t", [{ ...field({}), isrequired: true }])).toThrow();
  });
});
