import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Fomo Intern Desk | Golam Khan",
  description: "Shared schedule, time clock, reimbursements, and growth team CRM.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
