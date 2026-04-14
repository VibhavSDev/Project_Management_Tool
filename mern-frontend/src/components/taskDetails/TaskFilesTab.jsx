import { useEffect, useState } from "react";
import API from "../../services/axiosInstance";
import toast from "react-hot-toast";
import {
  FaTrash,
  FaDownload,
  FaFileUpload,
  FaFileAlt,
} from "react-icons/fa";
import { useSocket } from "../../contexts/SocketContext";

const TaskFilesTab = ({ taskId }) => {
  const { socket } = useSocket();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [preview, setPreview] = useState(null); // for image preview modal

  const fetchFiles = async () => {
    try {
      const res = await API.get(`/files/task/${taskId}?includeDeleted=true`);
      setFiles(res.data);
      console.log(res.data);
    } catch (err) {
      toast.error("Failed to load files");
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [taskId]);

  useEffect(() => {
    if (!socket || !taskId) return;

    socket.emit("joinTask", taskId);

    const onFileUploaded = (file) => {
      if (file.task !== taskId) return;

      setFiles(prev => {
        if (prev.some(f => f._id === file._id)) return prev;
        return [file, ...prev];
      });
    };

    const onFileDeleted = (fileId) => {
      setFiles(prev => prev.filter(f => f._id !== fileId));
    };

    const onFileRestored = (file) => {
      setFiles(prev =>
        prev.map(f => (f._id === file._id ? file : f))
      );
    };

    socket.on("fileUploaded", onFileUploaded);
    socket.on("fileDeleted", onFileDeleted);
    socket.on("fileRestored", onFileRestored);

    return () => {
      socket.emit("leaveTask", taskId);
      socket.off("fileUploaded", onFileUploaded);
      socket.off("fileDeleted", onFileDeleted);
      socket.off("fileRestored", onFileRestored);
    };
  }, [socket, taskId]);

  // ✅ Upload new file(s)
  const handleUpload = async (e) => {
    const formData = new FormData();
    for (let file of e.target.files) {
      formData.append("files", file);
    }

    try {
      setUploading(true);
      await API.post(`/uploads/${taskId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("File(s) uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Download file
  const handleDownload = async (fileId, filename) => {
    try {
      const res = await API.get(`/files/download/${fileId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Download failed");
    }
  };

  // ✅ Delete (soft delete)
  const handleDelete = async (fileId) => {
    try {
      await API.delete(`/files/${fileId}`);
      toast.success("File deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handleRestore = async (fileId) => {
    try {
      await API.patch(`/files/${fileId}/restore`);
      toast.success("File restored");
    } catch {
      toast.error("Restore failed");
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="space-y-4">
      {/* Upload input */}
      <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-600 hover:underline">
        <FaFileUpload /> Upload files
        <input
          type="file"
          multiple
          hidden
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>

      <button
        onClick={() => setShowDeleted(!showDeleted)}
        className="text-sm text-indigo-600 hover:underline"
      >
        {showDeleted ? "Hide deleted files" : "Show deleted files"}
      </button>

      {/* Files grid */}
      {files.length === 0 ? (
        <p className="text-gray-500 text-sm">No files uploaded yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {files
            .filter(f => showDeleted ? f.isDeleted : !f.isDeleted)
            .map((f) => (
            <div
              key={f._id}
              className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow-md flex flex-col min-h-[180px]"
            >
              {/* Thumbnail / Icon */}
              <div className="flex justify-center mb-3">
                {f.mimetype?.startsWith("image/") ? (
                  <img
                    src={f.url}
                    alt={f.filename}
                    className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                    onClick={() => setPreview(f.url)}
                  />
                ) : (
                  <FaFileAlt className="text-gray-400 text-6xl" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 text-center">
                <p className="font-semibold text-gray-900 dark:text-gray-100 break-words">
                  {f.originalname}
                </p>
                {f.uploader && (
                  <p className="text-xs text-gray-500">
                    by {f.uploader.username || "Unknown"}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {new Date(f.createdAt).toLocaleDateString()} •{" "}
                  {formatSize(f.size)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4 mt-3">
                {f.isDeleted ? (
                  <button
                    onClick={() => handleRestore(f._id)}
                    className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                    title="Restore"
                  >
                    ♻️
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleDownload(f._id, f.filename)}
                      className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                    >
                      <FaDownload />
                    </button>
                    <button
                      onClick={() => handleDelete(f._id)}
                      className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="Preview"
            className="max-w-[90%] max-h-[90%] rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default TaskFilesTab;
