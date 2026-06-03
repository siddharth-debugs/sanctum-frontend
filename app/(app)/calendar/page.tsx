"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { GlassCard } from "@/components/app/glass-card";
import { ContentCalendar } from "@/components/app/content-calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/hooks/use-clients";
import { usePosts } from "@/hooks/use-posts";

export default function CrossClientCalendarPage() {
  const { data: clients } = useClients();
  const activeClients = (clients ?? []).filter((c) => c.status === "active");
  const [clientId, setClientId] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!clientId && activeClients[0]) setClientId(activeClients[0].id);
  }, [activeClients, clientId]);

  const { data: posts } = usePosts(clientId ?? "");

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <CalendarDays className="size-3" /> Planner
          </>
        }
        title="Calendar"
        description="A cross-client month view. Pick a client to plan their content."
        actions={
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {activeClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {clientId ? (
        <>
          <ContentCalendar posts={posts ?? []} />
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link href={`/clients/${clientId}/calendar`}>
                Open client calendar <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <GlassCard className="p-10 text-center text-muted-foreground">
          Select a client to view their calendar.
        </GlassCard>
      )}
    </div>
  );
}
