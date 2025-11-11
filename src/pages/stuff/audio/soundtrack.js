// stuff/audio/soundtrack.js
export class Soundtrack {
  constructor(tracks = []) {
    this.tracks = tracks;  // Array of { id, src, volume }
    this.current = null;
    this.audio = null;
  }

  play(id, { loop = true, volume = 0.5 } = {}) {
    const track = this.tracks.find(t => t.id === id);
    if (!track) {
      console.warn(`🎵 Track "${id}" not found`);
      return;
    }

    // stop previous
    this.stop();

    // create audio
    this.audio = new Audio(track.src);
    this.audio.loop = loop;
    this.audio.volume = track.volume ?? volume;
    this.audio.play().catch(err => console.warn('Audio play blocked by browser:', err));
    this.current = id;

    console.log(`🎶 Now playing: ${track.id}`);
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
      this.current = null;
    }
  }

  fadeOut(duration = 2000) {
    if (!this.audio) return;
    const startVol = this.audio.volume;
    const steps = 20;
    const stepTime = duration / steps;
    let step = 0;

    const fade = setInterval(() => {
      step++;
      this.audio.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        this.stop();
        clearInterval(fade);
      }
    }, stepTime);
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (this.audio) this.audio.muted = this.muted;
  }
  toggleMuted() {
    this.setMuted(!this.muted);
  }
  isMuted() {
    return !!this.muted;
  }
  resume() {
    // useful when autoplay was blocked; call on a user click
    if (this.audio) this.audio.play().catch(()=>{});
  }
}
