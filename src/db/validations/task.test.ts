import { describe, expect, it } from "vitest"
import {
  ALLOWED_TASK_TRANSITIONS,
  allowedTaskTransitions,
  canTransitionTaskStatus,
  TASK_STATUSES,
} from "@/db/validations/task"

/**
 * This matrix is the shared guard behind three call sites: the status dropdown
 * in the task details panel, the quick-advance button on a canvas node, and the
 * server-side check in `updateTaskStatus`. A regression here is an
 * authorization bug, not a cosmetic one, so the expectations below are written
 * from the workflow rule rather than from the current implementation.
 *
 * Rule from projectFeatures.md: todo -> in_progress -> in_review -> done, and
 * anything may revert to todo.
 */
describe("task status transition matrix", () => {
  it("allows only the next step forward", () => {
    expect(canTransitionTaskStatus("todo", "in_progress")).toBe(true)
    expect(canTransitionTaskStatus("in_progress", "in_review")).toBe(true)
    expect(canTransitionTaskStatus("in_review", "done")).toBe(true)
  })

  it("does not let a user skip a stage", () => {
    expect(canTransitionTaskStatus("todo", "in_review")).toBe(false)
    expect(canTransitionTaskStatus("todo", "done")).toBe(false)
    expect(canTransitionTaskStatus("in_progress", "done")).toBe(false)
  })

  it("does not let a status move backwards except to todo", () => {
    expect(canTransitionTaskStatus("in_review", "in_progress")).toBe(false)
    expect(canTransitionTaskStatus("done", "in_review")).toBe(false)
    expect(canTransitionTaskStatus("done", "in_progress")).toBe(false)
  })

  it("allows reverting any stage back to todo", () => {
    expect(canTransitionTaskStatus("in_progress", "todo")).toBe(true)
    expect(canTransitionTaskStatus("in_review", "todo")).toBe(true)
    expect(canTransitionTaskStatus("done", "todo")).toBe(true)
  })

  it("gives the derived blocked status no outgoing transitions", () => {
    // blocked is only ever written by the dependency recompute. If a user could
    // move out of it they would also be able to move a task into it and escape
    // its dependencies.
    expect(allowedTaskTransitions("blocked")).toEqual([])
    expect(canTransitionTaskStatus("blocked", "todo")).toBe(false)
    expect(canTransitionTaskStatus("blocked", "in_progress")).toBe(false)
  })

  it("cannot transition a status to itself", () => {
    for (const status of TASK_STATUSES) {
      expect(canTransitionTaskStatus(status, status)).toBe(false)
    }
  })

  it("covers every status in the enum", () => {
    // A new status added to the schema without a rule here would make
    // allowedTaskTransitions return undefined, so assert on the keys directly.
    expect(Object.keys(ALLOWED_TASK_TRANSITIONS).sort()).toEqual(
      [...TASK_STATUSES].sort()
    )
  })

  it("never lists blocked as a target from any status", () => {
    for (const status of TASK_STATUSES) {
      expect(allowedTaskTransitions(status)).not.toContain("blocked")
    }
  })
})