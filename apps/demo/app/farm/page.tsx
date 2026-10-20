import { getFormSchema } from "@/lib/get-form-schema";
import { submitFarmRegistration } from "../actions";
import { FarmForm } from "./FarmForm";

export default async function FarmPage() {
  const form = await getFormSchema("farm-registration");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold">Farm registration</h1>
        <FarmForm form={form} onSubmit={submitFarmRegistration} timeZone="Asia/Tbilisi" />
      </div>
    </main>
  );
}
