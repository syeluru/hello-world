import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trackline — Fitness & Nutrition",
  description:
    "Personal fitness and nutrition tracker: log daily workouts and let AI estimate the calories and macros of whatever you just ate.",
};

// Applies the saved theme before first paint to avoid a flash of the default.
const themeBoot = `
try {
  var t = localStorage.getItem("fnt_theme");
  if (t === "pulse" || t === "bloom" || t === "hexa") {
    document.documentElement.setAttribute("data-theme", t);
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="pulse">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,400&family=Manrope:wght@200;300;400;500;600;700&family=Heebo:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
