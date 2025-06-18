<template>
  <input
    type="file"
    ref="fileInput"
    @change="handleFileChange"
    multiple
    aria-label="上传文件"
  />
  <div class="container">
    <div
      class="record"
      ref="recordElement"
      @click="addFile"
      :class="{ bigger: Playing }"
    ></div>
    <Control
      :playing="Playing"
      @prevSong="prevSong"
      @playSong="playSong"
      @nextSong="nextSong"
    />
  </div>

  <div class="msg" :class="{ up: Playing }">
    <div class="detail">
      <div class="song-title">{{ songTitle }}</div>
      <div class="artist">{{ currentLyricLine || artistName }}</div>
      <div class="progress-bar" ref="progressBar" @mousedown="startDrag">
        <div
          class="progress"
          ref="progressElement"
          :style="{ width: `${progressWidth}%` }"
        ></div>
      </div>
    </div>
  </div>
  <!-- <SongList :songList="songList" /> -->
</template>

<script setup>
import { ref, watch, onUnmounted } from "vue";
import Control from "@/components/Control.vue";
import MusicPlayer from "@/services/MusicPlayer.js";
import { useDrag } from "@/composables/useDrag";
import { useSongLoader } from "@/composables/useSongLoader";

// 文件和文件名
const file = ref(null);

// 音频状态
const Playing = ref(false);
const pValue = ref(0);
const pMax = ref(0);
const progressWidth = ref(0);
const audioPlaybackTime = ref(0);

// DOM 引用
const progressBar = ref(null);
const fileInput = ref(null);
const recordElement = ref(null);
const progressElement = ref(null);

// 音频相关变量
let timer = null;

// 新增：用于防止重置函数重入的标志
const isResetting = ref(false);

// 歌曲列表
const songList = ref([]);
const currentSongIndex = ref(-1);

// 此处定义 playingBeforeDrag 以便在作用域中访问
let playingBeforeDrag = false;

// 新增：用于歌词的状态
const lyrics = ref([]);
const currentLyricLine = ref("");

// 新增：状态
const artistName = ref("");
const songTitle = ref("选择一首歌曲"); // 默认文本

// 添加文件
const addFile = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

// --- 初始化组合式函数 ---
const { startDrag, isDragging } = useDrag({
  progressBar,
  progressElement,
  pMax,
  onDragStart: (newTime) => {
    playingBeforeDrag = Playing.value;
    clearInterval(timer);
    updateProgressUI(newTime);
  },
  onDrag: (newTime) => {
    updateProgressUI(newTime);
  },
  onDragEnd: () => {
    MusicPlayer.seekTo(pValue.value);
    if (playingBeforeDrag) {
      MusicPlayer.play(pValue.value);
    }
    Playing.value = MusicPlayer.isPlaying;
    if (Playing.value) {
      startProgressUpdate();
    }
  },
});

// 使用新的歌曲加载器
const { load: loadSongData } = useSongLoader({
  lyrics,
  currentLyricLine,
  artistName,
  songTitle,
  recordElement,
  songList,
});

const handleFileChange = async (event) => {
  const selectedFiles = event.target.files;
  if (selectedFiles.length > 0) {
    songList.value = Array.from(selectedFiles).map((file, index) => ({
      file,
      name: file.name,
      index,
    }));
    await selectSong(songList.value[0]);
  }
};

const selectSong = async (song) => {
  currentSongIndex.value = song.index;
  file.value = song.file;

  MusicPlayer.fullStop();
  Playing.value = false;
  clearInterval(timer);
  pValue.value = 0;

  // 并行启动音频准备和元数据加载
  const audioPromise = MusicPlayer.initSound(song.file);
  const dataPromise = loadSongData(song); // 使用来自 useSongLoader 的函数

  try {
    // 等待两个流程都完成
    await Promise.all([audioPromise, dataPromise]);

    // 只有在音频准备好之后才更新播放器状态
    pMax.value = MusicPlayer.buffer.duration;
    MusicPlayer.setOnEndedCallback(() => {
      resetPlayback(true);
    });
  } catch (error) {
    console.error("选择歌曲时发生错误:", error);
    pMax.value = 0;
  }
};

// 播放音频
function playSound(startTime = 0) {
  if (MusicPlayer.play(startTime)) {
    Playing.value = true;
    startProgressUpdate();
  }
}

async function prevSong() {
  if (currentSongIndex.value > 0) {
    const wasPlaying = Playing.value;
    await selectSong(songList.value[currentSongIndex.value - 1]);
    if (wasPlaying) playSound();
  }
}

// 播放/暂停事件
function playSong() {
  if (Playing.value) {
    const pausedAt = MusicPlayer.getCurrentTime();
    if (MusicPlayer.pause()) {
      clearInterval(timer);
      Playing.value = false;
      pValue.value = pausedAt;
      audioPlaybackTime.value = pausedAt;
    }
  } else {
    if (MusicPlayer.buffer) {
      const success = MusicPlayer.isPaused
        ? MusicPlayer.resume()
        : MusicPlayer.play(audioPlaybackTime.value || 0);

      if (success) {
        Playing.value = true;
        startProgressUpdate();
      }
    }
  }
}

