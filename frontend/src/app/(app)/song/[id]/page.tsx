import type { Metadata } from "next";
import { SongDetailClient } from "./SongDetailClient";

export const metadata: Metadata = {
  title: "Song — VSN Studio",
  description: "Play, remix and share songs on VSN Studio.",
};

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SongDetailClient id={id} />;
}
