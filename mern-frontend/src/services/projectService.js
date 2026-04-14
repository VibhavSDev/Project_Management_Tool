import API from './axiosInstance.js'

// Get all projects
export const getProjects = async () => {
  const res = await API.get("/projects");
  return res.data;
};

// Create new project
export const createProject = async (projectData) => {
  const res = await API.post("/projects", projectData);
  return res.data;
};

// Update project
export const updateProject = async (projectId, updates) => {
  const res = await API.patch(`/projects/${projectId}`, updates);
  return res.data;
};

// Delete project
export const deleteProject = async (projectId) => {
  const res = await API.delete(`/projects/${projectId}`);
  return res.data;
};

// Invite member to project
export const inviteMemberToProject = async (projectId, email) => {
  const res = await API.post(`/projects/${projectId}/invite`, { email });
  return res.data;
};

// ✅ Remove member from project
export const removeMemberFromProject = async (projectId, memberId) => {
  const res = await API.delete(`/projects/${projectId}/members/${memberId}`);
  return res.data;
};

export const leaveProject = async (projectId) => {
    const res = await API.delete(`/projects/${projectId}/leave`);
    return res.data;
}

// ✅ Update project member role
export const updateProjectMemberRole = async (projectId, memberId, role) => {
  const res = await API.patch(`/projects/${projectId}/members/${memberId}`, { role });
  return res.data;
};

export const archiveProject = async (projectId) => {
  const res = await API.patch(`/projects/${projectId}/archive`);
  return res.data;
};

export const restoreProject = async (projectId) => {
  const res = await API.patch(`/projects/${projectId}/restore`);
  return res.data;
};
