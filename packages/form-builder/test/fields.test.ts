import { describe, expect, it } from "vitest";
import {
  buildDefaultValues,
  buildZodSchema,
  conditionMatches,
  flattenSteps,
  indexByName,
  isFieldVisible,
  parseFormSchema,
  todayIso,
  validateFormValues,
} from "../src";

const parse = (json: unknown) => parseFormSchema("t", json);
const text = (name: string, extra: object = {}) => ({ name, label: name, type: "text", ...extra });

/** client-side parse of the same values, for client/server parity checks */
function clientParse(form: ReturnType<typeof parse>, values: unknown) {
  return buildZodSchema(flattenSteps(form)).safeParse(values);
}

describe("conditions", () => {
  it("matches equals, notEquals and notEmpty", () => {
    expect(conditionMatches({ field: "a", equals: "x" }, "x")).toBe(true);
    expect(conditionMatches({ field: "a", equals: ["x", "y"] }, "y")).toBe(true);
    expect(conditionMatches({ field: "a", notEquals: "x" }, "x")).toBe(false);
    expect(conditionMatches({ field: "a", notEquals: ["x", "y"] }, "z")).toBe(true);
    expect(conditionMatches({ field: "a", notEquals: "x" }, undefined)).toBe(true);
    expect(conditionMatches({ field: "a", notEmpty: true }, "  ")).toBe(false);
    expect(conditionMatches({ field: "a", notEmpty: true }, false)).toBe(false);
    expect(conditionMatches({ field: "a", notEmpty: true }, [])).toBe(false);
    expect(conditionMatches({ field: "a", notEmpty: true }, 0)).toBe(true);
    expect(conditionMatches({ field: "a", notEmpty: true }, { id: "1" })).toBe(true);
  });

  const form = parse([
    text("kind"),
    text("other", { isRequired: true, showWhen: { field: "kind", notEquals: ["a", "b"] } }),
    text("note", { isRequired: true, showWhen: { field: "kind", notEmpty: true } }),
    text("both", {
      isRequired: true,
      showWhen: [
        { field: "kind", notEmpty: true },
        { field: "kind", notEquals: "a" },
      ],
    }),
  ]);

  it("uses notEquals / notEmpty on the server, and drops hidden fields", () => {
    expect(validateFormValues(form, { kind: "a", note: "n", other: "dropped", both: "dropped" })).toEqual({
      success: true,
      data: { kind: "a", note: "n" },
    });
    expect(validateFormValues(form, { kind: "c" })).toEqual({
      success: false,
      fieldErrors: {
        other: "other is required",
        note: "note is required",
        both: "both is required",
      },
    });
  });

  it("agrees with isFieldVisible on the client", () => {
    const byName = indexByName(flattenSteps(form));
    expect(isFieldVisible(byName.note, { kind: "" }, byName)).toBe(false);
    expect(isFieldVisible(byName.other, { kind: "" }, byName)).toBe(true);
    expect(isFieldVisible(byName.both, { kind: "a" }, byName)).toBe(false);
  });

  it("hides a notEquals field when its parent is hidden", () => {
    const chain = parse([
      { name: "on", label: "On", type: "checkbox" },
      text("a", { showWhen: { field: "on", equals: true } }),
      text("b", { isRequired: true, showWhen: { field: "a", notEquals: "x" } }),
    ]);
    expect(validateFormValues(chain, { on: false }).success).toBe(true);
  });

  it("rejects conditions with no operator or two operators", () => {
    expect(() => parse([text("a"), text("b", { showWhen: { field: "a" } })])).toThrow(/exactly one of/);
    expect(() =>
      parse([text("a"), text("b", { showWhen: { field: "a", equals: "x", notEmpty: true } })])
    ).toThrow(/exactly one of/);
    expect(() => parse([text("a"), text("b", { showWhen: { field: "a", notEmpty: false } })])).toThrow();
  });
});

