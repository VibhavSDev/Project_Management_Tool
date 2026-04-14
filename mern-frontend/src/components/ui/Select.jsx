"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

export const Select = React.forwardRef(
  ({ value, onValueChange, children, placeholder, className = "" }, ref) => {
    const [open, setOpen] = React.useState(false)

    return (
      <div className={`relative inline-block w-full ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span>{value || placeholder || "Select..."}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>

        {open && (
          <div className="absolute mt-1 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-10">
            <ul className="max-h-60 overflow-auto py-1 text-sm">
              {React.Children.map(children, (child) =>
                React.cloneElement(child, {
                  onClick: () => {
                    onValueChange?.(child.props.value)
                    setOpen(false)
                  },
                  selected: value === child.props.value,
                })
              )}
            </ul>
          </div>
        )}
      </div>
    )
  }
)

Select.displayName = "Select"

export const SelectTrigger = ({ children }) => children
export const SelectValue = ({ children }) => children
export const SelectContent = ({ children }) => <>{children}</>

export const SelectItem = ({ children, value, onClick, selected }) => (
  <li
    onClick={onClick}
    className={`cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between ${
      selected ? "bg-gray-200 dark:bg-zinc-700 font-medium" : ""
    }`}
  >
    {children}
    {selected && <Check className="h-4 w-4 ml-2" />}
  </li>
)
