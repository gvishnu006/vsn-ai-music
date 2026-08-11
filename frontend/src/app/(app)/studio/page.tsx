import type { Metadata } from "next";
import { StudioClient } from "./StudioClient";

export const metadata: Metadata = {
  title: "Create — VSN Studio",
  description: "Generate a new AI song from a prompt or lyrics.",
};

export default async function StudioPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const initialPrompt = typeof params?.prompt === "string" ? params.prompt : "";
  return <StudioClient initialPrompt={initialPrompt} />;
}
