/**
 * Single place where error codes become user-facing copy.
 *
 * Rules:
 * - Server actions keep returning their short codes; this module is the only
 *   thing that turns them into sentences.
 * - Raw codes and raw provider messages (ImageKit, Better Auth, Drizzle) never
 *   reach the UI. Unknown codes fall back to a caller-provided message instead
 *   of leaking the code itself.
 * - When Sentry lands, this is the single place to report from.
 */

export const genericActionError = "Something went wrong. Please try again."

export const actionErrorMessages: Record<string, string> = {
  UNAUTHENTICATED: "You need to be logged in to do this.",
  UNAUTHORIZED: "You are not a member of this workspace.",
  FORBIDDEN: "You don't have permission to do this.",
  INVALID_DATA:
    "Some of the information you entered isn't valid. Please check it and try again.",
  INTERNAL_ERROR: "Something went wrong on our end. Please try again in a moment.",
  INTERNAL_SERVER_ERROR: "Something went wrong on our end. Please try again in a moment.",

  NOT_FOUND: "We couldn't find what you were looking for.",
  PROJECT_NOT_FOUND: "This project no longer exists.",
  TASK_NOT_FOUND: "This task no longer exists.",
  DEPENDENCY_NOT_FOUND: "This dependency no longer exists.",
  SUBTASK_NOT_FOUND: "This subtask no longer exists.",
  TARGET_NOT_FOUND: "That member is no longer part of this workspace.",

  ALREADY_MEMBER: "This user is already a member.",
  ALREADY_INVITED: "This user already has a pending invitation.",
  ALREADY_HANDLED: "This invitation has already been answered.",
  NOT_WORKSPACE_MEMBER: "This user isn't a member of this workspace.",
  NOT_PROJECT_MEMBER: "This user isn't a member of this project.",
  INVALID_TRANSITION: "That change isn't allowed for this member.",
  INVALID_STATUS_TRANSITION:
    "This task can't move to that status from where it is now.",

  BLOCKED_DEPENDENCY: "This task is still waiting on other tasks.",
  SELF_DEPENDENCY: "A task can't depend on itself.",
  ALREADY_DEPENDENT: "These tasks are already linked.",
  CYCLIC_DEPENDENCY: "That link would create a loop, so it wasn't added.",
  INVALID_ASSIGNEE: "One of the selected people isn't a member of this project.",

  FAILED_TO_DELETE_FILE: "We couldn't delete the previous image.",
}

/**
 * Maps an action error code to a sentence. Never returns the raw code: for
 * unknown codes it returns the caller's context-specific fallback.
 */
export function resolveActionError(
  errorCode: string | null | undefined,
  fallback: string = genericActionError,
  overrides?: Record<string, string>
): string {
  if (!errorCode) return fallback
  return overrides?.[errorCode] ?? actionErrorMessages[errorCode] ?? fallback
}

export const rateLimitMessage = "Too many attempts. Please wait a minute and try again."

type AuthError = {
  code?: string | null
  status?: number | null
}

export const authErrorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
  INVALID_PASSWORD: "Your current password is incorrect.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Try logging in instead.",
  EMAIL_NOT_VERIFIED: "Please verify your email before continuing.",
  INVALID_TOKEN: "This link is invalid. Please request a new one.",
  TOKEN_EXPIRED: "This link has expired. Please request a new one.",
  OTP_EXPIRED: "This code has expired. Request a new one.",
  TOO_MANY_ATTEMPTS: "Too many attempts. Please wait and try again.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
}

/**
 * Maps a Better Auth client error to a sentence. Status 429 always wins so
 * rate limits read the same everywhere. Never returns the provider message.
 */
export function resolveAuthError(
  error: AuthError | null | undefined,
  fallback: string = genericActionError
): string {
  if (!error) return fallback
  if (error.status === 429) return rateLimitMessage
  if (error.code && authErrorMessages[error.code]) return authErrorMessages[error.code]
  return fallback
}

export const uploadErrorMessages = {
  invalidFileType: "Please choose a PNG or JPG image.",
  fileTooLarge: "That image is larger than 2MB. Please choose a smaller one.",
  sessionExpired: "Your session has expired. Please log in again, then retry the upload.",
  startFailed: "We couldn't start the upload. Please try again in a moment.",
  rejected: "The image service rejected this upload. Please try again in a moment.",
  network: "We couldn't reach the image service. Check your connection and try again.",
  serviceError:
    "The image service is having trouble right now. Please try again in a few minutes.",
  aborted: "The upload was cancelled.",
  saveFailed: "The image uploaded, but we couldn't save it to your profile. Please try again.",
  failed: "We couldn't upload your image. Please try again.",
} as const