describe("date fields", () => {
  const form = parse([
    { name: "born", label: "Born", type: "date", isRequired: true, validation: { min: "1900-01-01", max: "today" } },
    { name: "start", label: "Start", type: "date", validation: { min: "today", message: "Pick a future date" } },
  ]);

  it("accepts a valid date in range", () => {
    expect(validateFormValues(form, { born: "1990-05-17" })).toEqual({ success: true, data: { born: "1990-05-17" } });
  });

  it("rejects malformed and impossible dates", () => {
    expect(validateFormValues(form, { born: "17/05/1990" })).toEqual({
      success: false,
      fieldErrors: { born: "Born must be a valid date" },
    });
    expect(validateFormValues(form, { born: "2023-02-30" }).success).toBe(false);
    expect(validateFormValues(form, { born: 19900517 }).success).toBe(false);
  });

  it("checks min / max, with today resolved at validation time", () => {
    expect(validateFormValues(form, { born: "1899-12-31" })).toEqual({
      success: false,
      fieldErrors: { born: "The date can't be before 1900-01-01" },
    });
    expect(validateFormValues(form, { born: "2999-01-01" })).toEqual({
      success: false,
      fieldErrors: { born: `The date can't be after ${todayIso()}` },
    });
    expect(validateFormValues(form, { born: todayIso() }).success).toBe(true);
    expect(validateFormValues(form, { born: "1990-01-01", start: "2000-01-01" })).toEqual({
      success: false,
      fieldErrors: { start: "Pick a future date" },
    });
  });

  it("uses timeZone for today", () => {
    const tz = "Pacific/Kiritimati"; // UTC+14, usually a day ahead of UTC
    const result = validateFormValues(form, { born: todayIso(tz) }, { timeZone: tz });
    expect(result.success).toBe(true);
  });

  it("validates the same on the client", () => {
    expect(clientParse(form, { born: "2023-02-30" }).success).toBe(false);
    expect(clientParse(form, { born: "1990-05-17", start: "" }).data).toEqual({ born: "1990-05-17" });
  });

  it("rejects bad date bounds and number-only rules", () => {
    expect(() => parse([{ name: "d", label: "D", type: "date", validation: { min: "yesterday" } }])).toThrow(
      /"min" of a date must be "YYYY-MM-DD" or "today"/
    );
    expect(() =>
      parse([{ name: "d", label: "D", type: "date", validation: { min: "2025-01-02", max: "2025-01-01" } }])
    ).toThrow(/"min" is after "max"/);
    expect(() => parse([{ name: "d", label: "D", type: "date", validation: { minLength: 2 } }])).toThrow(
      /"minLength" is not supported for type "date"/
    );
    expect(() => parse([{ name: "n", label: "N", type: "number", validation: { min: "today" } }])).toThrow(
      /"min" must be a number/
    );
  });
});

describe("tel fields", () => {
  it("validates like text, with no built-in pattern", () => {
    const form = parse([
      { name: "phone", label: "Phone", type: "tel", isRequired: true, validation: { pattern: "^5\\d{8}$" } },
      { name: "fax", label: "Fax", type: "tel" },
    ]);
    expect(validateFormValues(form, { phone: " 555123456 ", fax: "any text" })).toEqual({
      success: true,
      data: { phone: "555123456", fax: "any text" },
    });
    expect(validateFormValues(form, { phone: "123" })).toEqual({
      success: false,
      fieldErrors: { phone: "Invalid format" },
    });
  });
});

describe("file fields", () => {
  const form = parse([
    { name: "id", label: "ID card", type: "file", isRequired: true, accept: ".pdf", maxSizeMb: 5 },
    { name: "photos", label: "Photos", type: "file", multiple: true },
  ]);
  const file = { id: "u1", name: "id.pdf", size: 1234, type: "application/pdf" };

  it("accepts uploaded-file objects and strips unknown keys", () => {
    const result = validateFormValues(form, {
      id: { ...file, url: "https://evil.example", owner: "someone-else" },
      photos: [{ id: "p1", name: "a.jpg" }],
    });
    expect(result).toEqual({ success: true, data: { id: file, photos: [{ id: "p1", name: "a.jpg" }] } });
  });

  it("enforces isRequired", () => {
    expect(validateFormValues(form, { id: null })).toEqual({
      success: false,
      fieldErrors: { id: "ID card is required" },
    });
    expect(validateFormValues(form, { id: file, photos: [] })).toEqual({ success: true, data: { id: file } });
  });

  it("enforces single vs multiple", () => {
    expect(validateFormValues(form, { id: [file] })).toEqual({
      success: false,
      fieldErrors: { id: "Invalid value" },
    });
    expect(validateFormValues(form, { id: file, photos: file })).toEqual({
      success: false,
      fieldErrors: { photos: "Invalid value" },
    });
  });

  it("rejects malformed file objects", () => {
    for (const bad of [{ name: "x" }, { id: "", name: "x" }, { id: "1", name: "x", size: "big" }, "u1"]) {
      expect(validateFormValues(form, { id: bad }).success).toBe(false);
    }
  });

  it("does not check size or type from the client", () => {
    const huge = { id: "u2", name: "movie.mkv", size: 9e12, type: "video/x-matroska" };
    expect(validateFormValues(form, { id: huge }).success).toBe(true);
  });

  it("parses file options and rejects them elsewhere", () => {
    expect(() => parse([{ name: "f", label: "F", type: "file", maxSizeMb: 0 }])).toThrow();
    expect(() => parse([text("t", { accept: ".pdf" })])).toThrow(/"accept" is not supported for type "text"/);
    expect(() => parse([{ name: "f", label: "F", type: "file", defaultValue: "x" }])).toThrow(
      /"defaultValue" is not supported for type "file"/
    );
    expect(() => parse([text("t"), text("u", { showWhen: { field: "f", equals: "x" } }), { name: "f", label: "F", type: "file" }])).toThrow(
      /can only use notEmpty with file field "f"/
    );
  });
});

