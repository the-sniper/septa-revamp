import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      document.body.style.overflow = "hidden";
    } else {
      setTimeout(() => setShow(false), 300); // Wait for animate-out
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`
          relative w-full max-w-lg bg-bg-secondary rounded-t-3xl border-t border-border-subtle shadow-2xl 
          transform transition-transform duration-300 flex flex-col max-h-[90vh]
          ${isOpen ? "translate-y-0" : "translate-y-full"}
        `}
      >
        {/* Handle for resizing indication (optional visual cue) */}
        <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-border-subtle rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-bg-tertiary text-text-secondary hover:bg-border-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">{children}</div>
      </div>
    </div>
  );
}
