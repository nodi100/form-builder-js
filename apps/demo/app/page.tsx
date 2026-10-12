import { FormBuilder } from "form-builder-js/react";
import { getFormSchema } from "@/lib/get-form-schema";
import { submitJobApplication } from "./actions";

export default async function Page() {
  // fetched on the server, passed to the client component as plain JSON
  const form = await getFormSchema("job-application");

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold">Job application</h1>
        <FormBuilder form={form} onSubmit={submitJobApplication} />
      </div>
    </main>
  );
}
