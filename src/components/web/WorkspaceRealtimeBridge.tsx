"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type Ably from "ably"
import { AblyProvider, ChannelProvider, useChannel } from "ably/react"
import { getRealtimeClient } from "@/lib/ably-client"
import { workspaceChannel, type WorkspaceInvalidation } from "@/lib/ably-channel"

const REFRESH_DEBOUNCE_MS = 400;

function InvalidationListener({
  channelName,
  onPing,
}: {
  channelName: string;
  onPing: (message: Ably.Message) => void;
}) {
  // The channel name must be passed explicitly: with a single string argument
  // the hook reads it as the channel to resolve, not as an event name.
  useChannel(channelName, "workspace", onPing);
  return null;
}

function RefreshOnPing({ channelName }: { channelName: string }) {
  const router = useRouter();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handle = React.useCallback(
    (message: Ably.Message) => {
      const data = message.data as WorkspaceInvalidation | undefined;
      if (!data || data.kind !== "invalidate") return;

      // Several members editing at once would otherwise trigger one full
      // server render per message, so collapse them into a single refresh.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    },
    [router]
  );

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return <InvalidationListener channelName={channelName} onPing={handle} />;
}

/**
 * The workspace page renders server components, so there is nothing to patch in
 * place: a message simply asks this viewer to re-read the page. Renders
 * nothing, so it stays out of the layout.
 */
export function WorkspaceRealtimeBridge({ workspaceId }: { workspaceId: string }) {
  const client = getRealtimeClient();

  if (!client) return null;

  const channelName = workspaceChannel(workspaceId);

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={channelName}>
        <RefreshOnPing channelName={channelName} />
      </ChannelProvider>
    </AblyProvider>
  );
}