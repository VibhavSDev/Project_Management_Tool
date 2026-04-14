import { useState, useEffect } from 'react';
import API from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

const TaskForm = ({ projectId, task = null, onSuccess }) => {
  const isEdit = !!task;
  const [labels, setLabels] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [watchers, setWatchers] = useState([]);
  const [labelInput, setLabelInput] = useState("");
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'todo',
    assignedTo: [], // 🆕
  });

  // Fetch project members for assignment
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await API.get(`/projects/${projectId}`);
        setMembers(res.data.members || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load project members');
      }
    };
    fetchMembers();
  }, [projectId]);

  // Pre-fill form data for edit
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        assignedTo: task.assignedTo ? task.assignedTo.map(user => user._id) : [], // 🆕
      });
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssignedChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setFormData(prev => ({ ...prev, assignedTo: selected }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEdit ? `/tasks/${task._id}` : `/tasks/create`;
      const method = isEdit ? 'put' : 'post';

      // ✅ CREATE FormData HERE
      const formDataPayload = new FormData();

      // 1️⃣ Basic task fields
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => formDataPayload.append(`${key}[]`, v));
        } else if (value !== undefined && value !== null) {
          formDataPayload.append(key, value);
        }
      });

      // 2️⃣ Project
      formDataPayload.append("projectId", projectId);

      // 3️⃣ Labels
      labels.forEach(label =>
        formDataPayload.append("labels[]", label)
      );

      // 4️⃣ Watchers
      watchers.forEach(watcher =>
        formDataPayload.append("watchers[]", watcher)
      );

      // 5️⃣ Attachments
      attachments.forEach(file =>
        formDataPayload.append("files", file)
      );

      // ✅ SEND FormData
      await API[method](url, formDataPayload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      toast.success(`Task ${isEdit ? 'updated' : 'created'} successfully!`);
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Task operation failed');
    }
  };

  const addLabel = () => {
    if (!labelInput.trim()) return;
    if (labels.includes(labelInput)) return;
    setLabels(prev => [...prev, labelInput.trim()]);
    setLabelInput("");
  };

  const removeLabel = (label) => {
    setLabels(prev => prev.filter(l => l !== label));
  };

  return (
    <form onSubmit={handleSubmit} className=" space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-xl max-h-[85vh] overflow-y-auto">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 dark:text-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 dark:text-white"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {/* Assignment dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Assign to</label>
        <select
          multiple
          value={formData.assignedTo}
          onChange={handleAssignedChange}
          className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 dark:text-white"
        >
          {members.map((member) => (
            <option key={member._id} value={member._id}>
              {member.username}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Labels</label>

        <div className="flex gap-2 mb-2 flex-wrap">
          {labels.map(label => (
            <span
              key={label}
              className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded flex items-center gap-1"
            >
              {label}
              <button
                type="button"
                onClick={() => removeLabel(label)}
                className="text-indigo-500 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Add label"
            className="flex-1 px-3 py-2 rounded bg-gray-100 dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={addLabel}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded"
          >
            Add
          </button>
        </div>
      </div>

      <div>
      <label className="block text-sm font-medium mb-1">Attachments</label>
      <input
          type="file"
          multiple
          onChange={(e) => setAttachments([...e.target.files])}
          className="w-full text-sm"
        />

        {attachments.length > 0 && (
          <ul className="mt-2 text-xs text-gray-500">
            {attachments.map((f, i) => (
              <li key={i}>📎 {f.name}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Watchers</label>
        <select
          multiple
          value={watchers}
          onChange={(e) =>
            setWatchers([...e.target.selectedOptions].map(o => o.value))
          }
          className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900"
        >
          {members.map(m => (
            <option key={m._id} value={m._id}>
              {m.username}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
      >
        {isEdit ? 'Update Task' : 'Create Task'}
      </button>
    </form>
  );
};

export default TaskForm;
