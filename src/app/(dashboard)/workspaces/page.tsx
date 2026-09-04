import { CreateWorkSpace } from "./_components/CreateWorkSpace"
import WorkspacesList from "./_components/WorkspacesList"

export const instant = false

export default function WorkSpacesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          WorkSpaces
        </h1>
        <CreateWorkSpace />
      </div>

      {/* Grid for Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <WorkspacesList />
      </div>
    </div>
  )
}