import React from "react";

export function Card({ className = "", ...props }) {
  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700 ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return (
    <div className={`p-4 border-b dark:border-gray-700 ${className}`} {...props} />
  );
}

export function CardTitle({ className = "", ...props }) {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  );
}

export function CardContent({ className = "", ...props }) {
  return <div className={`p-4 ${className}`} {...props} />;
}
