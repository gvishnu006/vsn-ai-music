import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "VSN AI Music Generator — Your Voice. Your Sound. Your Vision.",
    template: "%s",
  },
  description:
    "Free AI music and song generation. Type a prompt or lyrics, pick a genre, language and voice, and generate an AI-sung song in seconds. Edit, remix, download and share.",
  keywords: [
    "AI music generator",
    "AI song generator",
    "free AI music",
    "music generation",
    "song maker",
    "AI singer",
    "VSN",
  ],
  authors: [{ name: "VSN" }],
  creator: "VSN",
  openGraph: {
    title: "VSN AI Music Generator",
    description: "Your Voice. Your Sound. Your Vision. Generate AI songs in seconds.",
    type: "website",
    siteName: "VSN Studio",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VSN AI Music Generator",
    description: "Generate, edit and remix AI music in seconds. Free.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF3E7",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

const themeInitScript = `
(function () {
  try {
    var stored = window.localStorage.getItem('vsn-theme');
    var theme = stored === 'dark' || stored === 'neon' ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var colors = { light: '#FAF3E7', dark: '#121826', neon: '#000000' };
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', colors[theme]);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
