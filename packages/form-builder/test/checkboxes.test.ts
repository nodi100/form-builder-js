import { describe, expect, it } from "vitest";
import {
  buildDefaultValues,
  conditionMatches,
  describeValues,
  flattenSteps,
  parseFormSchema,
  pickVisibleValues,
  validateFormValues,
} from "../src";

const parse = (json: unknown) => parseFormSchema("t", json);

const media = {
  name: "media",
  label: "Photo / video",
  type: "checkboxes",
  isRequired: true,
  options: [
    { label: "Photos taken", value: "photo" },
    { label: "Video taken", value: "video" },
    { label: "None", value: "none", exclusive: true },
  ],
};

const photos = {
  name: "photos",
  label: "Photos",
  type: "file",
  multiple: true,
  isRequired: true,
  showWhen: { field: "media", contains: "photo" },
};

describe("checkboxes", () => {
  const form = parse([media, photos]);

  it("starts as an empty list", () => {
    expect(buildDefaultValues(flattenSteps(form))).toEqual({ media: [] });
  });

  it("is required: at least one option", () => {
    expect(validateFormValues(form, { media: [] })).toEqual({
      success: false,
      fieldErrors: { media: "Photo / video is required" },
    });
    expect(validateFormValues(form, { media: ["none"] })).toEqual({
      success: true,
      data: { media: ["none"] },
    });
  });

  it("returns the values in option order", () => {
    const result = validateFormValues(form, {
      media: ["video", "photo"],
      photos: [{ id: "1", name: "a.jpg" }],
    });
    expect(result).toEqual({
      success: true,
      data: { media: ["photo", "video"], photos: [{ id: "1", name: "a.jpg" }] },
    });
  });

  it("rejects unknown options, repeats and an exclusive option with others", () => {
    for (const media of [["photo", "x"], ["photo", "photo"], ["none", "video"]]) {
      expect(validateFormValues(form, { media })).toMatchObject({
        success: false,
        fieldErrors: { media: "Invalid option" },
      });
    }
    expect(validateFormValues(form, { media: "photo" })).toMatchObject({ success: false });
  });

  it("checks minItems and maxItems", () => {
    const limited = parse([
      { ...media, isRequired: false, minItems: 2, maxItems: 2, options: media.options.slice(0, 2).concat({ label: "Audio", value: "audio" }) },
    ]);
    expect(validateFormValues(limited, { media: [] })).toEqual({ success: true, data: { media: [] } });
    expect(validateFormValues(limited, { media: ["photo"] })).toMatchObject({
      fieldErrors: { media: "Pick at least 2" },
    });
    expect(validateFormValues(limited, { media: ["photo", "video", "audio"] })).toMatchObject({
      fieldErrors: { media: "Pick at most 2" },
    });
  });

  it("shows a field while an option is ticked, with contains", () => {
    expect(validateFormValues(form, { media: ["photo"] })).toEqual({
      success: false,
      fieldErrors: { photos: "Photos is required" },
    });
    expect(validateFormValues(form, { media: ["video"], photos: [{ id: "1", name: "a.jpg" }] })).toEqual({
      success: true,
      data: { media: ["video"] },
    });
  });

  it("matches contains against a list", () => {
    expect(conditionMatches({ field: "a", contains: "x" }, ["x", "y"])).toBe(true);
    expect(conditionMatches({ field: "a", contains: ["z", "y"] }, ["y"])).toBe(true);
    expect(conditionMatches({ field: "a", contains: "x" }, ["y"])).toBe(false);
    expect(conditionMatches({ field: "a", contains: "x" }, "x")).toBe(false);
    expect(conditionMatches({ field: "a", contains: "x" }, undefined)).toBe(false);
  });
});

describe("parseFormSchema: checkboxes and contains", () => {
  it("needs options", () => {
    expect(() => parse([{ name: "a", label: "A", type: "checkboxes" }])).toThrow(/needs options/);
  });

  it("allows exclusive only on checkboxes", () => {
    expect(() =>
      parse([{ name: "a", label: "A", type: "radio", options: [{ label: "x", value: "x", exclusive: true }] }])
    ).toThrow(/"exclusive" is only supported for type "checkboxes"/);
  });

  it("checks the defaultValue", () => {
    expect(() => parse([{ ...media, defaultValue: "photo" }])).toThrow(/array of option values/);
    expect(() => parse([{ ...media, defaultValue: ["none", "photo"] }])).toThrow(/exclusive option "none"/);
    expect(parse([{ ...media, defaultValue: ["photo"] }]).steps[0].fields[0].defaultValue).toEqual(["photo"]);
  });

  it("only accepts contains on a checkboxes field, with a known option", () => {
    expect(() =>
      parse([
        { name: "kind", label: "Kind", type: "text" },
        { name: "b", label: "B", type: "text", showWhen: { field: "kind", contains: "x" } },
      ])
    ).toThrow(/can only use contains with a checkboxes field/);
    expect(() => parse([media, { ...photos, showWhen: { field: "media", contains: "audio" } }])).toThrow(
      /checks option "audio"/
    );
    expect(() => parse([media, { ...photos, showWhen: { field: "media", equals: "photo" } }])).toThrow(
      /can only use contains or notEmpty/
    );
  });

  it("accepts suffix on text, tel and number only", () => {
    expect(parse([{ name: "w", label: "Weight", type: "number", suffix: "kg" }]).steps[0].fields[0].suffix).toBe("kg");
    expect(() => parse([{ name: "d", label: "D", type: "date", suffix: "x" }])).toThrow(
      /"suffix" is not supported for type "date"/
    );
  });
});

