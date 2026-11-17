import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { RepositoryProvider } from "@/lib/providers/RepositoryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { AccountProfileProvider } from "@/components/account/AccountProfileProvider";
import WebUsageTracker from "@/components/analytics/WebUsageTracker";
import { GuardianWorkspace } from "@/components/layout/GuardianWorkspace";
import { Toaster } from "@/components/ui/Toast";
import { InboxProvider } from "@/components/inbox/InboxProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speech Adventure — ระบบฝึกพูดสำหรับเด็กไทย",
  description: "แอปฝึกการออกเสียงพยัญชนะไทยสำหรับเด็ก พร้อมระบบประเมินผล AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled content when restoring dark mode */}
        <script dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem('speech-adventure-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t===null&&d))document.documentElement.classList.add('dark');}catch(e){}`
        }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <AuthProvider>
          <AccountProfileProvider>
          <WebUsageTracker />
          <RepositoryProvider>
            <ThemeProvider>
              <InboxProvider>
                <GuardianWorkspace>{children}</GuardianWorkspace>
              </InboxProvider>
              <Toaster />
            </ThemeProvider>
          </RepositoryProvider>
          </AccountProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
