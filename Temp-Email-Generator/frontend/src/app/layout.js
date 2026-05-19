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
        <div className="theme-toggle-shell">
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
