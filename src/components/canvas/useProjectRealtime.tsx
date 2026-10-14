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
 * Subscribes to one project's canvas channel and hands every message to
 * `onEvent`. Returns the provider elements to render, or null when there is no
 * client yet (server render) or no project.
 *
 * The handler is held in a ref so a new inline callback does not resubscribe on
 * every render.
 */
export function useProjectRealtime(
  projectId: string | null,
  onEvent: (event: CanvasEvent) => void
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