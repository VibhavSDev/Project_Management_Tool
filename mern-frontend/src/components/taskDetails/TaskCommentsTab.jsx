// src/components/taskDetails/TaskCommentsTab.jsx
import { useEffect, useState } from "react";
import API from "../../services/axiosInstance";
import toast from "react-hot-toast";
import { FaTrash } from "react-icons/fa";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../shared/useAuth";

const TaskCommentsTab = ({ taskId, projectId }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const REACTIONS = ["👍", "❤️", "😂", "🎉", "👀"];
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [members, setMembers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const projectUsers = members;

  const fetchComments = async () => {
    try {
      const res = await API.get(`/comments/${taskId}`);
      console.log(res.data)
      setComments(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !taskId) return;

    socket.emit("joinTask", taskId);

    return () => {
      socket.emit("leaveTask", taskId);
    };
  }, [socket, taskId]);


  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    try {
      setSending(true);
      await API.post(`/comments/${taskId}`, { text: newComment });
      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add comment");
    } finally {
      setSending(false)
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await API.delete(`/comments/${commentId}/delete`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success("Comment deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete comment");
    }
  };

  const handleReact = async (commentId, emoji) => {
    try {
      await API.patch(`/comments/${commentId}/react`, { emoji });
    } catch (err) {
      console.error(err);
      toast.error("Failed to react");
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment._id);
    setEditingText(comment.text);
  };

  const saveEdit = async (commentId) => {
    if (!editingText.trim()) return;

    try {
      await API.patch(`/comments/${commentId}`, {
        text: editingText,
      });

      setEditingId(null);
      setEditingText("");
    } catch {
      toast.error("Failed to update comment");
    }
  };

  // 4️⃣ SOCKET: listen for real-time events
  useEffect(() => {
    if (!socket) return;

    const onCommentAdded = (comment) => {
      if (comment.task !== taskId) return;
      setComments(prev => {
        if (prev.some(c => c._id === comment._id)) return prev;
        return [comment, ...prev];
      });
    };

    const onCommentDeleted = (commentId) => {
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    };

    const onCommentReacted = (updatedComment) => {
      if (updatedComment.task !== taskId) return;

      setComments(prev =>
        prev.map(c => c._id === updatedComment._id ? updatedComment : c)
      );
    };

    const onCommentUpdated = (updatedComment) => {
      console.log(updatedComment);
      setComments(prev =>
        prev.map(c => c._id === updatedComment._id ? updatedComment : c)
      );
    };

    
    socket.on("commentAdded", onCommentAdded);
    socket.on("commentDeleted", onCommentDeleted);
    socket.on("commentReacted", onCommentReacted);
    socket.on("commentUpdated", onCommentUpdated);

      return () => {
        socket.off("commentAdded", onCommentAdded);
        socket.off("commentDeleted", onCommentDeleted);
        socket.off("commentReacted", onCommentReacted);
        socket.off("commentUpdated", onCommentUpdated);
      };
    }, [socket, taskId]);

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  useEffect(() => {
    API.get(`/projects/${projectId}/members`)
      .then(res => setMembers(res.data))
      .catch(() => {});
  }, [projectId]);

  const hasUserReacted = (reaction) =>
    reaction.users.some(u => u === user.id || u?._id === user.id);

  if (loading) return <p className="text-gray-500">Loading comments...</p>;

  return (
    <div className="space-y-4">
      {/* Add new comment */}
      <form
        onSubmit={handleAddComment}
        className="flex items-end gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow"
      >
        <textarea
          placeholder="Write a comment..."
          value={newComment}
          disabled={sending}
          onChange={(e) => {
            const value = e.target.value;
            setNewComment(value);

            const cursorPos = e.target.selectionStart;
            const textBeforeCursor = value.slice(0, cursorPos);

            const match = textBeforeCursor.match(/@(\w*)$/);

            if (match) {
              setMentionQuery(match[1]);
              setShowMentions(true);
            } else {
              setShowMentions(false);
              setMentionQuery("");
            }
          }}
          className="flex-1 px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white resize-none"
          rows={2}
        />
        {showMentions && projectUsers.length > 0 && (
          <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border rounded-lg shadow">
            {projectUsers
              .filter(u =>
                u.username.toLowerCase().startsWith(mentionQuery.toLowerCase())
              )
              .slice(0, 5)
              .map(u => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => {
                    const updatedText = newComment.replace(
                      /@(\w*)$/,
                      `@${u.username} `
                    );
                    setNewComment(updatedText);
                    setShowMentions(false);
                    setMentionQuery("");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-100 dark:hover:bg-gray-700"
                >
                  @{u.username}
                </button>
              ))}
          </div>
        )}
        <button
          type="submit"
          disabled={sending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {sending ? "Sending..." : "Add"}
        </button>
      </form>

      {/* List comments */}
      <ul className="space-y-3">
      {comments.length === 0 && (
        <p className="text-gray-500">No comments yet.</p>
      )}
      {comments.map((c) => (
        <li
          key={c._id}
          className="group p-3 rounded-lg bg-white dark:bg-gray-800 flex justify-between items-start shadow-sm"
        >
          <div className="flex-1">
            {/* Username + timestamp */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {c.author?.username || "Unknown"}
              </span>
              <span className="text-xs text-gray-500">
                • {new Date(c.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit"  
                  })}
              </span>
            </div>

            {/* Comment text */}
            {/* COMMENT BODY */}
            {editingId === c._id ? (
              <div className="space-y-2 mt-1">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full px-2 py-1 rounded border dark:bg-gray-700"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => saveEdit(c._id)}
                    className="text-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-gray-800 dark:text-gray-200">
              {c.text.split(/(@\w+)/g).map((part, i) =>
                part.startsWith("@") ? (
                  <span
                    key={i}
                    className="text-indigo-600 dark:text-indigo-400 font-medium"
                  >
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
            )}


            {/* REACTIONS */}
            <div className="flex items-center gap-2 mt-2">
              {(c.reactions || []).map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => handleReact(c._id, r.emoji)}
                  className={`px-2 py-0.5 rounded-full text-sm border flex items-center gap-1
                    ${
                      hasUserReacted(r)
                        ? "bg-indigo-100 border-indigo-400 text-indigo-700"
                        : "bg-gray-100 dark:bg-gray-700"
                    }
                  `}
                >
                  <span>{r.emoji}</span>
                  <span className="text-xs">{r.users.length}</span>
                </button>
              ))}

              {/* ADD REACTION */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(c._id, emoji)}
                      className="hover:scale-125 transition text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
          </div>
          </div>

          {/* Delete button */}
          <div className="flex gap-2 text-sm">
            {c.author?._id === user.id && (
              <>
                <button
                  onClick={() => startEdit(c)}
                  className="text-indigo-500"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteComment(c._id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
    </div>
  );
};

export default TaskCommentsTab;
