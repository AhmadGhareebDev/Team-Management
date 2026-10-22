import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getUserWorkSpacesPage } from "@/db/queries/workspaces"
import { WorkSpaceCard } from "./WorkSpaceCard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { EmptyState } from "@/components/web/EmptyState"
import ListPager from "@/components/web/ListPager"
import UrlSelect from "@/components/web/UrlSelect"
import type { UrlSelectOption } from "@/components/web/UrlSelect"
import { PAGE_SIZES, toParams } from "@/lib/pagination"
import { CreateWorkSpace } from "./CreateWorkSpace"

const SORT_OPTIONS: UrlSelectOption[] = [
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
]

export default async function WorkspacesList({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">You need to be logged in to create workspaces.</p>
        <Link href="/auth/login">
          <Button>Log in</Button>
        </Link>
      </div>
    )
  }

  const params = toParams(searchParams)
  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const sort = params.sort === "newest" ? "newest" : "name"
  const pageSize = PAGE_SIZES.workspaces

  const result = await getUserWorkSpacesPage(session.user.id, {
    page,
    pageSize,
    sort,
  })

  const workspaces = result.items
  const total = result.total

  return (
    <div className="col-span-full flex flex-col gap-4">
      <div
        role="group"
        aria-label="Sort workspaces"
        className="flex flex-wrap items-center gap-2"
      >
        <UrlSelect
          param="sort"
          value={sort}
          options={SORT_OPTIONS}
          params={params}
          ariaLabel="Sort workspaces"
        />
      </div>

      {workspaces.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={total === 0 ? "No workspaces yet" : "No workspaces match"}
          description={
            total === 0
              ? "Create your first workspace to start planning work with your team."
              : "Try a different sort order."
          }
          action={total === 0 ? <CreateWorkSpace /> : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <WorkSpaceCard key={workspace.id} workspace={workspace} />
            ))}
          </div>

          <ListPager
            page={page}
            total={total}
            pageSize={pageSize}
            params={params}
            noun="workspaces"
          />
        </>
      )}
    </div>
  )
}