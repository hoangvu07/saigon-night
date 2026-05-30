// app/constants/tracks.ts
export interface Track {
  id: string;
  name: string;
  src: string;
  category: 'nature' | 'environment' | 'music';
  icon: string;
}

export const TRACKS: Track[] = [
  { id: 'cafe', name: 'Quán Cafe', src: '/sounds/cafe.mp3', category: 'environment', icon: '☕' },
  { id: 'fire', name: 'Lửa Trại', src: '/sounds/fire.mp3', category: 'nature', icon: '🔥' },
  { id: 'forest', name: 'Rừng Cây', src: '/sounds/forest.mp3', category: 'nature', icon: '🌲' },
  { id: 'night', name: 'Đêm Khuya', src: '/sounds/night.mp3', category: 'environment', icon: '🌙' },
  { id: 'piano', name: 'Piano', src: '/sounds/piano.mp3', category: 'music', icon: '🎹' },
  { id: 'rain', name: 'Mưa Rơi', src: '/sounds/rain.mp3', category: 'nature', icon: '🌧️' },
  { id: 'waves', name: 'Sóng Biển', src: '/sounds/waves.mp3', category: 'nature', icon: '🌊' },
  { id: 'wind', name: 'Gió', src: '/sounds/wind.mp3', category: 'nature', icon: '💨' },
];