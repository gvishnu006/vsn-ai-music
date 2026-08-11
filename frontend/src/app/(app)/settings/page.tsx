import type { Metadata } from "next";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings — VSN Studio",
  description: "Manage your VSN Studio profile and account.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
