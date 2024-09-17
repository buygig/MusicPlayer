class AudioProcessing {
  constructor() {
    this.audioContext = new AudioContext();
    this.buffer = null;
  }

  async initSound(file) {
    try {
      const arrayBuffer = await this.#readAsArrayBuffer(file);
      this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error("Error initializing sound:", error);
    }
  }

  #readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}

class MusicPlayer extends AudioProcessing {
  constructor() {
    super();
    this.audioSource = null;
  }

  play(startTime = 0) {
    if (!this.buffer) {
      console.error("Audio buffer not ready");
      return;
    }
    this.stop();
    this.audioSource = this.audioContext.createBufferSource();
    this.audioSource.buffer = this.buffer;
    this.audioSource.connect(this.audioContext.destination);
    this.audioSource.start(0, startTime);
  }

  suspend() {
    if (this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  resume() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  stop() {
    if (this.audioSource) {
      this.audioSource.stop();
      this.audioSource.disconnect();
      this.audioSource = null;
    }
  }
}

const Player = new MusicPlayer();

export default Player;