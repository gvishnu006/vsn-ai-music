import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/discover`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/studio`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/library`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/remix`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/signin`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
