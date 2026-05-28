"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AudioMixerEngine, MixerState, TrackDef, TrackState } from "./mixer-engine";

const TRACK_DEFS: TrackDef[] = [
  { id: "rain", src: "/sounds/rain.mp3", label: "Mưa" },
  { id: "wind", src: "/sounds/wind.mp3", label: "Gió" },
  { id: "fire", src: "/sounds/fire.mp3", label: "Lửa trại" },
  { id: "forest", src: "/sounds/forest.mp3", label: "Rừng cây" },
  { id: "cafe", src: "/sounds/cafe.mp3", label: "Quán cà phê" },
  { id: "waves", src: "/sounds/waves.mp3", label: "Sóng biển" },
  { id: "night", src: "/sounds/night.mp3", label: "Đêm hè" },
  { id: "piano", src: "/sounds/piano.mp3", label: "Piano" },
];

export function useAudioMixer() {
  const [state, setState] = useState<MixerState>({ tracks: [], masterVolume: 0.8, timer: { active: false, remainingSec: 0 } });
  const engineRef = useRef<AudioMixerEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    engineRef.current = new AudioMixerEngine(TRACK_DEFS);
    const unsub = engineRef.current.subscribe(setState);
    setIsReady(true);
    return () => { unsub(); engineRef.current?.dispose(); };
  }, []);

  return {
    state, isReady,
    playTrack: useCallback((id: string) => engineRef.current?.playTrack(id), []),
    pauseTrack: useCallback((id: string) => engineRef.current?.pauseTrack(id), []),
    toggleTrack: useCallback((id: string) => {
      const t = engineRef.current?.getState().tracks.find((x: TrackState) => x.id === id);
      t?.playing ? engineRef.current?.pauseTrack(id) : engineRef.current?.playTrack(id);
    }, []),
    setTrackVolume: useCallback((id: string, v: number) => engineRef.current?.setTrackVolume(id, v), []),
    setMasterVolume: useCallback((v: number) => engineRef.current?.setMasterVolume(v), []),
    startTimer: useCallback((m: number) => engineRef.current?.startTimer(m), []),
    stopTimer: useCallback(() => engineRef.current?.stopTimer(), []),
    playAll: useCallback(() => engineRef.current?.playAll(), []),
    pauseAll: useCallback(() => engineRef.current?.pauseAll(), []),
    saveMix: useCallback((n: string) => engineRef.current?.saveMix(n), []),
    loadMix: useCallback((n: string): boolean => engineRef.current?.loadMix(n) || false, []),
    getSavedMixes: useCallback(() => engineRef.current?.getSavedMixes() || [], []),
    deleteMix: useCallback((n: string): boolean => engineRef.current?.deleteMix(n) || false, []),
  };
}
export type { TrackState };