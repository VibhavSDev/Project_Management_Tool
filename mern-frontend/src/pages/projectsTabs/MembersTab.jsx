// src/components/projects/MembersTab.jsx
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import API from "../../services/axiosInstance";
import toast from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import clsx from "clsx";
import { FaLock, FaTrash, FaEnvelopeOpen } from "react-icons/fa";
import { useAuth } from "../../shared/useAuth";
import { useSocket } from "../../contexts/SocketContext";

const roleOrder = ["owner", "editor", "viewer"];
const roleLabels = { owner: "Owner", editor: "Editor", viewer: "Viewer" };
const roleColors = {
  owner: "bg-purple-100 text-purple-700",
  editor: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-700",
};

const MembersTab = () => {
  const { projectId } = useOutletContext();
  const { user } = useAuth(); // ✅ logged-in user
  const [membersByRole, setMembersByRole] = useState({
    owner: [],
    editor: [],
    viewer: [],
  });
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [inviteRole, setInviteRole] = useState("editor");
  const [sentInvites, setSentInvites] = useState([]);
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);

  // Fetch members ONCE per project
  useEffect(() => {
    if (projectId) {
      fetchMembers();
    }
  }, [projectId]);

  // Fetch sent invites ONLY after role is resolved
  useEffect(() => {
    if (currentUserRole === "owner") {
      fetchSentInvites();
    }
  }, [currentUserRole]);


  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        API.get(`/users/search?q=${searchQuery}`)
          .then((res) => setSearchResults(res.data))
          .catch((err) => console.error("Search error:", err));
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit("joinProject", projectId);

    return () => {
      socket.emit("leaveProject", projectId);
    };
  }, [socket, projectId]);
  
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      const res = await API.get(`/projects/${projectId}`);
      const { members, currentUserRole } = res.data;

      console.log(res.data);
      const grouped = { owner: [], editor: [], viewer: [] };
      members.forEach((m) => {
        grouped[m.projectRole].push(m);
      });

      setMembersByRole(grouped);
      console.log(grouped);

      setCurrentUserRole(currentUserRole);
    } catch (err) {
      toast.error("Failed to fetch members");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !projectId) return;

    const refreshMembers = () => {
      fetchMembers();
      if (currentUserRole === "owner") {
        fetchSentInvites();
      }
    };

    socket.on("memberRoleUpdated", refreshMembers);
    socket.on("memberRemoved", refreshMembers);
    socket.on("memberAdded", refreshMembers);
    socket.on("inviteUpdated", refreshMembers);

    return () => {
      socket.off("memberRoleUpdated", refreshMembers);
      socket.off("memberRemoved", refreshMembers);
      socket.off("memberAdded", refreshMembers);
      socket.off("inviteUpdated", refreshMembers);
    };
  }, [socket, projectId, currentUserRole]);


  const fetchSentInvites = async () => {
    try {
      const res = await API.get(`/projects/${projectId}/invites`);
      setSentInvites(res.data.invitations || []);
    } catch (err) {
      console.error("Failed to fetch sent invites:", err);
    }
  };

  const handleInvite = async (targetUser) => {
    try {
      await API.post(`/projects/${projectId}/invite`, {
        userId: targetUser._id,
        role: inviteRole,
      });
      toast.success(`Invite sent to ${targetUser.username}`);
      setShowInviteModal(false);
      setSearchQuery("");
      setSearchResults([]);
      fetchMembers();
      fetchSentInvites();
    } catch (error) {
      toast.error("Invite failed");
      console.error(error);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    const confirmed = window.confirm("Cancel this invite?");
    if (!confirmed) return;
    try {
      await API.delete(`/projects/${projectId}/invites/${inviteId}`);
      toast.success("Invite canceled");
      fetchSentInvites();
    } catch (err) {
      toast.error("Failed to cancel invite");
      console.error(err);
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    if (destination.droppableId === "owner") {
      toast.error("Owner role cannot be assigned");
      return;
    }

    const member = membersByRole[source.droppableId].find(
      (m) => m.user._id.toString() === draggableId
    );

    if (!member) return;

    try {
      await API.patch(
        `/projects/${projectId}/members/${draggableId}/role`,
        { newRole: destination.droppableId }
      );
      toast.success("Member role updated");
      setMembersByRole((prev) => {
        const sourceList = [...prev[source.droppableId]];
        const destList = [...prev[destination.droppableId]];

        const [moved] = sourceList.splice(source.index, 1);
        moved.projectRole = destination.droppableId;

        return {
          ...prev,
          [source.droppableId]: sourceList,
          [destination.droppableId]: [...destList, moved],
        };
      });
      fetchMembers();
    } catch (err) {
      toast.error("Failed to update role");
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      {/* Invite button */}
      {currentUserRole === "owner" && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowInviteModal(!showInviteModal)}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition"
          >
            {showInviteModal ? "Cancel" : "+ Invite Member"}
          </button>
        </div>
      )}

      {/* ⛔ Prevent DnD mount until role is known */}
      {loading ? (
        <div className="text-center text-gray-500 py-10">
          Loading members…
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleOrder.map((role) => (
              <Droppable droppableId={role} key={role}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      "bg-muted p-4 rounded-lg shadow transition-all min-h-[200px] relative",
                      snapshot.isDraggingOver && "bg-primary/10"
                    )}
                  >
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      {roleLabels[role]}
                      {role === "owner" && (
                        <FaLock className="text-yellow-500" />
                      )}
                    </h3>

                    {membersByRole[role].length === 0 && (
                      <div className="text-sm text-gray-500 italic">
                        No {roleLabels[role]}s
                      </div>
                    )}

                    {membersByRole[role].map((member, index) => {
                      const isOwner = member.projectRole === "owner";
                      const isSelf = member.user._id === user._id;

                      const canDrag =
                        currentUserRole === "owner" && !isOwner;

                      return (
                        <Draggable
                          key={member.user._id}
                          draggableId={member.user._id.toString()}
                          index={index}
                          isDragDisabled={!canDrag}
                          disableInteractiveElementBlocking
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={clsx(
                                "p-3 bg-white dark:bg-zinc-800 rounded shadow mb-2 flex items-center gap-2 transition",
                                snapshot.isDragging && "bg-primary/10",
                                !canDrag && "opacity-80 cursor-not-allowed"
                              )}
                            >
                              <img
                                src={
                                  member.user.avatar
                                    ? `${
                                        import.meta.env.VITE_API_URL.replace(
                                          "/api",
                                          ""
                                        )
                                      }/${member.user.avatar}`
                                    : "/default-avatar.png"
                                }
                                alt={member.user.username}
                                className="w-9 h-9 rounded-full object-cover border"
                              />

                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-1">
                                  {member.user.username}
                                  {isSelf && (
                                    <span className="text-xs text-primary font-normal">
                                      (You)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {member.user.email}
                                </div>
                              </div>

                              {/* Role badge / control */}
                              {isOwner ? (
                                <span
                                  className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded ${roleColors.owner}`}
                                >
                                  <FaLock className="text-yellow-500" /> Owner
                                </span>
                              ) : currentUserRole === "owner" ? (
                                <select
                                  className="text-sm border px-2 py-1 rounded bg-white dark:bg-zinc-700"
                                  value={member.projectRole}
                                  onChange={async (e) => {
                                    const newRole = e.target.value;
                                    try {
                                      await API.patch(
                                        `/projects/${projectId}/members/${member.user._id}/role`,
                                        { newRole }
                                      );
                                      toast.success("Role updated");
                                      fetchMembers();
                                    } catch (err) {
                                      toast.error("Failed to update role");
                                      console.error(err);
                                    }
                                  }}
                                >
                                  <option value="editor">Editor</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              ) : (
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded ${roleColors[member.projectRole]}`}
                                >
                                  {roleLabels[member.projectRole]}
                                </span>
                              )}

                              {/* Remove button */}
                              {currentUserRole === "owner" && !isOwner && (
                                <button
                                  onClick={async () => {
                                    const confirmed = window.confirm(
                                      `Remove ${member.user.username} from the project?`
                                    );
                                    if (!confirmed) return;
                                    try {
                                      await API.delete(
                                        `/projects/${projectId}/members/${member.user._id}`
                                      );
                                      toast.success("Member removed");
                                      fetchMembers();
                                    } catch (err) {
                                      toast.error("Failed to remove member");
                                      console.error(err);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm ml-2"
                                  title="Remove member"
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Sent Invites (Owner only) */}
      {currentUserRole === "owner" && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FaEnvelopeOpen className="text-primary" /> Sent Invites
          </h3>
          {sentInvites.length === 0 ? (
            <div className="text-sm text-gray-500 italic">
              No pending invites.
            </div>
          ) : (
            <div className="space-y-2">
              {sentInvites.map((invite) => (
                <div
                  key={invite._id}
                  className="p-3 bg-white dark:bg-zinc-800 rounded shadow flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{invite.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Role: {invite.role}
                    </div>
                  </div>
                  <button
                    className="text-red-500 hover:text-red-700 text-sm"
                    onClick={() => handleCancelInvite(invite._id)}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded p-6 w-[90%] max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Invite Member</h2>

            <input
              type="text"
              placeholder="Search users by email or username"
              className="w-full mb-3 px-3 py-2 border rounded bg-white dark:bg-zinc-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select
              className="w-full mb-4 px-3 py-2 border rounded bg-white dark:bg-zinc-700"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>

            <div className="max-h-40 overflow-y-auto mb-4">
              {searchResults.length === 0 && searchQuery.trim() && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No users found.
                </div>
              )}
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  className="flex justify-between items-center p-2 hover:bg-muted rounded"
                >
                  <div>
                    <div className="font-medium">{u.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {u.email}
                    </div>
                  </div>
                  <button
                    className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-primary/90"
                    onClick={() => handleInvite(u)}
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>

            <div className="text-right">
              <button
                className="text-sm text-gray-500 hover:underline"
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersTab;
