/**
 * @class MusicPlayer
 * @description 一个使用 Web Audio API 的现代音频播放器类，专注于精确控制和状态管理。
 */
class MusicPlayer {
  constructor() {
    this.audioContext = null; // 音频上下文
    this.buffer = null; // 解码后的音频数据缓冲区
    this.source = null; // 当前的音频源节点 (AudioBufferSourceNode)

    this.isPlaying = false; // 是否正在播放
    this.isPaused = false; // 是否处于暂停状态

    this.startTime = 0; // 当前播放段落的开始时间（在 context.currentTime 中）
    this.pausedAt = 0; // 暂停时，记录已播放的时长

    this.onended = null; // 播放结束时的回调函数
  }

  /**
   * 初始化或重新初始化 AudioContext。
   * 如果上下文被浏览器关闭，这将非常有用。
   * @private
   */
  _initAudioContext() {
    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
  }

  /**
   * 加载并解码音频文件。
   * @param {File} file - 要加载的音频文件。
   * @returns {Promise<void>}
   */
  async initSound(file) {
    this._initAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * 设置一个当音频播放自然结束时触发的回调函数。
   * @param {Function} callback - 回调函数。
   */
  setOnEndedCallback(callback) {
    this.onended = callback;
  }

  /**
   * 从指定时间开始播放音频。
   * @param {number} [startTime=0] - 音频开始播放的位置（秒）。
   * @returns {boolean} 如果成功开始播放则返回 true，否则返回 false。
   */
  play(startTime = 0) {
    if (!this.buffer || this.isPlaying) return false;

    this._initAudioContext(); // 确保上下文是活动的
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.audioContext.destination);

    this.source.onended = () => {
      // 只有在不是手动停止的情况下才调用 onended 回调
      if (this.isPlaying && this.onended) {
        this.onended();
      }
    };

    this.source.start(0, startTime);
    this.startTime = this.audioContext.currentTime; // 记录播放开始的精确时间
    this.pausedAt = startTime; // 重置暂停时间点

    this.isPlaying = true;
    this.isPaused = false;
    return true;
  }

  /**
   * 暂停当前播放的音频。
   * @returns {boolean} 如果成功暂停则返回 true。
   */
  pause() {
    if (!this.isPlaying || this.isPaused) return false;

    // 在停止前计算已播放时长
    this.pausedAt += this.audioContext.currentTime - this.startTime;

    // 停止并销毁当前的 source 节点
    this.source.onended = null; // 阻止意外触发 onended
    this.source.stop(0);
    this.source = null;

    this.isPlaying = false;
    this.isPaused = true;
    return true;
  }

  /**
   * 从暂停处恢复播放。
   * @returns {boolean} 如果成功恢复则返回 true。
   */
  resume() {
    if (!this.isPaused) return false;
    // 从记录的暂停点继续播放
    return this.play(this.pausedAt);
  }

  /**
   * 停止播放并重置状态，但保留缓冲区。
   * 这是 seekTo 的一个核心部分。
   */
  stop() {
    if (!this.source) return;

    // 在手动停止前移除 onended 回调，这是避免 bug 的关键
    this.source.onended = null;
    this.source.stop(0);
    this.source = null;

    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.pausedAt = 0;
  }

  /**
   * 完全停止播放，并清除音频缓冲区和状态。
   */
  fullStop() {
    this.stop(); // 首先停止当前播放
    this.buffer = null; // 清除缓冲区
    this.onended = null; // 清除回调
  }

  /**
   * 跳转到音频的特定时间点。
   * @param {number} time - 要跳转到的时间（秒）。
   */
  seekTo(time) {
    const wasPlaying = this.isPlaying;
    this.stop(); // 停止当前播放

    if (wasPlaying) {
      this.play(time); // 如果之前在播放，则从新位置继续播放
    } else {
      // 如果之前是暂停的，只更新暂停点
      this.isPaused = true;
      this.pausedAt = time;
    }
  }

  /**
   * 获取当前播放时间。
   * @returns {number} 当前播放时间（秒）。
   */
  getCurrentTime() {
    if (this.isPaused) {
      return this.pausedAt;
    }
    if (this.isPlaying) {
      return this.pausedAt + (this.audioContext.currentTime - this.startTime);
    }
    return 0;
  }

  /**
   * 清理资源，关闭 AudioContext。
   * 在组件卸载时调用。
   */
  destroy() {
    this.fullStop();
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
    this.audioContext = null;
  }
}

export default new MusicPlayer();
