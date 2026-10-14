"use client"

import Ably from "ably";

let client: Ably.Realtime | null = null;

/**
 * One socket for every channel in the tab. Creating a client per provider would
 * open a second websocket and a second token fetch for the same user.
 */
export function getRealtimeClient() {
  if (typeof window === "undefined") return null;

  if (!client) {
    client = new Ably.Realtime({ authUrl: "/api/ably-auth" });
  }

  return client;
}
