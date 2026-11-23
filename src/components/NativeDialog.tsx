import React, { useEffect, useRef } from "react";

interface NativeDialogProps {
  open: boolean;
  onClose: () => void;
  variant?: "modal" | "sheet";
  maxWidthClass?: string;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

/**
 * Native <dialog> top-layer wrapper with declarative `closedby="any"` and
 * bounding-rect light-dismiss fallback for browsers lacking `closedBy`.
 */
export const NativeDialog: React.FC<NativeDialogProps> = ({
  open,
  onClose,
  variant = "modal",
  maxWidthClass = "max-w-[460px]",
  ariaLabelledBy,
  ariaLabel,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback light-dismiss for browsers without native <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = dialog.open && isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && dialog.open && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const handleNativeClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = "";
    }
    onCloseRef.current();
  };

  const baseClass =
    variant === "sheet"
      ? "px-panel px-dialog-sheet"
      : `px-panel px-dialog-modal ${maxWidthClass}`;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleNativeClose}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      className={baseClass}
      {...({ closedby: "any" } as Record<string, string>)}
    >
      {open ? children : null}
    </dialog>
  );
};
