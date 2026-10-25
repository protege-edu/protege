import { bad, requireTeacher } from "@/lib/teacher/api";
import { readMaterial } from "@/lib/teacher/read";

const MAX_BYTES = 25 * 1024 * 1024;

/** Upload a PDF / PowerPoint / Word file, or send pasted text. Returns its sections to pick from. */
export async function POST(request: Request) {
  const denied = await requireTeacher();
  if (denied) return denied;
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("multipart/form-data")) {
      const file = (await request.formData()).get("file");
      if (!(file instanceof File)) return bad("Choose a file to upload.");
      if (file.size > MAX_BYTES) return bad("That file is over 25 MB. Try a smaller file, or paste the part you need.");
      return Response.json({ name: file.name, ...(await readMaterial(file.name, new Uint8Array(await file.arrayBuffer()))) });
    }
    const { text } = (await request.json()) as { text?: string };
    if (!text?.trim()) return bad("Paste some lesson text first.");
    return Response.json({ name: "Pasted text", ...(await readMaterial("pasted.txt", text)) });
  } catch (err) {
    return bad(err instanceof Error ? err.message : "We couldn't read that. Try another file, or paste the text.");
  }
}
