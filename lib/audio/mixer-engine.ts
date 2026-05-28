export interface TrackDef { id: string; src: string; label: string; }
export interface TrackState { id: string; playing: boolean; volume: number; }
export interface MixerState { tracks: TrackState[]; masterVolume: number; timer: { active: boolean; remainingSec: number }; }

export class AudioMixerEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackGains = new Map<string, GainNode>();
  private audioEls = new Map<string, HTMLAudioElement>();
  private state: MixerState;
  private listeners = new Set<(s: MixerState) => void>();
  private timerId: number | null = null;
  private initialized = false;

  constructor(trackDefs: TrackDef[], initialMaster = 0.8) {
    this.state = { tracks: trackDefs.map(t => ({ id: t.id, playing: false, volume: 0.8 })), masterVolume: initialMaster, timer: { active: false, remainingSec: 0 } };
    trackDefs.forEach(t => { const a = new Audio(t.src); a.loop = true; a.preload = 'auto'; this.audioEls.set(t.id, a); });
  }

  private ensureContext() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = this.state.masterVolume;
    this.audioEls.forEach((audio, id) => {
      const src = this.ctx!.createMediaElementSource(audio);
      const g = this.ctx!.createGain();
      g.gain.value = this.state.tracks.find(t => t.id === id)!.volume;
      src.connect(g);
      if (this.masterGain) g.connect(this.masterGain);
      this.trackGains.set(id, g);
    });
    this.initialized = true;
  }

  playTrack(id: string) { if (typeof window === 'undefined') return; this.ensureContext(); if (this.ctx?.state === 'suspended') this.ctx.resume(); const a = this.audioEls.get(id); if (a && !this.state.tracks.find(t => t.id === id)?.playing) { a.play().catch(() => {}); this.updateTrack(id, { playing: true }); } }
  pauseTrack(id: string) { const a = this.audioEls.get(id); if (a && a.paused === false) { a.pause(); this.updateTrack(id, { playing: false }); } }
  setTrackVolume(id: string, v: number) { const val = Math.max(0, Math.min(1, v)); this.trackGains.get(id)?.gain.setTargetAtTime(val, this.ctx?.currentTime || 0, 0.02); this.updateTrack(id, { volume: val }); }
  setMasterVolume(v: number) { const val = Math.max(0, Math.min(1, v)); this.masterGain?.gain.setTargetAtTime(val, this.ctx?.currentTime || 0, 0.02); this.state.masterVolume = val; this.emit(); }
  startTimer(mins: number) { this.stopTimer(); const end = Date.now() + mins * 60000; this.state.timer = { active: true, remainingSec: mins * 60 }; this.timerId = window.setInterval(() => { const r = Math.max(0, Math.ceil((end - Date.now()) / 1000)); this.state.timer.remainingSec = r; if (r <= 0) { this.pauseAll(); this.stopTimer(); } this.emit(); }, 1000); this.emit(); }
  stopTimer() { if (this.timerId) { clearInterval(this.timerId); this.timerId = null; } this.state.timer = { active: false, remainingSec: 0 }; this.emit(); }
  pauseAll() { this.state.tracks.forEach(t => { if (t.playing) this.pauseTrack(t.id); }); }
  playAll() { this.state.tracks.forEach(t => { if (!t.playing) this.playTrack(t.id); }); }
  saveMix(name: string) { if (typeof window === 'undefined') return; localStorage.setItem('mix-' + name, JSON.stringify({ masterVolume: this.state.masterVolume, tracks: this.state.tracks })); }
  loadMix(name: string): boolean { if (typeof window === 'undefined') return false; const raw = localStorage.getItem('mix-' + name); if (!raw) return false; try { const d = JSON.parse(raw); this.setMasterVolume(d.masterVolume); d.tracks.forEach((t: TrackState) => this.setTrackVolume(t.id, t.volume)); return true; } catch { return false; } }
  getSavedMixes(): string[] { if (typeof window === 'undefined') return []; return Object.keys(localStorage).filter(k => k.startsWith('mix-')).map(k => k.replace('mix-', '')); }
  deleteMix(name: string): boolean { if (typeof window === 'undefined') return false; const k = 'mix-' + name; if (localStorage.getItem(k)) { localStorage.removeItem(k); return true; } return false; }
  dispose() { this.pauseAll(); this.stopTimer(); this.audioEls.forEach(a => { a.pause(); a.src = ''; }); this.ctx?.close(); this.initialized = false; }
  subscribe(fn: (s: MixerState) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  getState() { return { ...this.state }; }
  private updateTrack(id: string, p: Partial<TrackState>) { const t = this.state.tracks.find(x => x.id === id); if (t) Object.assign(t, p); this.emit(); }
  private emit() { this.listeners.forEach(fn => fn({ ...this.state })); }
}