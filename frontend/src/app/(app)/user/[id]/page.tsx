import type { Metadata } from "next";
import { UserProfileClient } from "./UserProfileClient";

export const metadata: Metadata = {
  title: "Creator — VSN Studio",
  description: "A creator on VSN Studio.",
};

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserProfileClient id={id} />;
}
