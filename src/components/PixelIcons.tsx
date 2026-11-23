import React from "react";

interface IconProps {
  className?: string;
  color?: string;
  size?: number;
}

function PixelSvg({
  d,
  size = 16,
  color = "currentColor",
  className = "",
}: {
  d: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={d} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export const PxBranchIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M2,2H6V6H5V8H11V6H10V2H14V6H13V10H9V12H10V15H6V12H7V10H3V6H2V2Z"
  />
);

export const PxChipIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M5,1H7V4H9V1H11V4H12V5H15V7H12V9H15V11H12V12H11V15H9V12H7V15H5V12H4V11H1V9H4V7H1V5H4V4H5V1ZM6,6V10H10V6H6Z"
  />
);

export const PxExportIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M7,2H9V4H11V6H9V11H7V6H5V4H7V2ZM3,11H5V13H11V11H13V15H3V11Z"
  />
);

export const PxFolderIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M2,3H7V5H14V13H2V3ZM4,7V11H12V7H4Z"
  />
);

export const PxSkullIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M4,2H12V4H14V10H12V12H11V14H9V12H7V14H5V12H4V10H2V4H4V2ZM5,6V8H7V6H5ZM9,6V8H11V6H9Z"
  />
);

export const PxSparkIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M7,1H9V5H11V7H15V9H11V11H9V15H7V11H5V9H1V7H5V5H7V1ZM3,3H5V5H3V3ZM11,3H13V5H11V3ZM3,11H5V13H3V11ZM11,11H13V13H11V11Z"
  />
);

export const PxSpliceIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M2,2H7V4H9V2H14V7H12V9H14V14H9V12H7V14H2V9H4V7H2V2ZM6,6V10H10V6H6Z"
  />
);

export const PxStarIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M7,1H9V5H14V7H12V9H10V11H12V15H9V13H7V15H4V11H6V9H4V7H2V5H7V1Z"
  />
);

export const PxPlusIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M7,2H9V7H14V9H9V14H7V9H2V7H7V2Z"
  />
);

export const PxEditIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M11,2H14V5H12V7H10V9H8V11H6V13H2V9H4V7H6V5H8V3H11V2ZM4,10V11H5V10H4Z"
  />
);

export const PxSearchIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M4,2H10V4H12V10H10V11H12V13H14V15H12V13H10V12H4V10H2V4H4V2ZM5,4V10H9V4H5Z"
  />
);

export const PxSlidersIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M2,3H5V2H7V6H5V5H2V3ZM8,3H14V5H8V3ZM2,7H9V6H11V10H9V9H2V7ZM12,7H14V9H12V7ZM2,11H4V10H6V14H4V13H2V11ZM7,11H14V13H7V11Z"
  />
);

export const PxTargetIcon: React.FC<IconProps> = (props) => (
  <PixelSvg
    {...props}
    d="M5,2H11V4H13V6H14V10H13V12H11V14H5V12H3V10H2V6H3V4H5V2ZM6,4V6H4V10H6V12H10V10H12V6H10V4H6ZM7,7H9V9H7V7Z"
  />
);
