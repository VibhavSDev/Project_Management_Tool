// src/components/ui/Avatar.jsx
import React from "react";

export function Avatar({ src, alt, fallback, className = "" }) {
  return (
    <div
      className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt || "avatar"}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {fallback || "?"}
        </span>
      )}
    </div>
  );
}
