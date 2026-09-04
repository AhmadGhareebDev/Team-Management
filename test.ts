import { db } from "@/db";
import { workspaceMembers } from "@/db/schemas/workspaceMembers";
import { eq } from "drizzle-orm";
import { project } from "@/db/schemas";


export async function getWorkspaceMembers(workspaceId: string) {
    const members = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId , workspaceId),
        with: {
            user: {
                columns: {
                    id: true,
                    name: true,
                    username: true,
                    avatar_url: true,
                }
            }
        }
    })
    return members

}
export async function getUserWorkSpaces(userId: string) {
    return await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
        with: {
            workspace: {
                columns: {
                    id: true,
                    name: true,
                    cover_url: true,
                }
            }
        }
    })
}

export async function getWorkspaceProjectsWithMembers(workspaceId: string) {
    return await db.query.project.findMany({
        where: eq(project.workspaceId, workspaceId),
        columns: {
            id: true,
            name: true,
            cover_url: true,
        },
        with: {
            members: {
                columns: {},
                with: {
                    user: {
                        columns: {
                            id: true,
                            avatar_url: true,
                        }
                    }
                }
            }
        }
    })
}


async function main() {
    const projects = await getWorkspaceProjectsWithMembers("540dee26-ed85-45b8-a5cf-f1a935faa1a3")
    console.log(JSON.stringify(projects, null, 2))
}

main()
