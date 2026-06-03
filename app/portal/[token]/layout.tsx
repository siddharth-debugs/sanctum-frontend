import { AuroraBackground } from "@/components/app/aurora-background";

/** Branded, chrome-light read-only shell. No app sidebar. */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <AuroraBackground />
      {children}
    </div>
  );
}
