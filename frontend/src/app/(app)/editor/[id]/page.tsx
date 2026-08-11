import type { Metadata } from "next";
import { EditorClient } from "./EditorClient";

export const metadata: Metadata = {
  title: "Editor — VSN Studio",
  description: "Trim, mix, re-tempo and fade your AI song.",
};

export default async function EditorPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return <EditorClient songId={id} />;
}
