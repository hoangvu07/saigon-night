// app/components/AudioMixerUI.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TRACKS, type Track } from '../constants/tracks';
import ChatBox from './ChatBox';

interface TrackState {
  isPlaying: boolean;
  volume: number; // 0-1
  gainNode: GainNode | null;
}

export default function AudioMixerUI() {
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [trackStates, setTrackStates] = useState<Map<string, TrackState>>(new Map());
  const [showChat, setShowChat] = useState(false);
  
  // Export states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(5); // minutes
  const [recordingTimeLeft, setRecordingTimeLeft] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize AudioContext
  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
      masterGainRef.current.gain.value = masterVolume;
      
      // Initialize track states
      const initialStates = new Map<string, TrackState>();
      TRACKS.forEach(track => {
        const gainNode = audioContextRef.current!.createGain();
        gainNode.connect(masterGainRef.current!);
        gainNode.gain.value = 0.7; // default volume
        initialStates.set(track.id, { isPlaying: false, volume: 0.7, gainNode });
      });
      setTrackStates(initialStates);
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, [masterVolume]);

  // Load audio buffer
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

  // Toggle individual track
  const toggleTrack = useCallback(async (track: Track) => {
    await initAudio();
    const ctx = audioContextRef.current!;
    const trackState = trackStates.get(track.id);
    
    if (!trackState) return;
    
    if (trackState.isPlaying) {
      // Stop track
      sourcesRef.current.get(track.id)?.stop();
      sourcesRef.current.delete(track.id);
      setTrackStates(prev => new Map(prev).set(track.id, { ...trackState, isPlaying: false }));
    } else {
      // Play track
      const buffer = await loadBuffer(track);
      if (!buffer) return;
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(trackState.gainNode!);
      source.start();
      sourcesRef.current.set(track.id, source);
      setTrackStates(prev => new Map(prev).set(track.id, { ...trackState, isPlaying: true }));
    }
  }, [initAudio, loadBuffer, trackStates]);

  // Update track volume
  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    const trackState = trackStates.get(trackId);
    if (trackState?.gainNode) {
      trackState.gainNode.gain.setTargetAtTime(volume, audioContextRef.current!.currentTime, 0.1);
      setTrackStates(prev => new Map(prev).set(trackId, { ...trackState, volume }));
    }
  }, [trackStates]);

  // Play/Stop all
  const toggleAll = useCallback(async () => {
    if (isPlayingAll) {
      // Stop all
      sourcesRef.current.forEach(source => { try { source.stop(); } catch {} });
      sourcesRef.current.clear();
      setTrackStates(prev => {
        const newMap = new Map(prev);
        newMap.forEach((state, id) => newMap.set(id, { ...state, isPlaying: false }));
        return newMap;
      });
    } else {
      // Play all
      await initAudio();
      for (const track of TRACKS) {
        const state = trackStates.get(track.id);
        if (state && !state.isPlaying) {
          await toggleTrack(track);
        }
      }
    }
    setIsPlayingAll(!isPlayingAll);
  }, [isPlayingAll, initAudio, toggleTrack, trackStates]);

  // Update master volume
  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setTargetAtTime(masterVolume, audioContextRef.current.currentTime, 0.1);
    }
  }, [masterVolume]);

  // Export/Record functionality
  const startRecording = useCallback(async () => {
    await initAudio();
    
    // Create destination for recording
    const dest = audioContextRef.current!.createMediaStreamDestination();
    masterGainRef.current!.connect(dest);
    
    // Also connect to speakers
    masterGainRef.current!.connect(audioContextRef.current!.destination);
    
    const mediaRecorder = new MediaRecorder(dest.stream);
    mediaRecorderRef.current = mediaRecorder;
    recordedChunksRef.current = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saigon-night-mix-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setRecordingTimeLeft(null);
    };
    
    // Start recording
    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);
    
    // Set timeout
    const durationMs = recordingDuration * 60 * 1000;
    setRecordingTimeLeft(durationMs);
    
    const interval = setInterval(() => {
      setRecordingTimeLeft(prev => {
        if (prev === null || prev <= 1000) {
          clearInterval(interval);
          return null;
        }
        return prev - 1000;
      });
    }, 1000);
    
    recordingTimeoutRef.current = setTimeout(() => {
      mediaRecorder.stop();
      clearInterval(interval);
    }, durationMs);
    
  }, [initAudio, recordingDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      setRecordingTimeLeft(null);
    }
  }, [isRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      sourcesRef.current.forEach(source => { try { source.stop(); } catch {} });
      audioContextRef.current?.close();
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🌃</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">
            Saigon Night
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={toggleAll}
            className={`px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
              isPlayingAll 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
            }`}
          >
            {isPlayingAll ? '⏹ Stop All' : '▶ Play All'}
          </button>
          
          {/* Export Button */}
          {!isRecording ? (
            <div className="relative group">
              <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold hover:scale-105 transition shadow-lg shadow-purple-500/30">
                💾 Export
              </button>
              {/* Export Dropdown */}
              <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-2xl border border-white/10 p-4 hidden group-hover:block z-50">
                <h3 className="font-bold mb-3 text-pink-400">🎵 Export Mix</h3>
                <label className="block mb-3">
                  <span className="text-sm text-white/70">Duration (max 60 min)</span>
                  <select 
                    value={recordingDuration}
                    onChange={(e) => setRecordingDuration(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 bg-slate-700 rounded-lg text-white"
                  >
                    {[1, 5, 10, 15, 30, 45, 60].map(min => (
                      <option key={min} value={min}>{min} minute{min > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={startRecording}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition"
                >
                  🎙 Start Recording
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-red-600 rounded-xl font-bold animate-pulse shadow-lg shadow-red-600/30"
            >
              ⏹ Stop ({formatTime(recordingTimeLeft || 0)})
            </button>
          )}
        </div>
      </header>

      {/* Master Volume */}
      <div className="mb-6 p-4 bg-white/10 rounded-2xl backdrop-blur-lg border border-white/20">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🔊</span>
          <span className="font-bold text-lg">Master Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
          />
          <span className="text-lg font-mono w-16 text-right">{Math.round(masterVolume * 100)}%</span>
        </div>
      </div>

      {/* Track List with Individual Volumes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {TRACKS.map(track => {
          const state = trackStates.get(track.id);
          const isActive = state?.isPlaying;
          
          return (
            <div
              key={track.id}
              className={`p-4 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-400/50 shadow-lg shadow-pink-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => toggleTrack(track)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition ${
                    isActive 
                      ? 'bg-pink-500 shadow-lg shadow-pink-500/30' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {track.icon}
                </button>
                <div className="flex-1">
                  <div className="font-bold text-lg">{track.name}</div>
                  <div className="text-sm text-white/60">{track.category}</div>
                </div>
                <div className={`w-4 h-4 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
              </div>
              
              {/* Individual Volume Slider */}
              <div className="flex items-center gap-3 pl-14">
                <span className="text-sm text-white/60">🔉</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state?.volume || 0.7}
                  onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))}
                  disabled={!isActive}
                  className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-30"
                />
                <span className="text-sm font-mono w-12 text-right">
                  {Math.round((state?.volume || 0.7) * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Button */}
      <button 
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 flex items-center justify-center text-3xl shadow-2xl hover:scale-110 transition transform z-40"
      >
        💬
      </button>

      {/* Chat Box */}
      {showChat && <ChatBox onClose={() => setShowChat(false)} />}
    </div>
  );
}