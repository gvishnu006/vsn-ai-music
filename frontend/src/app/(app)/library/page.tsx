import type { Metadata } from "next";
import { LibraryClient } from "./LibraryClient";

export const metadata: Metadata = {
  title: "My Studio — VSN Studio",
  description: "Your songs, edits, remixes and playlists.",
};

export default function LibraryPage() {
  return <LibraryClient />;
}
