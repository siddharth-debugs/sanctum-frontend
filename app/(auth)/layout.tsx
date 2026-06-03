import { AuroraBackground } from "@/components/app/aurora-background";
import { AuthGuard } from "./auth-guard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <AuroraBackground />
      <AuthGuard>{children}</AuthGuard>
    </div>
  );
}
