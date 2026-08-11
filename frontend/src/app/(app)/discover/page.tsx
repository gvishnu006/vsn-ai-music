import type { Metadata } from "next";
import { DiscoverClient } from "./DiscoverClient";

export const metadata: Metadata = {
  title: "Discover — VSN Studio",
  description: "Explore songs, remixes and edits from the VSN community.",
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
