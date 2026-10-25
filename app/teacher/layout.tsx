import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protégé for teachers",
  description: "Turn your lesson into something your students teach.",
};

/** The teacher side has its own calm, light "field journal" theme. */
export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <div data-theme="teacher" className="min-h-dvh">
      {children}
    </div>
  );
}
