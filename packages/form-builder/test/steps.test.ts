import { describe, expect, it } from "vitest";
import type { FieldSchema } from "../src";
import {
  flattenSteps,
  indexByName,
  isStepVisible,
  parseFormSchema,
  validateFormValues,
} from "../src";
import jobApplication from "./fixtures/job-application.json";

const form = parseFormSchema("job-application", jobApplication);
const fields = flattenSteps(form);
const byName = indexByName(fields);
const business = form.steps.find((s) => s.id === "business")!;

const base = {
  fullName: "Ann Lee",
  email: "ann@example.com",
  phone: "+995555123456",
  age: "30",
  country: "de",
  agreeToTerms: true,
};

const field = (extra: Partial<FieldSchema>) => ({ name: "a", label: "A", type: "text", ...extra });

describe("steps", () => {
  it("shows a conditional step only when its condition matches", () => {
    expect(isStepVisible(business, { employmentStatus: "student" }, byName)).toBe(false);
    expect(isStepVisible(business, { employmentStatus: "self-employed" }, byName)).toBe(true);
  });

  it("validates fields of a visible conditional step", () => {
    const result = validateFormValues(form, {
      ...base,
      employmentStatus: "self-employed",
      companyName: "Acme",
      yearsOfExperience: "2",
    });
    expect(result).toEqual({
      success: false,
      fieldErrors: { hasWebsite: "Does your business have a website? is required" },
    });
  });

  it("skips and drops fields of a hidden step", () => {
    const result = validateFormValues(form, {
      ...base,
      employmentStatus: "unemployed",
      hasWebsite: "yes",
      websiteUrl: "nope",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty("hasWebsite");
  });

  it("merges a step condition with a field's own condition", () => {
    const websiteUrl = byName.websiteUrl;
    expect(websiteUrl.showWhen).toEqual([
      { field: "employmentStatus", equals: "self-employed" },
      { field: "hasWebsite", equals: "yes" },
    ]);
  });

  it("treats a plain field array as one step", () => {
    const single = parseFormSchema("t", [field({})]);
    expect(single.steps).toHaveLength(1);
    expect(single.steps[0].fields[0].name).toBe("a");
  });
});

describe("parseFormSchema steps", () => {
  const step = (id: string, fields: object[], extra: object = {}) => ({
    id,
    title: id,
    fields,
    ...extra,
  });

  it("rejects duplicate step ids", () => {
    expect(() =>
      parseFormSchema("t", { steps: [step("s", [field({ name: "a" })]), step("s", [field({ name: "b" })])] })
    ).toThrow(/Duplicate step id/);
  });

  it("rejects duplicate field names across steps", () => {
    expect(() =>
      parseFormSchema("t", { steps: [step("s1", [field({})]), step("s2", [field({})])] })
    ).toThrow(/Duplicate field name/);
  });

  it("requires titles when there are several steps", () => {
    expect(() =>
      parseFormSchema("t", {
        steps: [{ id: "s1", fields: [field({ name: "a" })] }, step("s2", [field({ name: "b" })])],
      })
    ).toThrow(/needs a title/);
  });

  it("rejects a field depending on a later step", () => {
    expect(() =>
      parseFormSchema("t", {
        steps: [
          step("s1", [field({ name: "a", showWhen: { field: "b", equals: "x" } })]),
          step("s2", [field({ name: "b" })]),
        ],
      })
    ).toThrow(/from a later step/);
  });

  it("rejects a step depending on its own fields", () => {
    expect(() =>
      parseFormSchema("t", {
        steps: [step("s1", [field({ name: "a" })], { showWhen: { field: "a", equals: "x" } })],
      })
    ).toThrow(/earlier step/);
  });

  it("rejects steps without fields", () => {
    expect(() => parseFormSchema("t", { steps: [step("s1", [])] })).toThrow();
  });
});
