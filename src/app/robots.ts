import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://lessonleads.com";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard/", "/onboarding", "/admin/", "/api/", "/l/", "/embed/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
