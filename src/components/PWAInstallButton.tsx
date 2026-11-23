import React, { useId, useState } from "react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { NativeDialog } from "./NativeDialog";

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const iosTitleId = useId();

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install NEURAL//DECK app"
        className="px-btn-green flex h-[30px] cursor-pointer items-center gap-[5px] px-[8px] font-mono text-[11px] font-bold whitespace-nowrap hover:brightness-110 sm:h-[32px] sm:px-[10px]"
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 12 12"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <rect x="5" y="1" width="2" height="6" fill="currentColor" />
          <rect x="3" y="5" width="2" height="2" fill="currentColor" />
          <rect x="7" y="5" width="2" height="2" fill="currentColor" />
          <rect x="1" y="9" width="10" height="2" fill="currentColor" />
        </svg>
        <span className={compact ? "hidden sm:inline" : ""}>Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install NEURAL//DECK on iOS"
          className="px-btn-green flex h-[30px] cursor-pointer items-center gap-[5px] px-[8px] font-mono text-[11px] font-bold whitespace-nowrap hover:brightness-110 sm:h-[32px] sm:px-[10px]"
        >
          <span>Install</span>
        </button>

        <NativeDialog
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          variant="modal"
          maxWidthClass="max-w-[360px]"
          ariaLabelledBy={iosTitleId}
        >
          <h3
            id={iosTitleId}
            className="font-mono text-[13px] font-bold text-[var(--deck-cyan)]"
          >
            Install on iPhone / iPad
          </h3>
          <ol className="mt-[10px] list-decimal space-y-[6px] pl-[18px] text-[13px] leading-[1.45] text-[var(--deck-text-body)]">
            <li>
              Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
            </li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong> to launch NEURAL//DECK in standalone mode.
            </li>
          </ol>
          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            className="px-chip-active mt-[14px] h-[34px] w-full cursor-pointer font-mono text-[11px] font-bold"
          >
            Got It
          </button>
        </NativeDialog>
      </>
    );
  }

  return null;
};
