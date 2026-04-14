// src/routes/AppRouter.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import GuestOnlyRoute from './GuestOnlyRoute';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import DashboardHome from '../pages/dashboard/DashboardHome';
import ProjectList from '../pages/projects/ProjectList';
import ProjectDetails from '../pages/projects/ProjectDetails';
import CreateProject from '../pages/projects/CreateProject';
import InviteUsers from '../pages/projects/InviteUsers';
import EditProject from '../pages/projects/EditProject';
import TaskList from '../pages/projectsTabs/tasks/TaskList';
import CreateTask from '../pages/projectsTabs/tasks/CreateTask';
import EditTask from '../pages/projectsTabs/tasks/EditTask';
import TasksTab from '../pages/projectsTabs/tasks/TasksTab';
import TaskForm from '../pages/projectsTabs/tasks/TaskForm';
import MembersTab from '../pages/projectsTabs/MembersTab';
import FilesTab from '../pages/projectsTabs/FilesTab';
import ActivityTab from '../pages/projectsTabs/ActivityTab';
import CommentsTab from '../pages/projectsTabs/CommentsTab';
import OverviewTab from '../pages/projectsTabs/OverviewTab';
import MyTasks from '../pages/MyTasks';
import Activity from '../pages/Activity';
import Profile from '../pages/Profile';
import Admin from '../pages/Admin';
import AnalyticsTab from '../pages/projectsTabs/AnalyticsTab';
import TaskDetails from '../pages/projectsTabs/tasks/TaskDetails';
import TaskCommentsTab from '../components/taskDetails/TaskCommentsTab';
import TaskFilesTab from '../components/taskDetails/TaskFilesTab';
import TaskWatchersTab from '../components/taskDetails/TaskWatchersTab';
import TaskActivityTab from '../components/taskDetails/TaskActivityTab';

const AppRouter = () => {
  return (
      <Routes>
        <Route
          path="/login"
          element={
            <GuestOnlyRoute showToast={true}>
              <Login />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnlyRoute redirectTo="/dashboard">
              <Register />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
                <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />

            <Route path="projects">
            <Route index element={<ProjectList />} />
            <Route path="new" element={<CreateProject />} />
            <Route path=":projectId/invite" element={<InviteUsers />} />

            <Route path=":projectId" element={<ProjectDetails />}>
              <Route index element={<OverviewTab />} />
              <Route path="edit" element={<EditProject />} />

              {/* Tasks */}
              <Route path="tasks" element={<TasksTab />} />
              {/* <Route path="tasks/new" element={<TaskForm />} /> */}

              {/* Project sections */}
              <Route path="members" element={<MembersTab />} />
              <Route path="files" element={<FilesTab />} />
              <Route path="activity" element={<ActivityTab />} />
              <Route path="analytics" element={<AnalyticsTab />} />
            </Route>
          </Route>


          <Route path="my-tasks" element={<MyTasks />} />

          <Route path="activity" element={<Activity />} />
          
          <Route path="profile" element={<Profile />} />
          
          <Route path="admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />

        {/* <Route path="/dashboard/projects/:projectId/tasks" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'member']}>
            <TasksTab />
          </ProtectedRoute>
        } /> */}
        {/* <Route path="/dashboard/projects/:projectId/tasks/new" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'member']}>
            <CreateTask />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/tasks/:taskId/edit" element={<EditTask />} /> */}


      </Routes> 
  );
};

export default AppRouter;
