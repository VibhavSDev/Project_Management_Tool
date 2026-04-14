import { useEffect, useState } from 'react';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../shared/useAuth';
import { useSocket } from '../../contexts/SocketContext';

import {
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaCommentDots,
} from 'react-icons/fa';

const emojiList = ['👍', '❤️', '😂', '😮', '😢'];

const CommentsTab = ({ taskId }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  useEffect(() => {
    if (!taskId || !socket) return;

    // Fetch initial comments
    const fetchComments = async () => {
      try {
        const res = await API.get(`/comments/task/${taskId}`);
        setComments(res.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };
    fetchComments();

    // Join the task room
    socket.emit('join', `task:${taskId}`);

    // Listeners
    socket.on('comment:new', (comment) => {
      setComments((prev) => [...prev, comment]);
    });

    socket.on('comment:reaction', ({ commentId, reactions }) => {
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId ? { ...c, reactions } : c
        )
      );
    });

    return () => {
      socket.emit('leave', `task:${taskId}`);
      socket.off('comment:new');
      socket.off('comment:reaction');
    };
  }, [taskId, socket]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await API.post('/comments', { taskId, content: newComment });
      setNewComment('');
      // comment:new will be received via socket
    } catch (err) {
      console.error(err);
      toast.error('Failed to add comment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await API.delete(`/comments/${id}`);
      toast.success('Comment deleted');
      setComments((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete comment');
    }
  };

  const handleEdit = async (id) => {
    if (!editingContent.trim()) return;
    try {
      await API.patch(`/comments/${id}`, { content: editingContent });
      setEditingId(null);
      setEditingContent('');
      const res = await API.get(`/comments/task/${taskId}`);
      setComments(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update comment');
    }
  };

  const handleReaction = async (commentId, emoji) => {
    try {
      await API.patch(`/comments/${commentId}/react`, { emoji });
      // update will be received via socket
    } catch (err) {
      console.error(err);
      toast.error('Failed to react');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <FaCommentDots /> Comments
      </h2>

      {/* New Comment */}
      <form onSubmit={handleAddComment} className="flex flex-col gap-2">
        <textarea
          rows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 dark:text-white resize-none"
        />
        <button
          type="submit"
          className="self-start bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm"
        >
          Add Comment
        </button>
      </form>

      {/* Comments List */}
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 italic">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li
              key={comment._id}
              className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.user?.username || 'Unknown'}{' '}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      • {formatDistanceToNow(new Date(comment.createdAt))} ago
                    </span>
                  </p>

                  {editingId === comment._id ? (
                    <>
                      <textarea
                        rows={3}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="mt-1 w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-white text-sm resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEdit(comment._id)}
                          className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                        >
                          <FaSave /> Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingContent('');
                          }}
                          className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-800 dark:text-gray-300 mt-1">
                      {comment.content}
                    </p>
                  )}

                  {/* Emoji Reactions */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {emojiList.map((emoji) => {
                      const users = comment.reactions?.[emoji] || [];
                      const reacted = users.includes(user.id);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(comment._id, emoji)}
                          className={`text-sm px-2 py-1 rounded border ${
                            reacted
                              ? 'bg-indigo-100 border-indigo-300 dark:bg-indigo-700'
                              : 'bg-gray-100 border-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          {emoji} {users.length > 0 && <span>{users.length}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {comment.user?._id === user.id && editingId !== comment._id && (
                  <div className="flex gap-2 text-sm">
                    <button
                      onClick={() => {
                        setEditingId(comment._id);
                        setEditingContent(comment.content);
                      }}
                      className="text-yellow-500 hover:text-yellow-700"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(comment._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CommentsTab;
