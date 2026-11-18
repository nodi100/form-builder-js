import { FormBuilder } from "@iteasa/form-builder-js/react";
import { getFormSchema } from "@/lib/get-form-schema";
import { submitCompanyProfile } from "../actions";

export default async function AccordionPage() {
  const form = await getFormSchema("company-profile");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Company profile</h1>
        <p className="mb-6 text-sm text-gray-500">
          A one-page form with collapsible sections (<code>layout: &quot;accordion&quot;</code>). Click a section title to
          show its fields.
        </p>
        <FormBuilder form={form} onSubmit={submitCompanyProfile} />
      </div>
    </main>
  );
}
