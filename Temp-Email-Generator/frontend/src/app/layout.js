import "./globals.css";
import NavMenu from "./components/NavMenu";
import ThemeToggle from "./components/ThemeToggle";

export const metadata = {
  title: "Blacksipher Temp Email",
  description: "Blacksipher lets you generate temporary inboxes and read incoming messages fast.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="theme-toggle-bar">
          <NavMenu />
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
