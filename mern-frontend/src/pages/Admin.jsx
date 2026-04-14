import { useState, useEffect, useCallback } from "react";
import API from "../services/axiosInstance";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Loader2, Archive, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("projects");

  /* ================= PROJECTS ================= */
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectFilter, setProjectFilter] = useState("all"); // all | active | archived
  const [expandedProjectId, setExpandedProjectId] = useState(null)

  const fetchProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const res = await API.get("/admin/projects", {
        params: { status: projectFilter },
      });
      console.log(res.data.projects);
      setProjects(res.data.projects || []);
    } catch {
      toast.error("Failed to fetch projects");
    } finally {
      setLoadingProjects(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    if (activeTab === "projects") fetchProjects();
  }, [activeTab, fetchProjects]);

  const handleArchiveProject = async (projectId) => {
    try {
      await API.put(`/admin/projects/${projectId}/archive`)
      setProjects((prev) =>
        prev.map((p) =>
          p._id === projectId ? { ...p, isArchived: true } : p
        )
      )
      toast.success("Project archived")
    } catch {
      toast.error("Failed to archive project")
    }
  }

  const handleUnarchiveProject = async (projectId) => {
    try {
      await API.put(`/admin/projects/${projectId}/unarchive`)
      setProjects((prev) =>
        prev.map((p) =>
          p._id === projectId ? { ...p, isArchived: false } : p
        )
      )
      toast.success("Project unarchived")
    } catch {
      toast.error("Failed to unarchive project")
    }
  }

  // =======================
  // 👤 USERS (ADMIN)
  // =======================
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [filters, setFilters] = useState({
    q: "",
    role: "all",
    status: "all",
  })

  const fetchUsers = async (pageNum = 1) => {
    try {
      setLoadingUsers(true)

      const res = await API.get("/admin/users", {
        params: {
          page: pageNum,
          limit: 10,
          q: filters.q || undefined,
          role: filters.role !== "all" ? filters.role : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
        },
      })

      setUsers(res.data.users)
      setTotalPages(res.data.totalPages)
      setPage(pageNum)
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (activeTab === "users") fetchUsers(page)
  }, [activeTab, page])

  const handleRoleChange = async (userId, role) => {
    try {
      await API.put(`/admin/user/${userId}/role`, { role })
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role } : u))
      )
      toast.success("Role updated")
    } catch {
      toast.error("Failed to update role")
    }
  }

  const toggleUserStatus = async (user) => {
    const endpoint = user.active ? "deactivate" : "reactivate"

    try {
      await API.put(`/admin/user/${user._id}/${endpoint}`)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, active: !u.active } : u
        )
      )
      toast.success(`User ${endpoint}d`)
    } catch {
      toast.error("Action failed")
    }
  }

  // =======================
  // 📊 AUDIT LOGS (ADMIN)
  // =======================
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [logTotalPages, setLogTotalPages] = useState(1)

  const [logFilters, setLogFilters] = useState({
    action: "all",
    targetType: "all",
  })

  const fetchLogs = async (pageNum = 1) => {
    try {
      setLoadingLogs(true)

      const res = await API.get("/admin/activity", {
        params: {
          page: pageNum,
          limit: 10,
          action:
            logFilters.action !== "all"
              ? logFilters.action
              : undefined,
          targetType:
            logFilters.targetType !== "all"
              ? logFilters.targetType
              : undefined,
        },
      })

      setLogs(res.data.activity || res.data)
      setLogTotalPages(res.data.totalPages || 1)
      setLogPage(pageNum)
    } catch {
      toast.error("Failed to fetch audit logs")
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    if (activeTab === "logs") fetchLogs(logPage)
  }, [activeTab, logPage])



  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="logs">Activity</TabsTrigger>
        </TabsList>

        {/* ================= PROJECTS TAB ================= */}
        <TabsContent value="projects">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>

          <CardContent>
            {loadingProjects ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects found
              </p>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project._id}
                    className={`border rounded p-4 flex justify-between items-start ${
                      project.isArchived ? "opacity-60" : ""
                    }`}
                  >
                    {/* LEFT */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-base">
                          {project.name}
                        </p>

                        {project.isArchived && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            Archived
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Owner:{" "}
                        <span className="font-medium">
                          {project.owner?.username || "Unknown"}
                        </span>
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Created on{" "}
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        Members: {project.members?.length || 0}
                      </p>
                    </div>

                    {/* RIGHT ACTIONS */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setExpandedProjectId(
                            expandedProjectId === project._id ? null : project._id
                          )
                        }
                      >
                        Inspect
                      </Button>

                      {project.isArchived ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnarchiveProject(project._id)}
                        >
                          Unarchive
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleArchiveProject(project._id)}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                    {expandedProjectId === project._id && (
                      <div className="mt-4 bg-muted/40 border rounded p-4 text-sm space-y-3">
                        {/* DESCRIPTION */}
                        {project.description && (
                          <div>
                            <p className="font-medium">Description</p>
                            <p className="text-muted-foreground">
                              {project.description}
                            </p>
                          </div>
                        )}

                        {/* OWNER */}
                        <div>
                          <p className="font-medium">Owner</p>
                          <p>
                            {project.owner?.username} · {project.owner?.email}
                          </p>
                        </div>

                        {/* MEMBERS */}
                        <div>
                          <p className="font-medium mb-1">
                            Members ({project.members?.length || 0})
                          </p>

                          {project.members?.length ? (
                            <ul className="space-y-1">
                              {project.members.map((m, idx) => (
                                <li
                                  key={idx}
                                  className="flex justify-between border rounded px-2 py-1"
                                >
                                  <span>
                                    {m.user?.username || "Unknown user"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {m.projectRole}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground">
                              No members
                            </p>
                          )}
                        </div>

                        {/* INVITES */}
                        <div>
                          <p className="font-medium mb-1">
                            Pending Invitations ({project.invitations?.length || 0})
                          </p>

                          {project.invitations?.length ? (
                            <ul className="space-y-1">
                              {project.invitations.map((inv, idx) => (
                                <li
                                  key={idx}
                                  className="flex justify-between text-xs border rounded px-2 py-1"
                                >
                                  <span>{inv.email}</span>
                                  <span className="text-muted-foreground">
                                    expires {new Date(inv.expires).toLocaleDateString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground">
                              No pending invites
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
        <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <input
                className="border px-3 py-2 rounded w-56 dark:bg-zinc-800"
                placeholder="Search name or email"
                value={filters.q}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, q: e.target.value }))
                }
              />

              <Select
                value={filters.role}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, role: v }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {["all", "admin", "owner", "editor", "viewer"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {["all", "active", "inactive"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={() => fetchUsers(1)}>
                <RefreshCcw className="h-4 w-4 mr-1" /> Apply
              </Button>
            </div>

            {/* Table */}
            {loadingUsers ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2">User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b">
                      <td className="py-2 font-medium">{u.username}</td>
                      <td>{u.email}</td>

                      <td>
                        <Select
                          value={u.role}
                          onValueChange={(v) =>
                            handleRoleChange(u._id, v)
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["admin", "owner", "editor", "viewer"].map(
                              (r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </td>

                      <td
                        className={
                          u.active ? "text-green-600" : "text-red-600"
                        }
                      >
                        {u.active ? "Active" : "Inactive"}
                      </td>

                      <td>
                        <Button
                          size="sm"
                          variant={u.active ? "destructive" : "outline"}
                          onClick={() => toggleUserStatus(u)}
                        >
                          {u.active ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <span className="text-sm self-center">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="logs">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <Select
              value={logFilters.action}
              onValueChange={(v) =>
                setLogFilters((f) => ({ ...f, action: v }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "all",
                  "CREATE_PROJECT",
                  "ARCHIVE_PROJECT",
                  "UNARCHIVE_PROJECT",
                  "DELETE_PROJECT",
                  "UPDATE_ROLE",
                  "DEACTIVATE_USER",
                  "REACTIVATE_USER",
                ].map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={logFilters.targetType}
              onValueChange={(v) =>
                setLogFilters((f) => ({ ...f, targetType: v }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                {["all", "User", "Project", "System"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => fetchLogs(1)}>
              <RefreshCcw className="h-4 w-4 mr-1" /> Apply
            </Button>
          </div>

          {/* Logs List */}
          {loadingLogs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit logs found
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="border rounded p-3 text-sm"
                >
                  <div className="font-medium">
                    {log.action}
                  </div>

                  <div className="text-muted-foreground">
                    By{" "}
                    <span className="font-medium">
                      {log.user?.username || "System"}
                    </span>{" "}
                    · {log.targetType}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>

                  {log.metadata && (
                    <pre className="bg-muted mt-2 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              disabled={logPage === 1}
              onClick={() => setLogPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span className="text-sm self-center">
              Page {logPage} of {logTotalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={logPage === logTotalPages}
              onClick={() => setLogPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
      </Tabs>
    </div>
  );
}
