import React from "react";

interface BodyDiagramProps {
  selectedLocation: string | null;
  onLocationSelect: (location: string) => void;
}

export function BodyDiagram({
  selectedLocation,
  onLocationSelect,
}: BodyDiagramProps) {
  const isSelected = (part: string) => selectedLocation === part;

  const partClass = (part: string) => `
    cursor-pointer transition-colors duration-200
    ${
      isSelected(part)
        ? "fill-amber-100 stroke-amber-500 stroke-2"
        : "fill-slate-50 stroke-slate-300 stroke-[1.5] hover:fill-slate-100 hover:stroke-slate-400"
    }
  `;

  // Standardizing sizes for stick figure blocks
  const frontView = (
    <svg viewBox="0 0 100 220" className="w-32 h-auto drop-shadow-sm">
      {/* Head */}
      <path
        d="M34,25 a16,16 0 0,1 32,0 z"
        className={partClass("Forehead")}
        onClick={() => onLocationSelect("Forehead")}
      />
      <path
        d="M34,25 a16,16 0 0,0 32,0 z"
        className={partClass("Face")}
        onClick={() => onLocationSelect("Face")}
      />

      {/* Neck */}
      <rect
        x="45"
        y="41"
        width="10"
        height="8"
        rx="2"
        className={partClass("Neck")}
        onClick={() => onLocationSelect("Neck")}
      />

      {/* Chest */}
      <rect
        x="30"
        y="49"
        width="40"
        height="35"
        rx="6"
        className={partClass("Chest")}
        onClick={() => onLocationSelect("Chest")}
      />

      {/* Abdomen & Hips */}
      <rect
        x="36"
        y="86"
        width="28"
        height="35"
        rx="5"
        className={partClass("Abdomen")}
        onClick={() => onLocationSelect("Abdomen")}
      />
      <rect
        x="28"
        y="90"
        width="8"
        height="28"
        rx="3"
        className={partClass("Right Hip")}
        onClick={() => onLocationSelect("Right Hip")}
      />
      <rect
        x="64"
        y="90"
        width="8"
        height="28"
        rx="3"
        className={partClass("Left Hip")}
        onClick={() => onLocationSelect("Left Hip")}
      />

      {/* Right Arm (Patient right, viewer left) */}
      <rect
        x="12"
        y="52"
        width="16"
        height="40"
        rx="6"
        className={partClass("Right Arm")}
        onClick={() => onLocationSelect("Right Arm")}
      />
      <circle
        cx="18"
        cy="93"
        r="4.5"
        className={partClass("Right Elbow")}
        onClick={() => onLocationSelect("Right Elbow")}
      />
      <rect
        x="8"
        y="94"
        width="16"
        height="38"
        rx="5"
        className={partClass("Right Forearm")}
        onClick={() => onLocationSelect("Right Forearm")}
      />
      <circle
        cx="16"
        cy="138"
        r="6"
        className={partClass("Right Hand")}
        onClick={() => onLocationSelect("Right Hand")}
      />

      {/* Left Arm (Patient left, viewer right) */}
      <rect
        x="72"
        y="52"
        width="16"
        height="40"
        rx="6"
        className={partClass("Left Arm")}
        onClick={() => onLocationSelect("Left Arm")}
      />
      <circle
        cx="82"
        cy="93"
        r="4.5"
        className={partClass("Left Elbow")}
        onClick={() => onLocationSelect("Left Elbow")}
      />
      <rect
        x="76"
        y="94"
        width="16"
        height="38"
        rx="5"
        className={partClass("Left Forearm")}
        onClick={() => onLocationSelect("Left Forearm")}
      />
      <circle
        cx="84"
        cy="138"
        r="6"
        className={partClass("Left Hand")}
        onClick={() => onLocationSelect("Left Hand")}
      />

      {/* Right Leg */}
      <rect
        x="33"
        y="123"
        width="16"
        height="45"
        rx="6"
        className={partClass("Right Thigh")}
        onClick={() => onLocationSelect("Right Thigh")}
      />
      <circle
        cx="41"
        cy="169"
        r="4.5"
        className={partClass("Right Knee")}
        onClick={() => onLocationSelect("Right Knee")}
      />
      <rect
        x="33"
        y="170"
        width="15"
        height="40"
        rx="5"
        className={partClass("Right Lower Leg")}
        onClick={() => onLocationSelect("Right Lower Leg")}
      />
      <rect
        x="33"
        y="212"
        width="15"
        height="8"
        rx="3"
        className={partClass("Right Ankle / Foot")}
        onClick={() => onLocationSelect("Right Ankle / Foot")}
      />

      {/* Left Leg */}
      <rect
        x="51"
        y="123"
        width="16"
        height="45"
        rx="6"
        className={partClass("Left Thigh")}
        onClick={() => onLocationSelect("Left Thigh")}
      />
      <circle
        cx="59"
        cy="169"
        r="4.5"
        className={partClass("Left Knee")}
        onClick={() => onLocationSelect("Left Knee")}
      />
      <rect
        x="52"
        y="170"
        width="15"
        height="40"
        rx="5"
        className={partClass("Left Lower Leg")}
        onClick={() => onLocationSelect("Left Lower Leg")}
      />
      <rect
        x="52"
        y="212"
        width="15"
        height="8"
        rx="3"
        className={partClass("Left Ankle / Foot")}
        onClick={() => onLocationSelect("Left Ankle / Foot")}
      />
    </svg>
  );

  const backView = (
    <svg viewBox="0 0 100 220" className="w-32 h-auto drop-shadow-sm">
      {/* Head */}
      <circle
        cx="50"
        cy="25"
        r="16"
        className={partClass("Back of Head")}
        onClick={() => onLocationSelect("Back of Head")}
      />

      {/* Neck */}
      <rect
        x="45"
        y="41"
        width="10"
        height="8"
        rx="2"
        className={partClass("Back of Neck")}
        onClick={() => onLocationSelect("Back of Neck")}
      />

      {/* Upper Back */}
      <rect
        x="30"
        y="49"
        width="40"
        height="35"
        rx="6"
        className={partClass("Upper Back")}
        onClick={() => onLocationSelect("Upper Back")}
      />

      {/* Lower Back & Hips & Sacrum */}
      <rect
        x="36"
        y="86"
        width="28"
        height="35"
        rx="5"
        className={partClass("Lower Back")}
        onClick={() => onLocationSelect("Lower Back")}
      />
      <rect
        x="28"
        y="90"
        width="8"
        height="28"
        rx="3"
        className={partClass("Left Hip (Back)")}
        onClick={() => onLocationSelect("Left Hip (Back)")}
      />
      <rect
        x="64"
        y="90"
        width="8"
        height="28"
        rx="3"
        className={partClass("Right Hip (Back)")}
        onClick={() => onLocationSelect("Right Hip (Back)")}
      />
      <rect
        x="44"
        y="112"
        width="12"
        height="14"
        rx="4"
        className={partClass("Sacrum")}
        onClick={() => onLocationSelect("Sacrum")}
      />

      {/* Left Arm (Patient left, viewer left for BACK view) */}
      <rect
        x="12"
        y="52"
        width="16"
        height="40"
        rx="6"
        className={partClass("Left Arm (Back)")}
        onClick={() => onLocationSelect("Left Arm (Back)")}
      />
      <circle
        cx="18"
        cy="93"
        r="4.5"
        className={partClass("Left Elbow (Back)")}
        onClick={() => onLocationSelect("Left Elbow (Back)")}
      />
      <rect
        x="8"
        y="94"
        width="16"
        height="38"
        rx="5"
        className={partClass("Left Forearm (Back)")}
        onClick={() => onLocationSelect("Left Forearm (Back)")}
      />
      <circle
        cx="16"
        cy="138"
        r="6"
        className={partClass("Left Hand (Back)")}
        onClick={() => onLocationSelect("Left Hand (Back)")}
      />

      {/* Right Arm (Patient right, viewer right for BACK view) */}
      <rect
        x="72"
        y="52"
        width="16"
        height="40"
        rx="6"
        className={partClass("Right Arm (Back)")}
        onClick={() => onLocationSelect("Right Arm (Back)")}
      />
      <circle
        cx="82"
        cy="93"
        r="4.5"
        className={partClass("Right Elbow (Back)")}
        onClick={() => onLocationSelect("Right Elbow (Back)")}
      />
      <rect
        x="76"
        y="94"
        width="16"
        height="38"
        rx="5"
        className={partClass("Right Forearm (Back)")}
        onClick={() => onLocationSelect("Right Forearm (Back)")}
      />
      <circle
        cx="84"
        cy="138"
        r="6"
        className={partClass("Right Hand (Back)")}
        onClick={() => onLocationSelect("Right Hand (Back)")}
      />

      {/* Left Leg */}
      <rect
        x="33"
        y="123"
        width="16"
        height="45"
        rx="6"
        className={partClass("Left Thigh (Back)")}
        onClick={() => onLocationSelect("Left Thigh (Back)")}
      />
      <circle
        cx="41"
        cy="169"
        r="4.5"
        className={partClass("Left Knee (Back)")}
        onClick={() => onLocationSelect("Left Knee (Back)")}
      />
      <rect
        x="33"
        y="170"
        width="15"
        height="40"
        rx="5"
        className={partClass("Left Lower Leg (Back)")}
        onClick={() => onLocationSelect("Left Lower Leg (Back)")}
      />
      <rect
        x="33"
        y="212"
        width="15"
        height="8"
        rx="3"
        className={partClass("Left Ankle / Heel")}
        onClick={() => onLocationSelect("Left Ankle / Heel")}
      />

      {/* Right Leg */}
      <rect
        x="51"
        y="123"
        width="16"
        height="45"
        rx="6"
        className={partClass("Right Thigh (Back)")}
        onClick={() => onLocationSelect("Right Thigh (Back)")}
      />
      <circle
        cx="59"
        cy="169"
        r="4.5"
        className={partClass("Right Knee (Back)")}
        onClick={() => onLocationSelect("Right Knee (Back)")}
      />
      <rect
        x="52"
        y="170"
        width="15"
        height="40"
        rx="5"
        className={partClass("Right Lower Leg (Back)")}
        onClick={() => onLocationSelect("Right Lower Leg (Back)")}
      />
      <rect
        x="52"
        y="212"
        width="15"
        height="8"
        rx="3"
        className={partClass("Right Ankle / Heel")}
        onClick={() => onLocationSelect("Right Ankle / Heel")}
      />
    </svg>
  );

  return (
    <div className="bg-white border text-center border-slate-200 rounded-2xl p-6">
      <h3 className="text-sm font-medium text-slate-700 mb-6 font-medium">
        Select Observation Location
      </h3>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-12">
        <div className="group relative">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium absolute -top-4 w-full text-center">
            Front
          </span>
          {frontView}
        </div>
        <div className="group relative">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium absolute -top-4 w-full text-center">
            Back
          </span>
          {backView}
        </div>
      </div>
      {selectedLocation && (
        <div className="mt-6 flex items-center justify-center">
          <span className="text-xs bg-amber-50 text-amber-700 font-medium px-3 py-1.5 rounded-full border border-amber-100/50 flex items-center gap-2">
            Location: {selectedLocation}
          </span>
        </div>
      )}
    </div>
  );
}
