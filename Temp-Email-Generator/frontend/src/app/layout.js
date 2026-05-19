import "./globals.css";
import ThemeToggle from "./components/ThemeToggle";

export const metadata = {
  title: "Temp Email Generator",
  description: "Generate temporary inboxes and read incoming messages fast.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="fixed right-5 top-5 z-30 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
