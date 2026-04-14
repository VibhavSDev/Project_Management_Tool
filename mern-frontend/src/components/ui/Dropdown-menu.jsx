// src/components/ui/dropdown-menu.jsx
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  cloneElement,
} from "react";

const MenuContext = createContext();

export function DropdownMenu({ children }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative inline-block">
      <MenuContext.Provider value={{ open, toggle, close }}>
        {children}
      </MenuContext.Provider>
    </div>
  );
}

export function DropdownMenuTrigger({ children, asChild = false, className = "" }) {
  const ctx = useContext(MenuContext);
  if (!ctx) return null;
  const { toggle, open } = ctx;

  if (asChild) {
    const child = React.Children.only(children);
    const existingOnClick = child.props.onClick;
    return cloneElement(child, {
      onClick: (e) => {
        existingOnClick?.(e);
        toggle();
      },
      "aria-expanded": open,
      className: `${child.props.className || ""} ${className}`.trim(),
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      className={`rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition ${className}`}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, align = "start", className = "" }) {
  const ctx = useContext(MenuContext);
  if (!ctx) return null;
  const { open } = ctx;
  if (!open) return null;

  const alignClass = align === "end" ? "right-0" : "left-0";

  return (
    <div
      className={`absolute ${alignClass} mt-2 min-w-[160px] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ring-1 ring-black/5 z-50 animate-fadeIn ${className}`}
      role="menu"
    >
      <div className="py-1">{children}</div>
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, className = "" }) {
  const ctx = useContext(MenuContext);
  if (!ctx) return null;
  const { close } = ctx;

  const handle = (e) => {
    onClick?.(e);
    setTimeout(() => close(), 0);
  };

  return (
    <button
      onClick={handle}
      className={`w-full px-4 py-2 text-left text-sm rounded-md transition
        text-gray-700 dark:text-gray-100
        hover:bg-indigo-50 hover:text-indigo-600
        dark:hover:bg-gray-700 dark:hover:text-indigo-400
        ${className}`}
      role="menuitem"
    >
      {children}
    </button>
  );
}
