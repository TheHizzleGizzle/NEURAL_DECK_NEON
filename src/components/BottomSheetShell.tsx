import React from "react";
import { NativeDialog } from "./NativeDialog";

interface BottomSheetShellProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}

export const BottomSheetShell: React.FC<BottomSheetShellProps> = ({
  open,
  onClose,
  ariaLabel = "Sheet dialog",
  children,
}) => (
  <NativeDialog
    open={open}
    onClose={onClose}
    variant="sheet"
    ariaLabel={ariaLabel}
  >
    {children}
  </NativeDialog>
);
