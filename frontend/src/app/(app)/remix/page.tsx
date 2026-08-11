import type { Metadata } from "next";
import { RemixClient } from "./RemixClient";

export const metadata: Metadata = {
  title: "Remix Studio — VSN Studio",
  description: "Re-imagine any song in a new genre, voice or tempo.",
};

export default async function RemixPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const from = typeof params?.from === "string" ? params.from : "";
  return <RemixClient initialFrom={from} />;
}
