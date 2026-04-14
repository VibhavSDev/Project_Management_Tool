const TaskSkeleton = () => {
  return (
    <div className="rounded-lg p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 animate-pulse space-y-2">
      <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-2 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
};

export default TaskSkeleton;
