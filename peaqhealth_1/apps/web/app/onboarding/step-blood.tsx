"use client";

import { useState, useCallback } from "react";
import type { DetectedMarker } from "./types";

const LAB_LOGOS = ["Quest Diagnostics", "LabCorp", "BioReference", "Everlywell"];

const MOCK_MARKERS: DetectedMarker[] = [
  { name: "hs-CRP", value: 0.8, unit: "mg/L" },
  { name: "Vitamin D", value: 42, unit: "ng/mL" },
  { name: "ApoB", value: 85, unit: "mg/dL" },
  { name: "LDL", value: 110, unit: "mg/dL" },
  { name: "HDL", value: 58, unit: "mg/dL" },
  { name: "Triglycerides", value: 95, unit: "mg/dL" },
  { name: "Lp(a)", value: 18, unit: "mg/dL" },
  { name: "Glucose", value: 88, unit: "mg/dL" },
  { name: "HbA1c", value: 5.2, unit: "%" },
];

type ParseStage = "idle" | "uploading" | "extracting" | "mapping" | "done";

const STAGE_LABELS: Record<ParseStage, string> = {
  idle: "",
  uploading: "Uploading PDF...",
  extracting: "Extracting text with OCR...",
  mapping: "Mapping biomarkers...",
  done: "Done",
};

interface Props {
  onConfirm: (markers: DetectedMarker[]) => void;
  onSkip: () => void;
}

export function StepBlood({ onConfirm, onSkip }: Props) {
  const [stage, setStage] = useState<ParseStage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [markers, setMarkers] = useState<DetectedMarker[]>([]);

  const simulateParse = useCallback(() => {
    setStage("uploading");
    setTimeout(() => setStage("extracting"), 900);
    setTimeout(() => setStage("mapping"), 2200);
    setTimeout(() => {
      setMarkers(MOCK_MARKERS);
      setStage("done");
    }, 3200);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    simulateParse();
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) simulateParse();
  }

  if (stage === "done") {
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="font-display text-4xl font-light tracking-tight text-ink">
            Markers detected
          </h2>
          <p className="mt-3 font-body text-sm text-ink/50">
            We found {markers.length} biomarkers in your report.
          </p>
        </div>

        <div className="w-full max-w-md border border-ink/10 bg-white">
          <div className="grid grid-cols-3 border-b border-ink/10 px-4 py-2">
            <span className="font-body text-[10px] uppercase tracking-widest text-ink/30">Marker</span>
            <span className="font-body text-[10px] uppercase tracking-widest text-ink/30 text-right">Value</span>
            <span className="font-body text-[10px] uppercase tracking-widest text-ink/30 text-right">Unit</span>
          </div>
          {markers.map((m) => (
            <div key={m.name} className="grid grid-cols-3 border-b border-ink/5 px-4 py-2.5 last:border-0">
              <span className="font-body text-sm text-ink">{m.name}</span>
              <span className="font-body text-sm text-ink font-medium text-right">{m.value}</span>
              <span className="font-body text-sm text-ink/40 text-right">{m.unit}</span>
            </div>
          ))}
        </div>

        <div className="flex w-full max-w-md flex-col gap-3">
          <button
            onClick={() => onConfirm(markers)}
            className="h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                       text-off-white transition-colors hover:bg-gold"
          >
            Use these results
          </button>
          <button
            onClick={onSkip}
            className="font-body text-xs text-ink/35 uppercase tracking-widest hover:text-ink/60 transition-colors"
          >
            Skip — add later
          </button>
        </div>
      </div>
    );
  }

  if (stage !== "idle") {
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="font-display text-4xl font-light tracking-tight text-ink">
            Parsing your labs
          </h2>
        </div>
        <div className="flex w-full max-w-md flex-col gap-4 py-8">
          {(["uploading", "extracting", "mapping"] as const).map((s, i) => {
            const stageIndex = ["uploading", "extracting", "mapping"].indexOf(stage);
            const thisIndex = i;
            const isDone = thisIndex < stageIndex;
            const isCurrent = thisIndex === stageIndex;
            return (
              <div key={s} className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full transition-all ${
                  isDone ? "bg-gold" : isCurrent ? "bg-gold animate-pulse" : "bg-ink/10"
                }`} />
                <span className={`font-body text-sm ${
                  isDone ? "text-ink/50" : isCurrent ? "text-ink" : "text-ink/20"
                }`}>
                  {STAGE_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Upload blood labs
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          Drop a PDF from any major lab. We&apos;ll extract your biomarkers automatically.
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex w-full max-w-md cursor-pointer flex-col items-center gap-4 border-2 border-dashed
                    px-8 py-14 transition-colors ${
                      dragOver ? "border-gold bg-gold/5" : "border-ink/15 bg-white hover:border-ink/30"
                    }`}
      >
        <div className="flex h-12 w-12 items-center justify-center border border-ink/10 text-ink/30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <div className="text-center">
          <span className="font-body text-sm text-ink">
            Drop your lab PDF here
          </span>
          <span className="block font-body text-xs text-ink/35 mt-1">
            or click to browse
          </span>
        </div>
        <input type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />
      </label>

      <div className="flex items-center gap-5">
        {LAB_LOGOS.map((lab) => (
          <span key={lab} className="font-body text-[10px] uppercase tracking-widest text-ink/20">
            {lab}
          </span>
        ))}
      </div>

      <button
        onClick={onSkip}
        className="font-body text-xs text-ink/35 uppercase tracking-widest hover:text-ink/60 transition-colors"
      >
        Skip — add later
      </button>
    </div>
  );
}
