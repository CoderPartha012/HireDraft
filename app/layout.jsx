import "./globals.css";
import ToastProvider from "../components/toast-provider";
import CinematicBackground from "../components/cinematic-background";

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
    <html lang="en">
      <body>
        <CinematicBackground />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="site-content">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
