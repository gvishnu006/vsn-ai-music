import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VSN AI Music Generator",
    short_name: "VSN",
    description: "Generate, edit and remix AI music in seconds. Free.",
    start_url: "/",
    display: "standalone",
    background_color: "#121826",
    theme_color: "#FAF3E7",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
