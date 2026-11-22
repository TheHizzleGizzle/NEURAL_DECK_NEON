import React, { useEffect } from "react";

interface BottomSheetShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheetShell: React.FC<BottomSheetShellProps> = ({
  open,
  onClose,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="px-panel max-h-[88vh] w-full max-w-[680px] overflow-y-auto p-[16px]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
