Here's the complete feature list in build order:

Auth (Done ✅)
User can sign up with name, username, email, password
User can log in
User can verify email with 6-digit OTP
User can request password reset
User can reset password via email link
User Profile (Done ✅)
User can change their name
User can change their username
User can upload/change avatar (ImageKit)
User can change password
User can delete their account
Workspaces
User can create a workspace (becomes owner automatically)
User can see all workspaces they belong to
User can open a workspace detail page
Owner & Admin can update workspace name
Owner & Admin can upload/change workspace cover image
Owner & Admin can invite members to workspace by username search
Invited user receives an invitation notification
User can accept or decline a workspace invitation
Owner & Admin can remove a member from the workspace
When member is removed, their assigned tasks become unassigned and Owner & Admin are notified
Owner can promote a member to Admin
Owner can demote an Admin to member
Owner & Admin can see all members with their roles
Projects
Owner & Admin can create a project inside a workspace
Owner & Admin can add workspace members to a project
Owner & Admin can remove a member from a project
Owner & Admin can update project name and description
Owner & Admin can upload/change project cover image
User can see all projects they belong to inside a workspace
Owner & Admin can see all projects in the workspace
Each project card shows member avatars
Tasks
Owner & Admin can create a task inside a project
Task has title, description, status, priority, due date
Owner & Admin can assign one or more members to a task
Owner & Admin can reassign a task to different members
Owner & Admin can extend a task deadline
Any project member can update task status (To Do → In Progress → In Review → Done)
Owner & Admin can set task dependencies (this task depends on that task)
Blocked tasks show a Blocked status
When a dependency task is marked Done → assignees of the blocked task are notified
If a dependency task passes its deadline without being Done → assignees notified, Owner & Admin notified, blocked tasks show Dependency Overdue flag
When deadline is extended or task reassigned → blocked tasks notified that dependency is back on track
Subtasks
Any task assignee can create subtasks inside a task
Subtask has a title and a checkbox only
Only the subtask creator can check it off
All project members can see all subtasks of all tasks in the project
Task shows a progress indicator based on subtasks (e.g. 3/5 done)
Notifications
User notified when invited to a workspace
User notified when assigned to a task
User notified when a task they are blocked on is completed
User notified when a dependency task becomes overdue
User notified when their task deadline is approaching
User notified when their task is reassigned away from them
Owner & Admin notified when a task is overdue
Owner & Admin notified when an overdue task is blocking other tasks
Owner & Admin notified when a member is removed and their tasks become unassigned
Real-time (Ably)
Task status changes update live for all project members without refresh
Dashboards
Personal dashboard: user sees their assigned tasks, what is due soon, what is blocked, recent activity
Workspace level (Owner & Admin): all projects with progress percentage, project health, all members and their current assignments
Project level (Owner & Admin): all tasks with statuses, overdue tasks highlighted, blocked tasks and reasons
Member profile view (Owner & Admin): click any member and see all their tasks, how many done/in progress/overdue