import "./globals.css";
import localFont from "next/font/local";
import ThemeProvider from "@/components/theme-provider";
import ToastProvider from "../components/toast-provider";

const geist = localFont({
  src: "../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900",
});

export const metadata = {
  title: {
    default: "HireDraft | Tailored application emails from your resume",
    template: "%s | HireDraft",
  },
  description:
    "Turn a job link or description and your resume into a tailored application email grounded in your real experience. Review, personalize, and copy your draft.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body id="top">
        <ThemeProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <div className="site-content">
            <ToastProvider>{children}</ToastProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
