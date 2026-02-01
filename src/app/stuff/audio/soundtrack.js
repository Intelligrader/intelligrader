export class Soundtrack {
  constructor(tracks = []) {
    this.tracks = tracks;
    this.current = null;
    this.audio = null;
    this.muted = false;
  }

  async play(id, { loop = true, volume = 0.5 } = {}) {
    const track = this.tracks.find(t => t.id === id);
    if (!track) {
      console.warn(`🎵 Track "${id}" not found`);
      return;
    }

    // already playing this track
    if (this.current === id && this.audio) return;

    // stop previous cleanly
    await this.stop();

    this.audio = new Audio(track.src);
    this.audio.loop = loop;
    this.audio.volume = track.volume ?? volume;
    this.audio.muted = this.muted;

    try {
      await this.audio.play();
    } catch (err) {
      console.warn("Audio play blocked:", err);
    }

    this.current = id;
  }

  async stop() {
    if (!this.audio) return;

    this.audio.pause();
    await Promise.resolve(); // allow pause to commit

    this.audio.currentTime = 0;
    this.audio = null;
    this.current = null;
  }

  fadeOut(duration = 2000) {
    return new Promise(resolve => {
      if (!this.audio) return resolve();

      const startVol = this.audio.volume;
      const steps = 20;
      const stepTime = duration / steps;
      let step = 0;

      const fade = setInterval(() => {
        step++;
        if (!this.audio) return clearInterval(fade);
        this.audio.volume = Math.max(0, startVol * (1 - step / steps));

        if (step >= steps) {
          clearInterval(fade);
          this.stop().then(resolve);
        }
      }, stepTime);
    });
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
    if (this.audio) this.audio.play().catch(() => {});
  }
}
