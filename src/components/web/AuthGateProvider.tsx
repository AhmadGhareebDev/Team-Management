"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Modal } from "@/components/web/Modal"

export type WorkspaceRole = "owner" | "admin" | "member"

type RequireOptions = {
  role?: WorkspaceRole | null
  requiredRole?: WorkspaceRole[]
  onAllowed?: () => void
}

type GateState =
  | { variant: "login"; onAllowed: () => void }
  | {
      variant: "forbidden"
      requiredRole: WorkspaceRole[]
      onAllowed: () => void
    }
  | null

type AuthGateContextValue = {
  require: (options?: RequireOptions) => void
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null)

const noop = () => {}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext)
  if (!ctx) {
    throw new Error("useAuthGate must be used within an AuthGateProvider")
  }
  return ctx
}

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const isAuthenticated = Boolean(session)
  const pendingRef = useRef<RequireOptions | null>(null)
  const [state, setState] = useState<GateState>(null)

  const close = useCallback(() => setState(null), [])

  const require = useCallback(
    (options: RequireOptions = {}) => {
      if (!isAuthenticated) {
        setState({
          variant: "login",
          onAllowed: options.onAllowed ?? noop,
        })
        return
      }

      if (options.requiredRole?.length) {
        if (!options.role || !options.requiredRole.includes(options.role)) {
          setState({
            variant: "forbidden",
            requiredRole: options.requiredRole,
            onAllowed: options.onAllowed ?? noop,
          })
          return
        }
      }

      options.onAllowed?.()
    },
    [isAuthenticated]
  )

  useEffect(() => {
    if (!isPending && pendingRef.current) {
      const pending = pendingRef.current
      pendingRef.current = null
      require(pending)
    }
  }, [isPending, require])

  return (
    <AuthGateContext.Provider value={{ require }}>
      {children}

      {state?.variant === "login" && (
        <Modal
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) close()
          }}
          title="Login required"
          description="This action requires you to be logged in. Please log in to continue."
          cancelLabel="Cancel"
          confirmLabel="Go to Login"
          onConfirm={() => {
            close()
            router.push("/auth/login")
          }}
        />
      )}

      {state?.variant === "forbidden" && (
        <Modal
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) close()
          }}
          title="Permission required"
          description={`Only ${state.requiredRole.join(
            " and "
          )} can perform this action. If you believe this is a mistake, contact the workspace owner.`}
          cancelLabel="Cancel"
          confirmLabel="Got it"
          onConfirm={close}
        />
      )}
    </AuthGateContext.Provider>
  )
}