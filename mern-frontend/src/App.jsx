// import './App.css';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { AuthProvider } from './context/AuthContext';
// import { SocketProvider } from './context/SocketContext';

// import Login from './pages/Login';
// import Register from './pages/Register';
// // import Dashboard from './pages/Dashboard';
// import DashboardLayout from './layouts/DashboardLayout';
// import DashboardHome from './pages/dashboard/DashboardHome';
// import ProjectList from './pages/projects/ProjectList';
// import CreateProject from './pages/projects/CreateProject';
// import ProjectDetail from './pages/projects/ProjectDetail';
// import CreateTask from './pages/CreateTask';
// import EditTask from './pages/EditTask';
// import ProtectedRoute from './routes/ProtectedRoute';
// import { Toaster } from 'react-hot-toast';

// const App = () => {
//   return (
//     <Router>
//       <AuthProvider>
//         <SocketProvider>
//           <Toaster position="top-center" reverseOrder={false} />
//           <Routes>
//             <Route path="/" element={<Login />} />

//             <Route path="/register" element={<Register />} />
            
//             <Route
//               path="/dashboard"
//               element={
//                 <ProtectedRoute>
//                   <DashboardLayout />
//                 </ProtectedRoute>
//               }
//             >
//               <Route index element={<DashboardHome />} />
//               <Route path="projects" element={<ProjectList />} />
//               <Route path="projects/new" element={
//                 <ProtectedRoute allowedRoles={['admin', 'manager']}>
//                   <CreateProject />
//                 </ProtectedRoute>
//                 } />
//               <Route path="projects/:id" element={<ProjectDetail />} />
//               {/* You can add nested project/task routes here later */}
//             </Route>


//             <Route
//               path="/tasks/new"
//               element={
//                 <ProtectedRoute>
//                   <CreateTask />
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/tasks/:id/edit"
//               element={
//                 <ProtectedRoute>
//                   <EditTask />
//                 </ProtectedRoute>
//               }
//             />
//           </Routes>
//         </SocketProvider>
//       </AuthProvider>
//     </Router>
//   );
// };

// export default App;
