import { WorkspaceSettingsSkeleton } from "@/components/skeletons"

/**
 * This page blocks on `requireWorkspaceManager`, which reads the session cookie
 * before anything can render, so the whole body is replaced while it resolves.
 */
export default function Loading() {
  return <WorkspaceSettingsSkeleton />
}