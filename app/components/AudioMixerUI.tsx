// app/components/AudioMixerUI.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TRACKS, type Track } from '../constants/tracks';

export default function AudioMixerUI() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [activeTracks, setActiveTracks] = useState<Set<string>>(new Set(['rain']));
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Khởi tạo AudioContext (chỉ khi có user interaction)
  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = masterVolume;
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, [masterVolume]);

  // Load audio buffer cho track
  const loadBuffer = useCallback(async (track: Track): Promise<AudioBuffer | null> => {
    if (buffersRef.current.has(track.id)) return buffersRef.current.get(track.id)!;
    try {
      const response = await fetch(track.src);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
      buffersRef.current.set(track.id, buffer);
      return buffer;
    } catch (err) {
      console.error(`Failed to load ${track.src}:`, err);
      return null;
    }
  }, []);

  // Play/Pause một track
  const toggleTrack = useCallback(async (track: Track) => {
    await initAudio();
    const ctx = audioContextRef.current!;
    const gain = gainNodeRef.current!;
    
    if (sourcesRef.current.has(track.id)) {
      // Stop track
      sourcesRef.current.get(track.id)?.stop();
      sourcesRef.current.delete(track.id);
      setActiveTracks(prev => { const n = new Set(prev); n.delete(track.id); return n; });
    } else {
      // Play track
      const buffer = await loadBuffer(track);
      if (!buffer) return;
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      sourcesRef.current.set(track.id, source);
      setActiveTracks(prev => { const n = new Set(prev); n.add(track.id); return n; });
    }
  }, [initAudio, loadBuffer]);

  // Play/Stop all
  const toggleAll = useCallback(async () => {
    if (isPlaying) {
      // Stop all
      sourcesRef.current.forEach(source => { try { source.stop(); } catch {} });
      sourcesRef.current.clear();
      setActiveTracks(new Set());
    } else {
      // Play all active tracks
      await initAudio();
      for (const track of TRACKS) {
        if (activeTracks.has(track.id)) {
          await toggleTrack(track);
        }
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, activeTracks, initAudio, toggleTrack]);

  // Update master volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(masterVolume, audioContextRef.current!.currentTime, 0.1);
    }
  }, [masterVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sourcesRef.current.forEach(source => { try { source.stop(); } catch {} });
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">
          🌃 Saigon Night
        </h1>
        <button
          onClick={toggleAll}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            isPlaying 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          {isPlaying ? '⏹ Stop All' : '▶ Play All'}
        </button>
      </header>

      {/* Master Volume */}
      <div className="mb-6 p-4 bg-white/10 rounded-xl backdrop-blur">
        <label className="flex items-center gap-3">
          <span className="text-sm">🔊 Master Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="flex-1 accent-pink-400"
          />
          <span className="text-sm w-12 text-right">{Math.round(masterVolume * 100)}%</span>
        </label>
      </div>

      {/* Track List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TRACKS.map(track => {
          const isActive = activeTracks.has(track.id);
          return (
            <button
              key={track.id}
              onClick={() => toggleTrack(track)}
              className={`flex items-center gap-3 p-3 rounded-xl text-left transition border ${
                isActive
                  ? 'bg-pink-500/20 border-pink-400/50 shadow-lg shadow-pink-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-2xl">{track.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{track.name}</div>
                <div className="text-xs text-white/60">{track.category}</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
            </button>
          );
        })}
      </div>

      {/* Chat Button (placeholder) */}
      <button className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 flex items-center justify-center text-2xl shadow-lg hover:scale-105 transition">
        💬
      </button>
    </div>
  );
}