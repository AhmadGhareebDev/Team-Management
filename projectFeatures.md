Auth
Sign up with name, username, email, password
Email verification with 6-digit OTP sent to email
OTP verify page is gated — only reachable via signed JWT token in the URL
Log in with email and password
Forgot password — enter email in login form, triggers reset email
Reset password page — gated, only reachable via Better Auth token in URL
Enter new password and confirm, redirected to login after success
Rate limiting on OTP send and password reset requests
User Profile & Settings
View profile settings page (authenticated only)
Change display name
Change username (must be unique, checked on blur before submit)
Upload avatar image via ImageKit (stores url and file id)
Change avatar (replaces old image, deletes old file from ImageKit)
Change password (requires current password)
Delete account permanently
Workspaces
Create a workspace (creator becomes owner automatically, inserted into workspace_members with role owner)
View all workspaces the user belongs to on the dashboard
Open workspace detail page showing projects and members
Update workspace name (owner & admin only)
Search for users by username to invite them
Send workspace invitation to a user (owner & admin only)
Checks user is not already a member
Checks user is not already invited
Creates row in workspace_invitations with status pending
Creates notification for the invitee with type workspace_invitation
View received workspace invitations in a dedicated invitations section (separate from notifications)
Accept workspace invitation
Creates row in workspace_members with role member
Updates invitation status to accepted
Decline workspace invitation
Updates invitation status to declined
Remove a member from the workspace (owner & admin only)
Cannot remove the owner
Admin cannot remove another admin, only owner can
Cannot remove yourself
Removing a member also removes them from all projects in the workspace
Their assigned tasks become unassigned
Owner & Admin receive notification that member was removed and which tasks are now unassigned
Promote a member to admin (owner only)
Demote an admin to member (owner only)
Transfer ownership to another member (owner only, current owner becomes admin)
View all workspace members with their roles (owner & admin)
Projects
Create a project inside a workspace (owner & admin only)
Creator is automatically added to project_members
View all projects the user belongs to inside a workspace
Owner & Admin can see all projects in the workspace regardless of membership
Open project detail page (canvas)
Add workspace members to a project (owner & admin only)
Remove a member from a project (owner & admin only)
Update project name and description (owner & admin only)
Canvas (Project Task View)
Full screen interactive canvas using React Flow
Floating navbar at top showing project name, description, member avatars with hover tooltip
Zoom in/out, pan around the canvas
Each task is a node on the canvas with:
Title
Status badge (todo, in progress, in review, done, blocked)
Priority badge (low, medium, high, urgent)
Due date
Left accent bar color coded by status
Blocked warning showing which tasks are blocking it
Subtask progress indicator (e.g. 3/5 done) on hover
Subtask list on hover with ability to add and toggle subtasks
Assignee avatars floating vertically beside the node, expanding on hover to show all assignees with name and username
Drag nodes to reposition them, position saved to database on drag release
Draw an arrow between two nodes to create a task dependency (owner & admin only)
Delete an arrow to remove a task dependency (owner & admin only)
Dependency arrows animated, going from blocker task to blocked task
Click a node to open task details panel
Optimistic updates throughout — UI updates instantly, rolls back on error
Tasks
Create a task (owner & admin only)
Title required, description optional
Default status todo, default priority medium
Position auto calculated based on existing task count
Appears on canvas immediately (optimistic)
Task details panel (slide in from right when node clicked)
View and edit title, description, priority, due date (owner & admin only)
View current status with blocked reason if applicable
Mark task as done or revert to todo (assigned members only)
Cannot mark done if task has unfinished dependencies
Assign or reassign members to the task (owner & admin only)
Only project members can be assigned
Save assignees button appears only when changes are pending
Delete task with confirmation (owner & admin only)
Deletes all subtasks and dependencies
Recomputes blocked status for any tasks that depended on it
Update task status (assigned members only)
todo → in_progress → in_review → done
Cannot move to done if blocked by unfinished dependency
When marked done → tasks that depended on it are recomputed
If they have no other pending dependencies → status changes from blocked to todo
Task dependency logic
A task can depend on one or more other tasks
Dependent task status automatically set to blocked when dependency is added and dependency is not done
When a dependency is marked done → dependent task recomputed
Circular dependency detection — adding A→B when B already depends on A is rejected
Self dependency rejected
Duplicate dependency rejected
Task overdue handling
If a task passes its due date without being done → assignees notified
Owner & Admin notified with list of tasks the overdue task is blocking
Blocked tasks show a Dependency Overdue flag
When deadline extended or task reassigned → blocked tasks notified dependency is back on track
Subtasks
Any task assignee can create a subtask inside a task
Subtask has title and checkbox only
Only the creator of a subtask can check it off
All project members can see all subtasks
Subtask list visible on hover of task node
Subtask progress shown as X/Y done
Optimistic add and toggle — updates instantly, rolls back on error
Notifications
Dedicated notifications section in the app
Separate invitations section for workspace invitations
Mark notification as read
User notified when:
Invited to a workspace (goes to invitations section)
Assigned to a task
A task they are blocked on is completed and they can now start
A dependency task becomes overdue (Dependency Overdue flag)
Their own task deadline is approaching
Their task is reassigned away from them
Owner & Admin notified when:
A task in their workspace is overdue
An overdue task is blocking other tasks
A member is removed and their tasks become unassigned
Real-time (Ably)
Task status changes broadcast to all project members
All members on the same project canvas see status updates live without refreshing
Node position changes broadcast so all viewers see dragged nodes move in real time
New task creation broadcast so new nodes appear for all viewers without refresh
Dependency changes (added or removed edges) broadcast live
Dashboards
Personal dashboard
All tasks assigned to the user across all workspaces
Tasks due soon highlighted
Blocked tasks highlighted with reason
Recent activity feed
Workspace dashboard (owner & admin)
All projects with overall progress percentage (done tasks / total tasks)
Project health indicator (healthy / at risk based on overdue tasks)
All workspace members and what they are currently assigned to
Project dashboard (owner & admin)
All tasks with their current statuses
Overdue tasks highlighted
Blocked tasks with their blocking reasons
Overall project health
Member profile view (owner & admin)
Click any member to see all their assigned tasks
Breakdown of done, in progress, and overdue taskss