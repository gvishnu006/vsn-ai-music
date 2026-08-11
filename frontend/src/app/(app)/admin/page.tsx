import type { Metadata } from "next";
import { AdminClient } from "./AdminClient";

export const metadata: Metadata = {
  title: "Moderation — VSN Studio",
  description: "VSN Studio moderation dashboard.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
