import { useState } from "react";
import ProjectSelector from "./ProjectSelector";
import TaskStatusChart from "./TaskStatusChart";
import TaskTrendsChart from "./TaskTrendsChart";
import TasksPerUserChart from "./TasksPerUserChart";
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'

const DashboardHome = () => {
  const [projectId, setProjectId] = useState(null);

  return (
    <main className="min-h-screen px-3 md:px-6 py-8 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            📊 Dashboard Overview
          </h1>
          <ProjectSelector onSelect={setProjectId} />
        </header>

        {/* Analytics Grid */}
        {projectId ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Task Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskStatusChart projectId={projectId} />
              </CardContent>
            </Card>

            {/* Tasks Per User */}
            <Card>
              <CardHeader>
                <CardTitle>Tasks Per User</CardTitle>
              </CardHeader>
              <CardContent>
                <TasksPerUserChart projectId={projectId} />
              </CardContent>
            </Card>

            {/* Task Trends */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Task Trends (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskTrendsChart projectId={projectId} days={7} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 italic pt-10">
            Please select a project to view analytics.
          </div>
        )}
      </div>
    </main>
  );
};

export default DashboardHome;