describe("custom fields", () => {
  const form = parse([
    {
      name: "person",
      label: "Person",
      type: "custom",
      component: "verifyPerson",
      isRequired: true,
      endpoint: "/api/verify",
      lookup: { by: "personalNumber" },
    },
    { name: "extra", label: "Extra", type: "custom", component: "other" },
  ]);

  it("keeps extra JSON props on the field", () => {
    const field = form.steps[0].fields[0] as Record<string, unknown>;
    expect(field.endpoint).toBe("/api/verify");
    expect(field.lookup).toEqual({ by: "personalNumber" });
  });

  it("passes values through and checks only isRequired without a validator", () => {
    const value = { personalNumber: "01001012345", verified: true };
    expect(validateFormValues(form, { person: value, extra: [1, 2] })).toEqual({
      success: true,
      data: { person: value, extra: [1, 2] },
    });
    expect(validateFormValues(form, { person: {} })).toEqual({
      success: false,
      fieldErrors: { person: "Person is required" },
    });
  });

  it("runs customValidators with the value and the field", () => {
    const seen: unknown[] = [];
    const result = validateFormValues(
      form,
      { person: { personalNumber: "123", verified: false } },
      {
        customValidators: {
          verifyPerson: (value, field) => {
            seen.push(field.name);
            return (value as { verified: boolean }).verified ? undefined : "Verify the person first";
          },
        },
      }
    );
    expect(result).toEqual({ success: false, fieldErrors: { person: "Verify the person first" } });
    expect(seen).toEqual(["person"]);
  });

  it("does not run validators for hidden or empty fields", () => {
    const hidden = parse([
      { name: "on", label: "On", type: "checkbox" },
      { name: "p", label: "P", type: "custom", component: "c", showWhen: { field: "on", equals: true } },
      { name: "q", label: "Q", type: "custom", component: "c" },
    ]);
    const result = validateFormValues(hidden, { on: false, p: "x" }, { customValidators: { c: () => "boom" } });
    expect(result).toEqual({ success: true, data: { on: false } });
  });

  it("requires a component, and still rejects typos of known keys on other types", () => {
    expect(() => parse([{ name: "c", label: "C", type: "custom" }])).toThrow(/needs a "component"/);
    expect(() => parse([text("t", { endpoint: "/x" })])).toThrow(/Unknown key "endpoint"/);
  });
});

