import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/CYBER-CHRONICAL";
const title = "Cyber Chronicle | Trusted Cybersecurity News. Simplified.";
const description = "Clear, source-linked cybersecurity news for students and everyday readers.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nikhilesh-cs.github.io"),
  title,
  description,
  applicationName: "Cyber Chronicle",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Cyber Chronicle" },
  formatDetection: { telephone: false },
  icons: { icon: `${basePath}/favicon.svg`, shortcut: `${basePath}/favicon.svg` },
  openGraph: {
    title,
    description,
    type: "website",
    url: `${basePath}/`,
    images: [{ url: `${basePath}/og.png`, width: 1728, height: 911, alt: "Cyber Chronicle trusted cybersecurity news" }],
  },
  twitter: { card: "summary_large_image", title, description, images: [`${basePath}/og.png`] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
