import type { MetadataRoute } from "next";

const routes = [
  "", "/how-it-works", "/features", "/pricing", "/resources", "/demo", "/demo/course",
  "/golf-coaches", "/for/golf-coaches", "/for/golf-courses",
  "/golf-lesson-lead-generation", "/golf-lesson-widget",
  "/golf-coach-website-widget", "/golf-instructor-lead-generation",
  "/golf-lesson-booking-widget", "/coachnow-lead-generation",
  "/works-with/coachnow", "/works-with/calendly", "/works-with/acuity", "/works-with/square",
  "/privacy", "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://lessonleads.com";
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date("2026-08-26"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/resources") ? 0.6 : 0.75,
  }));
}