describe("array fields", () => {
  const form = parse({
    layout: "sections",
    steps: [
      {
        id: "staff",
        title: "Staff",
        fields: [
          { name: "hasStaff", label: "Has staff", type: "checkbox" },
          {
            name: "personnel",
            label: "Personnel",
            type: "array",
            minItems: 1,
            maxItems: 2,
            showWhen: { field: "hasStaff", equals: true },
            fields: [
              { name: "personalNumber", label: "Personal number", type: "text", isRequired: true, validation: { pattern: "^\\d{11}$" } },
              { name: "role", label: "Role", type: "select", isRequired: true, options: [{ label: "Vet", value: "vet" }, { label: "Other", value: "other" }] },
              { name: "roleOther", label: "Which role", type: "text", isRequired: true, showWhen: { field: "role", equals: "other" } },
              { name: "note", label: "Note", type: "info", text: "Shown in every row" },
            ],
          },
        ],
      },
    ],
  });

  it("validates each row and keys errors by path", () => {
    const result = validateFormValues(form, {
      hasStaff: true,
      personnel: [
        { personalNumber: "01001012345", role: "vet" },
        { personalNumber: "123", role: "other" },
      ],
    });
    expect(result).toEqual({
      success: false,
      fieldErrors: {
        "personnel.1.personalNumber": "Invalid format",
        "personnel.1.roleOther": "Which role is required",
      },
    });
  });

  it("drops hidden fields inside rows, and info fields", () => {
    const result = validateFormValues(form, {
      hasStaff: true,
      personnel: [{ personalNumber: "01001012345", role: "vet", roleOther: "sneaky", note: "x", junk: 1 }],
    });
    expect(result).toEqual({
      success: true,
      data: { hasStaff: true, personnel: [{ personalNumber: "01001012345", role: "vet" }] },
    });
  });

  it("drops the whole array when it is hidden", () => {
    const result = validateFormValues(form, { hasStaff: false, personnel: [{ personalNumber: "bad" }] });
    expect(result).toEqual({ success: true, data: { hasStaff: false } });
  });

  it("enforces minItems / maxItems", () => {
    expect(validateFormValues(form, { hasStaff: true, personnel: [] })).toEqual({
      success: false,
      fieldErrors: { personnel: "Add at least 1" },
    });
    const row = { personalNumber: "01001012345", role: "vet" };
    expect(validateFormValues(form, { hasStaff: true, personnel: [row, row, row] })).toEqual({
      success: false,
      fieldErrors: { personnel: "Add at most 2" },
    });
    expect(validateFormValues(form, { hasStaff: true, personnel: "nope" })).toEqual({
      success: false,
      fieldErrors: { personnel: "Invalid value" },
    });
  });

  it("treats isRequired as at least one row and returns [] for an empty optional array", () => {
    const required = parse([{ name: "rows", label: "Rows", type: "array", isRequired: true, fields: [text("a")] }]);
    expect(validateFormValues(required, {})).toEqual({ success: false, fieldErrors: { rows: "Rows is required" } });
    const optional = parse([{ name: "rows", label: "Rows", type: "array", fields: [text("a")] }]);
    expect(validateFormValues(optional, {})).toEqual({ success: true, data: { rows: [] } });
  });

  it("produces the same nested paths on the client", () => {
    const result = clientParse(form, { hasStaff: true, personnel: [{ personalNumber: "1", role: "vet" }] });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path)).toEqual([["personnel", 0, "personalNumber"]]);
  });

  it("checks array schemas", () => {
    const arr = (extra: object) => ({ name: "rows", label: "Rows", type: "array", fields: [text("a")], ...extra });
    expect(() => parse([{ name: "rows", label: "Rows", type: "array" }])).toThrow(/needs "fields"/);
    expect(() => parse([arr({ fields: [{ name: "x", label: "X", type: "array", fields: [text("a")] }] })])).toThrow(
      /can't contain another array/
    );
    expect(() => parse([arr({ fields: [text("a"), text("a")] })])).toThrow(/Duplicate field name "a" in "rows"/);
    expect(() => parse([text("top"), arr({ fields: [text("a", { showWhen: { field: "top", notEmpty: true } })] })])).toThrow(
      /not a field of the same row/
    );
    expect(() => parse([arr({ minItems: 3, maxItems: 2 })])).toThrow(/"minItems" is larger than "maxItems"/);
    expect(() => parse([arr({ fields: [text("a.b")] })])).toThrow(/can't contain "\."/);
    // sub-field names live in their own namespace
    expect(() => parse([text("a"), arr({})])).not.toThrow();
  });
});

describe("info fields", () => {
  const form = parse({
    layout: "sections",
    steps: [
      {
        id: "s",
        fields: [
          { name: "kind", label: "Kind", type: "text" },
          { name: "fee", type: "info", text: "Fee: 20 GEL\nTerm: 10 days", showWhen: { field: "kind", notEmpty: true } },
        ],
      },
    ],
  });

  it("parses without a label and is never validated or submitted", () => {
    expect(form.steps[0].fields[1].label).toBe("");
    expect(validateFormValues(form, { kind: "x", fee: "tampered" })).toEqual({ success: true, data: { kind: "x" } });
  });

  it("needs text, accepts only display keys, and can't be a condition target", () => {
    expect(() => parse([{ name: "i", type: "info" }])).toThrow(/needs a "text"/);
    expect(() => parse([{ name: "i", type: "info", text: "t", isRequired: true }])).toThrow(
      /"isRequired" is not supported for type "info"/
    );
    expect(() => parse([{ name: "i", type: "info", text: "t" }, text("a", { showWhen: { field: "i", notEmpty: true } })])).toThrow(
      /can't depend on info field "i"/
    );
  });
});

