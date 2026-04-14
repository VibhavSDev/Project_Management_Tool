import React, { useState } from "react";

export function Tabs({ defaultValue, children, className = "" }) {
  const [active, setActive] = useState(defaultValue);
  return (
    <div className={`w-full ${className}`}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { active, setActive })
      )}
    </div>
  );
}

export function TabsList({ children, active, setActive }) {
  return (
    <div className="flex space-x-2 border-b dark:border-gray-700 mb-4">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { active, setActive })
      )}
    </div>
  );
}

export function TabsTrigger({ value, active, setActive, children }) {
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-gray-600 hover:text-blue-600 dark:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, active, children }) {
  if (active !== value) return null;
  return <div className="mt-2">{children}</div>;
}
