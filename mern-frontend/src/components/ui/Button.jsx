import React from "react";

export function Button({ className = "", variant = "default", ...props }) {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-100",
    ghost: "bg-transparent hover:bg-gray-100",
  };

  return (
    <button
      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  );
}