describe("field options", () => {
  it("parses description, width, readOnly and typed defaultValue", () => {
    const form = parse([
      text("a", { description: "Help", width: "half", readOnly: true, defaultValue: "x" }),
      { name: "n", label: "N", type: "number", defaultValue: 3 },
      { name: "c", label: "C", type: "checkbox", defaultValue: true },
      { name: "s", label: "S", type: "select", options: [{ label: "A", value: "a" }], defaultValue: "a" },
      { name: "d", label: "D", type: "date", defaultValue: "today" },
    ]);
    expect(form.steps[0].fields[0]).toMatchObject({ description: "Help", width: "half", readOnly: true });
  });

  it("rejects defaultValue of the wrong type", () => {
    expect(() => parse([text("a", { defaultValue: 1 })])).toThrow(/defaultValue of "a" must be a string/);
    expect(() => parse([{ name: "n", label: "N", type: "number", defaultValue: "3" }])).toThrow(/must be a number/);
    expect(() => parse([{ name: "c", label: "C", type: "checkbox", defaultValue: "yes" }])).toThrow(/true or false/);
    expect(() =>
      parse([{ name: "s", label: "S", type: "radio", options: [{ label: "A", value: "a" }], defaultValue: "b" }])
    ).toThrow(/one of the options/);
    expect(() => parse([{ name: "d", label: "D", type: "date", defaultValue: "2025-13-01" }])).toThrow(/YYYY-MM-DD/);
    expect(() => parse([text("a", { width: "third" })])).toThrow();
  });

  it("builds default values, with overrides and array rows", () => {
    const form = parse([
      text("a", { defaultValue: "x" }),
      text("b"),
      { name: "d", label: "D", type: "date", defaultValue: "today" },
      { name: "i", type: "info", text: "t" },
      { name: "rows", label: "Rows", type: "array", minItems: 2, fields: [text("r", { defaultValue: "y" })] },
    ]);
    const fields = flattenSteps(form);
    expect(buildDefaultValues(fields)).toEqual({
      a: "x",
      d: todayIso(),
      rows: [{ r: "y" }, { r: "y" }],
    });
    expect(buildDefaultValues(fields, { a: "over", unknown: 1, rows: [{ r: "z" }] })).toEqual({
      a: "over",
      d: todayIso(),
      rows: [{ r: "z" }],
    });
  });
});

describe("layout", () => {
  it("keeps the layout and allows untitled sections", () => {
    const form = parse({
      layout: "sections",
      steps: [
        { id: "a", fields: [text("x")] },
        { id: "b", fields: [text("y")] },
      ],
    });
    expect(form.layout).toBe("sections");
  });

  it("still requires titles in a multi-step wizard, and rejects unknown layouts", () => {
    expect(() => parse({ steps: [{ id: "a", fields: [text("x")] }, { id: "b", fields: [text("y")] }] })).toThrow(
      /needs a title/
    );
    expect(() => parse({ layout: "tabs", steps: [{ id: "a", fields: [text("x")] }] })).toThrow();
  });

  it("drops fields of hidden sections", () => {
    const form = parse({
      layout: "sections",
      steps: [
        { id: "a", title: "A", fields: [{ name: "same", label: "Same", type: "checkbox" }, text("legal")] },
        {
          id: "b",
          title: "B",
          showWhen: { field: "same", notEquals: true },
          fields: [text("actual", { isRequired: true })],
        },
      ],
    });
    expect(validateFormValues(form, { same: true, legal: "Tbilisi", actual: "x" })).toEqual({
      success: true,
      data: { same: true, legal: "Tbilisi" },
    });
    expect(validateFormValues(form, { same: false, legal: "Tbilisi" })).toEqual({
      success: false,
      fieldErrors: { actual: "actual is required" },
    });
  });
});
