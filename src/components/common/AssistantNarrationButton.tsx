"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Play, Pause, RefreshCw, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AssistantResponse } from "@/types/assistant";
import { buildNarrationBriefing } from "@/lib/engine/assistant-narrator";

interface AssistantNarrationButtonProps {
  data: AssistantResponse;
  className?: string;
}

export function AssistantNarrationButton({ data, className = "" }: AssistantNarrationButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [narrationMode, setNarrationMode] = useState<"unconfigured_speech_synth" | "elevenlabs_cloud" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const scriptText = React.useMemo(() => buildNarrationBriefing(data), [data]);

  // Clean up audio on unmount or when data changes
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
    };
  }, [data]);

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }

  async function handleTogglePlay() {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    // If we already have a loaded ElevenLabs audio element, resume it
    if (audioRef.current && audioBlobUrlRef.current && narrationMode === "elevenlabs_cloud") {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/assistant/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: scriptText }),
      });

      const contentType = res.headers.get("Content-Type") || "";

      // Case 1: Audio returned from ElevenLabs
      if (res.ok && contentType.includes("audio/mpeg")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioBlobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setStatusMessage("Audio playback encountered an error.");
          setIsPlaying(false);
        };

        await audio.play();
        setNarrationMode("elevenlabs_cloud");
        setIsPlaying(true);
      } 
      // Case 2: ElevenLabs unconfigured or returned fallback JSON
      else {
        const json = await res.json().catch(() => null);
        const isUnconfigured = json && json.configured === false;
        
        setNarrationMode("unconfigured_speech_synth");

        if (isUnconfigured) {
          setStatusMessage("ElevenLabs unconfigured; falling back to local browser speech synthesis.");
        } else {
          setStatusMessage(json?.error || "ElevenLabs service unavailable; falling back to local speech synthesis.");
        }

        playWithSpeechSynthesis(scriptText);
      }
    } catch (err: unknown) {
      console.warn("Narration fetch failed, using Web Speech API fallback:", err);
      setNarrationMode("unconfigured_speech_synth");
      setStatusMessage("Falling back to local speech synthesis.");
      playWithSpeechSynthesis(scriptText);
    } finally {
      setIsLoading(false);
    }
  }

  function playWithSpeechSynthesis(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatusMessage("Speech synthesis is not supported in this browser.");
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled") {
        setStatusMessage(`Speech playback error: ${e.error}`);
      }
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={isPlaying ? "secondary" : "outline"}
          onClick={handleTogglePlay}
          disabled={isLoading}
          className="h-8 text-xs flex items-center gap-1.5 border-slate-300 hover:border-slate-400"
          title="Listen to an objective audio narration of these server recommendations"
        >
          {isLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-700" />
          ) : isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-slate-900 fill-slate-900" />
          ) : (
            <Play className="w-3.5 h-3.5 text-slate-700 fill-slate-700" />
          )}

          <span className="font-medium text-slate-900">
            {isLoading ? "Synthesizing Briefing..." : isPlaying ? "Pause Narration" : "Listen to Sourcing Briefing"}
          </span>
        </Button>

        {isPlaying && (
          <Button
            size="sm"
            variant="ghost"
            onClick={stopPlayback}
            className="h-8 text-xs text-slate-600 hover:text-slate-900 px-2"
          >
            <VolumeX className="w-3.5 h-3.5 mr-1" /> Stop
          </Button>
        )}

        <button
          type="button"
          onClick={() => setShowScript(!showScript)}
          className="text-[11px] text-slate-500 hover:text-slate-800 underline flex items-center gap-1"
        >
          <FileText className="w-3 h-3" />
          {showScript ? "Hide Script" : "View Script"}
        </button>

        {/* Engine Provenance Badge */}
        {narrationMode === "elevenlabs_cloud" && (
          <Badge variant="success" size="sm" className="text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            ElevenLabs AI Audio
          </Badge>
        )}

        {narrationMode === "unconfigured_speech_synth" && (
          <Badge variant="secondary" size="sm" className="text-[10px] text-slate-700 border-slate-300">
            <Volume2 className="w-3 h-3 mr-1 text-slate-500" />
            Local Voice (ElevenLabs Unconfigured)
          </Badge>
        )}
      </div>

      {/* Honest Status Notice Banner */}
      {statusMessage && (
        <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Verbatim Script Drawer */}
      {showScript && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-1.5 leading-relaxed">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-500">
            <span>Verbatim Sourcing Briefing Script</span>
            <span>Server Data Only &bull; Read-Only</span>
          </div>
          <p className="font-sans italic text-slate-800">&ldquo;{scriptText}&rdquo;</p>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/80">
            Safety constraint: Narration only reads existing server recommendation data verbatim without changing suitability scores, lot ranking, or triggering purchases.
          </div>
        </div>
      )}
    </div>
  );
}
