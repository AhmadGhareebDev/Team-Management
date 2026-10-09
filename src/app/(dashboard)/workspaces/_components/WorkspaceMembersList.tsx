import { Search } from "lucide-react"
import {
  getWorkspaceMembersPage,
  getWorkspaceMemberAssignments,
} from "@/db/queries/workspaces"
import MemberRow from "./MemberRow"
import { Card } from "@/components/ui/card"
import ListPager from "@/components/web/ListPager"
import UrlSelect from "@/components/web/UrlSelect"
import type { UrlSelectOption } from "@/components/web/UrlSelect"
import { PAGE_SIZES, toParams } from "@/lib/pagination"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"

const ROLE_OPTIONS: UrlSelectOption[] = [
  { value: "all", label: "All roles" },
  { value: "owner", label: "Owners" },
  { value: "admin", label: "Admins" },
  { value: "member", label: "Members" },
]

const SORT_OPTIONS: UrlSelectOption[] = [
  { value: "joined", label: "Joined first" },
  { value: "role", label: "Role" },
  { value: "name", label: "Name" },
]

const PAGE_SIZE = PAGE_SIZES.members

export default async function WorkspaceMembersList({
  workspaceId,
  role,
  searchParams,
}: {
  workspaceId: string
  role: WorkspaceRole | null
  searchParams: Record<string, string | string[] | undefined>
}) {
  const isManager = role === "owner" || role === "admin"
  const params = toParams(searchParams)

  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const memberRole =
    params.role === "owner" || params.role === "admin" || params.role === "member"
      ? params.role
      : undefined
  const search = params.q
  const sort =
    params.sort === "role" || params.sort === "name" ? params.sort : "joined"

  const [membersResult, assignments] = await Promise.all([
    getWorkspaceMembersPage(workspaceId, {
      page,
      pageSize: PAGE_SIZE,
      role: memberRole,
      search,
      sort,
    }),
    isManager
      ? getWorkspaceMemberAssignments(workspaceId)
      : Promise.resolve(null),
  ])

  const members = membersResult.items
  const total = membersResult.total

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form className="relative" action={`/workspaces/${workspaceId}`} method="get">
          <input type="hidden" name="role" value={memberRole ?? ""} />
          <input type="hidden" name="sort" value={sort} />
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search members"
            aria-label="Search members"
            className="h-9 w-full rounded-md border border-border/60 bg-background pl-7 pr-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </form>
        <UrlSelect
          param="role"
          value={memberRole}
          options={ROLE_OPTIONS}
          params={params}
          ariaLabel="Filter members by role"
        />
        <UrlSelect
          param="sort"
          value={sort}
          options={SORT_OPTIONS}
          params={params}
          ariaLabel="Sort members"
        />
      </div>

      {members.length === 0 ? (
        <Card className="border-0 bg-card py-10 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-foreground/5">
          No members match these filters.
        </Card>
      ) : (
        <>
          <Card className="max-h-[32rem] overflow-y-auto border-0 bg-card shadow-sm ring-1 ring-foreground/5">
            <div className="divide-y divide-border">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  role={role}
                  workspaceId={workspaceId}
                  assignments={
                    assignments
                      ? assignments.get(member.user.id)
                      : undefined
                  }
                />
              ))}
            </div>
          </Card>

          <ListPager
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            params={params}
            noun="members"
          />
        </>
      )}
    </div>
  )
}