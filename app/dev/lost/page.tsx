import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LostScreen } from "@/components/lost/LostScreen";
import type { LostKind } from "@/components/lost/mount";
import { AGE_STYLES, type AgeStyleId } from "@/lib/age-styles";

/** Development only: every lost page in every age style and language, e.g. /dev/lost?kind=broke&style=middle&lang=fr */
export default function Page({ searchParams }: PageProps<"/dev/lost">) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Preview searchParams={searchParams} />
    </Suspense>
  );
}

async function Preview({ searchParams }: { searchParams: PageProps<"/dev/lost">["searchParams"] }) {
  const q = await searchParams;
  const kind = (["missing", "gone", "broke"] as const).find((k) => k === q.kind) ?? "missing";
  const style = (Object.keys(AGE_STYLES) as AgeStyleId[]).find((s) => s === q.style) ?? "senior";
  return <LostScreen kind={kind as LostKind} style={style} language={q.lang === "fr" ? "fr" : "en"} student={q.student === "1"} />;
}