describe("pickVisibleValues", () => {
  it("keeps only visible fields, unvalidated, rows included", () => {
    const form = parse([
      media,
      photos,
      {
        name: "catch",
        label: "Catch",
        type: "array",
        fields: [
          { name: "kind", label: "Kind", type: "text" },
          { name: "redList", label: "Red list", type: "checkbox" },
          { name: "note", label: "Note", type: "text", showWhen: { field: "redList", equals: true } },
        ],
      },
    ]);
    const values = {
      media: ["video"],
      photos: [{ id: "1", name: "a.jpg" }],
      catch: [{ kind: " trout ", redList: false, note: "hidden" }],
      stray: 1,
    };
    expect(pickVisibleValues(flattenSteps(form), values)).toEqual({
      media: ["video"],
      catch: [{ kind: " trout ", redList: false }],
    });
  });
});

describe("describeValues", () => {
  const form = parse({
    layout: "sections",
    steps: [
      {
        id: "vehicle",
        title: "Vehicle",
        fields: [
          { name: "title", type: "info", label: "Info", text: "Fill in" },
          { name: "model", label: "Model", type: "text" },
          { name: "volume", label: "Volume", type: "number", suffix: "m³" },
          {
            name: "origin",
            label: "Origin unknown",
            type: "radio",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
          },
          { name: "address", label: "Address", type: "text", showWhen: { field: "origin", equals: "no" } },
          { name: "agree", label: "Checked", type: "checkbox" },
        ],
      },
      {
        id: "media",
        title: "Media",
        fields: [media, photos],
      },
      {
        id: "catch",
        title: "Catch",
        fields: [
          {
            name: "fish",
            label: "Fish",
            type: "array",
            fields: [
              { name: "kind", label: "Kind", type: "text" },
              { name: "weight", label: "Weight", type: "number", suffix: "kg" },
            ],
          },
        ],
      },
    ],
  });

  it("turns values into labelled lines, step by step", () => {
    const steps = describeValues(form, {
      model: "Kamaz",
      volume: 12,
      origin: "yes",
      address: "hidden",
      agree: false,
      media: ["photo", "none"],
      photos: [{ id: "1", name: "a.jpg" }, { id: "2", name: "b.jpg" }],
      fish: [{ kind: "Trout", weight: 2 }, {}],
    });
    expect(steps).toEqual([
      {
        id: "vehicle",
        title: "Vehicle",
        fields: [
          { name: "model", label: "Model", lines: ["Kamaz"] },
          { name: "volume", label: "Volume", lines: ["12 m³"] },
          { name: "origin", label: "Origin unknown", lines: ["Yes"] },
          { name: "agree", label: "Checked", lines: ["No"] },
        ],
      },
      {
        id: "media",
        title: "Media",
        fields: [
          { name: "media", label: "Photo / video", lines: ["Photos taken", "None"] },
          { name: "photos", label: "Photos", lines: ["a.jpg", "b.jpg"] },
        ],
      },
      {
        id: "catch",
        title: "Catch",
        fields: [{ name: "fish", label: "Fish", lines: ["Fish #1: Kind: Trout, Weight: 2 kg"] }],
      },
    ]);
  });

  it("takes messages, formatValue and includeEmpty", () => {
    const steps = describeValues(
      form,
      { agree: true, model: "x" },
      {
        messages: { yes: "კი" },
        formatValue: (field, value) => (field.name === "model" ? [String(value).toUpperCase()] : undefined),
        includeEmpty: true,
      }
    );
    expect(steps[0].fields).toEqual([
      { name: "model", label: "Model", lines: ["X"] },
      { name: "volume", label: "Volume", lines: [] },
      { name: "origin", label: "Origin unknown", lines: [] },
      { name: "agree", label: "Checked", lines: ["კი"] },
    ]);
  });
});
