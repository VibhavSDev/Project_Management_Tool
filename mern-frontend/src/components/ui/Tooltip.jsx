import React, { useState } from "react";

export const Tooltip = ({ children }) => <>{children}</>;

export const TooltipTrigger = ({ children, onMouseEnter, onMouseLeave }) => {
  return (
    <span
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="cursor-pointer"
    >
      {children}
    </span>
  );
};

export const TooltipContent = ({ children, visible }) => {
  if (!visible) return null;
  return (
    <div className="absolute z-50 mt-2 px-2 py-1 text-xs bg-black text-white rounded shadow">
      {children}
    </div>
  );
};
