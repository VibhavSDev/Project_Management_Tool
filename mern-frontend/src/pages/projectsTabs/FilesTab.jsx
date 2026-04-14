import { useEffect, useState, useRef } from 'react';
import API from '../../services/axiosInstance';
import { useOutletContext } from 'react-router-dom';
import { 
  FaTrash, FaDownload, FaUndo, FaUpload, FaHistory, FaChevronDown, FaChevronRight 
} from 'react-icons/fa';
import { MdDeleteForever } from 'react-icons/md';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const formatFileSize = (size) => {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / 1024).toFixed(2)} KB`;
};

const FilesTab = () => {
  const { projectId } = useOutletContext();
  const [filesByTask, setFilesByTask] = useState({});
  const [projectTasks, setProjectTasks] = useState([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [fileVersionMap, setFileVersionMap] = useState({});
  const [filterText, setFilterText] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');
  const [dragOverTask, setDragOverTask] = useState(null);

  const dropRefs = useRef({});

  useEffect(() => {
  fetchFiles();
  fetchTasks();
}, [projectId, showRecycleBin]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // ✅ include deleted when recycle bin is active
      const url = showRecycleBin
        ? `/files/project/${projectId}?includeDeleted=true`
        : `/files/project/${projectId}`;

      const res = await API.get(url);
      const grouped = {};
      res.data.forEach(file => {
        if (!grouped[file.task?._id]) grouped[file.task._id] = { task: file.task, files: [] };
        grouped[file.task._id].files.push(file);
      });
      console.log(grouped)
      setFilesByTask(grouped);
    } catch (err) {
      toast.error('Failed to load files');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await API.get(`/tasks/project/${projectId}`);
      setProjectTasks(res.data || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  const fetchFileVersions = async (fileId) => {
    try {
      const res = await API.get(`/files/${fileId}/versions`);
      setFileVersionMap(prev => ({ ...prev, [fileId]: res.data }));
    } catch (err) {
      toast.error('Failed to load versions');
    }
  };

  const toggleVersionView = async (fileId) => {
    if (fileVersionMap[fileId]) {
      setFileVersionMap(prev => {
        const updated = { ...prev };
        delete updated[fileId];
        return updated;
      });
    } else {
      await fetchFileVersions(fileId);
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await API.delete(`/files/${fileId}`);
      toast.success('File moved to recycle bin');
      fetchFiles();
    } catch (err) {
      toast.error('Failed to delete file');
    }
  };

  const handlePermanentDelete = async (fileId) => {
    if (!window.confirm("Are you sure you want to permanently delete this file? This cannot be undone.")) return;
    try {
      await API.delete(`/files/${fileId}/permanent`);
      toast.success('File permanently deleted');
      fetchFiles();
    } catch (err) {
      toast.error('Failed to permanently delete file');
      console.error(err);
    }
  };

  const handleRestore = async (fileId) => {
    try {
      await API.post(`/files/${fileId}/restore`);
      toast.success('File restored');
      fetchFiles();
    } catch (err) {
      toast.error('Failed to restore file');
    }
  };

  const handleRestoreAll = async () => {
    const deletedFiles = Object.values(filesByTask).flatMap(({ files }) =>
      files.filter(f => f.isDeleted)
    );
    if (!deletedFiles.length) return toast('No files to restore');
    await Promise.all(deletedFiles.map(f => API.post(`/files/${f._id}/restore`)));
    toast.success('All files restored');
    fetchFiles();
  };

  const handleUpload = async (files, taskId) => {
    if (!files.length) return;

    const formData = new FormData();
    for (let file of files) {
      formData.append('files', file);
    }

    try {
      await API.post(`/files/upload/${taskId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Files uploaded successfully');
      fetchFiles();
    } catch (err) {
      toast.error('Failed to upload files');
      console.error(err);
    }
  };

  const handleDrop = (e, taskId) => {
    e.preventDefault();
    setDragOverTask(null);
    const files = e.dataTransfer.files;
    handleUpload(files, taskId);
  };

  const downloadFile = async (fileId, originalName) => {
    try {
      const res = await API.get(`/files/download/${fileId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      toast.error(`Failed to download: ${originalName}`);
    }
  };

  const handleDownloadAll = (taskId) => {
    const taskFiles = filesByTask[taskId]?.files.filter(f => !f.isDeleted);
    if (!taskFiles || taskFiles.length === 0) {
      toast('No files to download');
      return;
    }
    taskFiles.forEach(file => downloadFile(file._id, file.originalname));
  };

  const handleDownloadAllProjectFiles = () => {
    const allFiles = Object.values(filesByTask).flatMap(({ files }) =>
      files.filter(f => !f.isDeleted)
    );
    if (allFiles.length === 0) {
      toast('No files to download');
      return;
    }
    allFiles.forEach(file => downloadFile(file._id, file.originalname));
  };

  const isImage = (filename) => /\.(jpe?g|png|gif)$/i.test(filename);
  const getFileURL = (filename) => `${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/uploads/${filename}`;

  const sortFiles = (fileList) => {
    switch (sortOption) {
      case 'size_asc': return [...fileList].sort((a, b) => a.size - b.size);
      case 'size_desc': return [...fileList].sort((a, b) => b.size - a.size);
      case 'date_asc': return [...fileList].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'date_desc':
      default: return [...fileList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  if (loading) return <div className="p-4">Loading files...</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {showRecycleBin ? '🗑️ Recycle Bin' : '📁 Files'}
        </h2>
        <div className="flex gap-3 items-center">
          {!showRecycleBin && (
            <>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search files..."
                className="text-sm px-3 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white"
              />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="text-sm px-2 py-1 border rounded bg-white dark:bg-gray-800 dark:text-white"
              >
                <option value="date_desc">Newest</option>
                <option value="date_asc">Oldest</option>
                <option value="size_desc">Largest</option>
                <option value="size_asc">Smallest</option>
              </select>
              <button
                onClick={handleDownloadAllProjectFiles}
                className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-700 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 text-indigo-700 dark:text-white"
              >
                <FaDownload className="inline mr-1" /> Download All Project Files
              </button>
            </>
          )}
          {showRecycleBin && (
            <button
              onClick={handleRestoreAll}
              className="px-3 py-1 text-sm bg-green-100 dark:bg-green-700 rounded hover:bg-green-200 dark:hover:bg-green-600 text-green-700 dark:text-white"
            >
              <FaUndo className="inline mr-1" /> Restore All
            </button>
          )}
          <button
            onClick={() => setShowRecycleBin(prev => !prev)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {showRecycleBin ? 'Back to Files' : 'View Recycle Bin'}
          </button>
        </div>
      </div>

      {projectTasks.map((task) => {
        const taskId = task._id;
        const files = filesByTask[taskId]?.files || [];
        const visibleFiles = sortFiles(
          files.filter(f => {
            const matchesSearch = f.originalname.toLowerCase().includes(filterText.toLowerCase());
            if (showRecycleBin) {
              return f.isDeleted && matchesSearch;
            }
            return !f.isDeleted && matchesSearch;
          })
        );


        return (
          <div
            key={taskId}
            ref={el => (dropRefs.current[taskId] = el)}
            className={clsx(
              "bg-white dark:bg-gray-800 rounded shadow p-4 border border-dashed",
              dragOverTask === taskId
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900"
                : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOverTask(taskId); }}
            onDragLeave={() => setDragOverTask(null)}
            onDrop={(e) => handleDrop(e, taskId)}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg">
                📝 {task?.title || 'Untitled Task'}
              </h3>
              <div className="flex gap-3 items-center">
                {!showRecycleBin && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-600 hover:underline">
                      <FaUpload /> Upload
                      <input type="file" multiple hidden onChange={(e) => handleUpload(e.target.files, taskId)} />
                    </label>
                    <button
                      onClick={() => handleDownloadAll(taskId)}
                      className="flex items-center gap-1 px-2 py-1 text-sm bg-indigo-100 dark:bg-indigo-700 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 text-indigo-700 dark:text-white"
                    >
                      <FaDownload /> Download All
                    </button>
                  </>
                )}
              </div>
            </div>

            {visibleFiles.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {visibleFiles.map(file => (
                  <li key={file._id} className="py-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isImage(file.originalname) && (
                          <img
                            src={getFileURL(file.filename)}
                            alt={file.originalname}
                            className="w-12 h-12 object-cover rounded cursor-pointer"
                            onClick={() => setPreviewImage(getFileURL(file.filename))}
                          />
                        )}
                        <div>
                          <p className="font-medium">{file.originalname}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • Uploaded {new Date(file.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={getFileURL(file.filename)}
                          download
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          title="Download"
                        >
                          <FaDownload />
                        </a>
                        {!showRecycleBin && (
                          <button
                            onClick={() => toggleVersionView(file._id)}
                            className="text-yellow-600"
                            title="Show version history"
                          >
                            {fileVersionMap[file._id] ? <FaChevronDown /> : <FaChevronRight />}
                          </button>
                        )}
                        {showRecycleBin ? (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleRestore(file._id)}
                            className="text-green-600"
                            title="Restore"
                          >
                            <FaUndo />
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(file._id)}
                            className="text-red-700"
                            title="Permanently Delete"
                          >
                            <MdDeleteForever />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(file._id)}
                          className="text-red-600"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      )}
                      </div>
                    </div>
                    {fileVersionMap[file._id] && (
                      <div className="ml-10 mt-1 space-y-1 border-l border-gray-300 dark:border-gray-600 pl-4">
                        {fileVersionMap[file._id].map(v => (
                          <div key={v._id} className="flex items-center justify-between text-sm">
                            <p>{v.originalname} • {formatFileSize(v.size)} • {new Date(v.createdAt).toLocaleString()}</p>
                            <a href={getFileURL(v.filename)} download className="text-indigo-500 hover:underline">Download</a>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No {showRecycleBin ? 'deleted' : ''} files for this task.</p>
            )}
          </div>
        );
      })}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
          onKeyDown={(e) => e.key === 'Escape' && setPreviewImage(null)}
          tabIndex={0}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default FilesTab;
