"use client"

import * as React from "react"
import type Ably from "ably"
import { AblyProvider, ChannelProvider, useChannel } from "ably/react"
import { getRealtimeClient } from "@/lib/ably-client"
import { projectChannel, type CanvasEvent } from "@/lib/ably-channel"

function CanvasListener({
  channelName,
  onMessage,
}: {
  channelName: string;
  onMessage: (message: Ably.Message) => void;
}) {
  // The channel name must be passed explicitly: with a single string argument
  // the hook reads it as the channel to resolve, not as an event name.
  useChannel(channelName, "canvas", onMessage);
  return null;
}

/**
 * Closes the gap left by events published while we were disconnected: any task
 * changed during a dropped connection was never delivered, so the board is stale
 * until someone reloads. Two moments are worth resyncing on — the connection
 * coming back up, and the tab becoming visible again (a backgrounded tab is
 * commonly suspended, which drops the socket without a clean disconnect).
 */
function useRecoverySync(
  client: Ably.Realtime | null,
  onResync: () => void
) {
  const handlerRef = React.useRef(onResync);

  React.useEffect(() => {
    handlerRef.current = onResync;
  });

  React.useEffect(() => {
    if (!client) return;

    // `connected` also fires on the very first connect. A refresh then is
    // redundant but harmless, and suppressing just that one needs a ref that
    // outlives this effect's cleanup.
    const onConnected = () => handlerRef.current();
    client.connection.on("connected", onConnected);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handlerRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      client.connection.off("connected", onConnected);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [client]);
}

/**
 * Subscribes to one project's canvas channel and hands every message to
 * `onEvent`. Returns the provider elements to register, or null when there is no
 * client yet (server render) or no project.
 *
 * The handler is held in a ref so a new inline callback does not resubscribe on
 * every render.
 *
 * `onResync` is called when the connection recovers or the tab regains focus, so
 * the caller can refetch anything missed while we were away.
 */
export function useProjectRealtime(
  projectId: string | null,
  onEvent: (event: CanvasEvent) => void,
  onResync?: () => void
) {
  const client = getRealtimeClient();

  const handlerRef = React.useRef(onEvent);

  React.useEffect(() => {
    handlerRef.current = onEvent;
  });

  const stableHandler = React.useCallback(
    (message: Ably.Message) => handlerRef.current(message.data as CanvasEvent),
    []
  );

  const stableResync = React.useCallback(() => {
    onResync?.();
  }, [onResync]);

  useRecoverySync(client, stableResync);

  if (!client || !projectId) return null;

  const channelName = projectChannel(projectId);

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={channelName}>
        <CanvasListener channelName={channelName} onMessage={stableHandler} />
      </ChannelProvider>
    </AblyProvider>
  );
}