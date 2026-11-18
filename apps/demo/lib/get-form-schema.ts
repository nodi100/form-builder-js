import "server-only";
import { parseFormSchema, type FormDefinition } from "@iteasa/form-builder-js";
import jobApplication from "@/data/job-application.json";
import farmRegistration from "@/data/farm-registration.json";
import companyProfile from "@/data/company-profile.json";

/**
 * Where the form JSON comes from. Right now it's a local file;
 * swap this for your API / DB call (e.g. POST getFormById) later.
 * Both the page and the server action use this, so the server
 * always validates against its own copy of the schema, never one
 * sent by the client.
 */
export async function getFormSchema(formId: string): Promise<FormDefinition> {
  switch (formId) {
    case "job-application":
      return parseFormSchema(formId, jobApplication);
    case "farm-registration":
      return parseFormSchema(formId, farmRegistration);
    case "company-profile":
      return parseFormSchema(formId, companyProfile);
    default:
      throw new Error(`Unknown form: ${formId}`);
  }
}
