import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { SchedulerBootstrap } from '@/components/SchedulerBootstrap'
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Daily Flake - Daily Snow Reports via SMS",
  description: "Get daily ski resort snow conditions delivered to your phone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <SchedulerBootstrap />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