async function nextSong() {
  if (currentSongIndex.value < songList.value.length - 1) {
    const wasPlaying = Playing.value;
    await selectSong(songList.value[currentSongIndex.value + 1]);
    if (wasPlaying) playSound();
  }
}

// 开始更新进度
function startProgressUpdate() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (MusicPlayer.isPlaying && !isDragging.value) {
      const currentTime = MusicPlayer.getCurrentTime();
      pValue.value = currentTime;
      audioPlaybackTime.value = currentTime;

      // 将当前时间与歌词匹配
      if (lyrics.value.length > 0) {
        let line = "";
        // 找到时间在当前时间之前的最后一句歌词
        for (let i = 0; i < lyrics.value.length; i++) {
          if (lyrics.value[i].time <= currentTime) {
            line = lyrics.value[i].text;
          } else {
            break; // 当找到未来的歌词时停止
          }
        }
        if (currentLyricLine.value !== line) {
          currentLyricLine.value = line;
        }
      }
    }
  }, 100);
}

// 保持UI更新一致的辅助函数
function updateProgressUI(newTime) {
  if (pMax.value > 0) {
    const percentage = newTime / pMax.value;
    progressWidth.value = percentage * 100;
    audioPlaybackTime.value = newTime;
    pValue.value = newTime;
  }
}

watch(Playing, (isPlaying) => {
  if (recordElement.value) {
    recordElement.value.style["animation-play-state"] = isPlaying
      ? "running"
      : "paused";
  }
});

watch(pValue, (newValue) => {
  // 使用我们组合式函数中的 isDragging 引用
  if (!isDragging.value && pMax.value > 0) {
    progressWidth.value = (newValue / pMax.value) * 100;
  }
  // 这部分逻辑处理歌曲结束
  if (!isDragging.value && pMax.value > 0 && newValue >= pMax.value - 0.1) {
    resetPlayback(true);
  }
});

async function resetPlayback(shouldPlayNext = false) {
  if (isResetting.value) return; // 防止重入
  isResetting.value = true;

  const wasPlaying = Playing.value; // 在重置前捕获状态

  Playing.value = false;
  pValue.value = 0;
  clearInterval(timer);
  MusicPlayer.fullStop(); // 这会触发 onended，但标志会阻止它
  timer = null;

  try {
    if (shouldPlayNext && wasPlaying) {
      const nextIndex = currentSongIndex.value + 1;
      if (nextIndex < songList.value.length) {
        // 播放下一首歌的逻辑
        await selectSong(songList.value[nextIndex]);
        playSound(); // 从头播放下一首歌
      } else if (songList.value.length === 1) {
        // 循环单曲的逻辑
        const onlySong = songList.value[0];
        await selectSong(onlySong);
        playSound(0);
      }
    }
  } finally {
    isResetting.value = false; // 释放锁
  }
}

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (MusicPlayer) MusicPlayer.destroy();
});
</script>

<style scoped>
input {
  display: none;
}

.container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;

  display: flex;
  justify-content: space-between;
  align-items: center;

  width: 430px;
  height: 100px;
  background: #fff;
  border-radius: 14px;

  box-shadow: 0 40px 57px rgba(111, 83, 91, 0.6);
}

.record {
  position: relative;
  transform: translate(30%, -20%);
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: #000;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  cursor: pointer;

  animation: turn;
  animation-duration: 3s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-play-state: paused;

  transition: all 0.5s;
  box-shadow: 0 0 0 rgba(0, 0, 0, 0.2);
}

.bigger {
  width: 120px;
  height: 120px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

@keyframes turn {
  0% {
    transform: translate(30%, -20%) rotate(0deg);
  }

  100% {
    transform: translate(30%, -20%) rotate(360deg);
  }
}

.record::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: block;
  width: 25px;
  height: 25px;
  background: #fff;
  border-radius: 50%;
}

.control {
  width: 250px;
  height: 80px;
  display: flex;
  justify-content: space-between;
  margin-right: 15px;
}

.btn {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #dee0e4;

  & svg {
    width: 28px;
    height: 28px;
  }
}

.btn:nth-of-type(2) {
  color: #c7cad1;
}

.btn:hover {
  background: #dee0e4;
  border-radius: 10px;
  color: #fff;
}

.msg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 398px;
  height: 90px;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  background: #fff8fa;
  transition: all 1s;
  text-align: left;
}

.detail {
  width: 60%;
  height: 100%;
  display: flex;
  flex-direction: column;
  margin: auto;
  margin-right: 5px;
  padding: 5px 10px;

  & .artist {
    font-size: 12px;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & .song-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  & .progress-bar {
    width: 100%;
    height: 6px;
    background-color: #ebecee;
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    margin-top: 10px;
    position: relative;
  }

  & .progress {
    height: 100%;
    background-color: #ff8eab;
    border-radius: 3px;
    transition: width 0.1s linear;
    position: absolute;
    left: 0;
    top: 0;
  }
}

.up {
  transform: translate(-50%, -140%);
}
</style>
