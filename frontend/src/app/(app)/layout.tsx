import { AppShell } from "@/components/nav/AppShell";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
