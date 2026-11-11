import { regions } from "@/lib/regions";

export async function GET() {
  await new Promise((r) => setTimeout(r, 400)); // fake network delay
  return Response.json(regions);
}
