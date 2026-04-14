import React from "react";

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 ${className}`}
      {...props}
    />
  );
}
