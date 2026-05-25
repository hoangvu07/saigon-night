export class SoundEntity {
  context: AudioContext
  audio: HTMLAudioElement
  source: MediaElementAudioSourceNode
  gainNode: GainNode
  panner: PannerNode
  sendGain: GainNode

  x = 0
  y = 0
  z = 0

  constructor(
    context: AudioContext,
    audioElement: HTMLAudioElement,
    masterGain: GainNode,
    convolver: ConvolverNode
  ) {
    this.context = context
    this.audio = audioElement

    this.source = context.createMediaElementSource(audioElement)
    this.gainNode = context.createGain()
    this.panner = context.createPanner()
    this.sendGain = context.createGain()

    // Spatial config
    this.panner.panningModel = "HRTF"
    this.panner.distanceModel = "inverse"
    this.panner.refDistance = 1
    this.panner.maxDistance = 50
    this.panner.rolloffFactor = 1.2

    // Direct sound chain
    this.source.connect(this.gainNode)
    this.gainNode.connect(this.panner)
    this.panner.connect(masterGain)

    // Reverb send (giảm mạnh lại)
    this.sendGain.gain.value = 0.1
    this.panner.connect(this.sendGain)
    this.sendGain.connect(convolver)
  }

  setPosition(x: number, y: number, z: number) {
    this.x = x
    this.y = y
    this.z = z

    const now = this.context.currentTime
    this.panner.positionX.setValueAtTime(x, now)
    this.panner.positionY.setValueAtTime(y, now)
    this.panner.positionZ.setValueAtTime(z, now)
  }

  setVolume(value: number) {
    this.gainNode.gain.value = value
  }

  play() {
    this.audio.loop = true
    this.audio.play()
  }
}