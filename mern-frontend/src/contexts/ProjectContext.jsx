import { createContext, useContext, useState } from 'react';

// Create context
const ProjectContext = createContext();

// Hook to use project context
// eslint-disable-next-line react-refresh/only-export-components
export const useProject = () => useContext(ProjectContext);

// Provider component
export const ProjectProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject }}>
      {children}
    </ProjectContext.Provider>
  );
};
