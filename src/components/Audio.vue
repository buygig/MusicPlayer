<template>
  <input type="file" ref="fileInput" @change="handleFileChange" />
  <div class="container">
    <div class="record" @click="addFile" :class="{ bigger: Playing }"></div>
    <div class="control">
      <div class="prev btn">
        <svg>
          <use href="/allsvg.svg#prev"></use>
        </svg>
      </div>

      <div class="play btn" @click="playEvent">
        <svg id="play" v-if="!Playing">
          <use href="/allsvg.svg#play"></use>
        </svg>

        <svg id="stop" v-else>
          <use href="/allsvg.svg#stop"></use>
        </svg>
      </div>

      <div class="next btn">
        <svg>
          <use href="/allsvg.svg#next"></use>
        </svg>
      </div>
    </div>
  </div>

  <div class="msg" :class="{ up: Playing }">
    <div class="detail">
      <div class="title">{{ fileName }}</div>
      <div class="words"></div>
      <div
        class="progress-bar"
        ref="progressBar"
        @mousedown="startDrag"
        @mousemove="drag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
      >
        <div class="progress" :style="{ width: `${progressWidth}%` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";

// 音频上下文
const audioContext = new AudioContext();

// 文件和文件名
const file = ref(null);
const fileName = ref("");

// 音频状态
const Playing = ref(false);
const pValue = ref(0);
const pMax = ref(0);
const progressWidth = ref(0);
const audioPlaybackTime = ref(0);

// DOM 引用
const progressBar = ref(null);
const fileInput = ref(null);

// 音频相关变量
let buffer = null;
let audioSource = null;
let timer = null;

// 是否正在拖动
const isDragging = ref(false);

// 添加文件
const addFile = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

// 处理文件变化
const handleFileChange = (event) => {
  const selectedFile = event.target.files[0];
  if (selectedFile) {
    file.value = selectedFile;
    fileName.value = selectedFile.name;
    loadFile(selectedFile);
    readAsArrayBuffer(selectedFile).then(initSound);
  }
};

// 读取文件为 ArrayBuffer
function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 加载文件元数据
function loadFile(file) {
  const url = file.urn || file.name;
  ID3.loadTags(url, () => showTags(url), {
    tags: ["picture"],
    dataReader: ID3.FileAPIReader(file),
  });
}

// 显示标签信息（专辑封面）
function showTags(url) {
  const record = document.querySelector(".record");
  const tags = ID3.getAllTags(url);
  const image = tags.picture;

  if (image) {
    const base64 = getBase64Image(image);
    record.style.backgroundImage = `url(${base64})`;
  } else {
    record.style.background = `#000`;
  }
}

// 获取 Base64 编码的图片
function getBase64Image(image) {
  const base64String = image.data.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return `data:${image.format};base64,${window.btoa(base64String)}`;
}

// 初始化音频
function initSound(arrayBuffer) {
  audioContext.decodeAudioData(arrayBuffer).then((decodedBuffer) => {
    buffer = decodedBuffer;
    pMax.value = buffer.duration;
    updateProgressWidth();
  });
}

// 播放音频
function playSound(startTime = 0) {
  if (!buffer) {
    console.error("Audio buffer not ready");
    return;
  }

  if (audioSource) {
    audioSource.stop();
  }

  audioSource = audioContext.createBufferSource();
  audioSource.buffer = buffer;
  audioSource.connect(audioContext.destination);
  audioSource.start(0, startTime);
  audioPlaybackTime.value = startTime;
  Playing.value = true;
  pValue.value = startTime;
  startProgressUpdate();
}

// 播放/暂停事件
const playEvent = () => {
  const record = document.querySelector(".record");

  if (Playing.value) {
    audioContext.suspend();
    clearInterval(timer);
    Playing.value = false;
    record.style["animation-play-state"] = "paused";
  } else {
    if (buffer) {
      if (audioSource) {
        audioContext.resume();
      } else {
        playSound(pValue.value);
      }
      Playing.value = true;
      record.style["animation-play-state"] = "running";
      startProgressUpdate();
    } else {
      console.error("Audio not loaded yet");
    }
  }
};

// 开始更新进度
function startProgressUpdate() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (audioContext.state === "running") {
      audioPlaybackTime.value = audioContext.currentTime;
      if (!isDragging.value) {
        pValue.value = audioPlaybackTime.value;
      }
    }
  }, 100);
}

// 更新进度条宽度
function updateProgressWidth() {
  if (pMax.value > 0) {
    progressWidth.value = (pValue.value / pMax.value) * 100;
  } else {
    progressWidth.value = 0;
  }
}

// 开始拖动进度条
function startDrag(event) {
  event.preventDefault();
  isDragging.value = true;
  drag(event);
}

// 拖动进度条
function drag(event) {
  if (!isDragging.value) return;
  if (!progressBar.value) return;

  const rect = progressBar.value.getBoundingClientRect();
  const percentage = Math.max(
    0,
    Math.min(1, (event.clientX - rect.left) / rect.width)
  );

  const newTime = percentage * pMax.value;
  pValue.value = newTime;
  updateProgressWidth();

  if (Playing.value) {
    if (audioSource) {
      audioSource.stop();
      audioSource = null;
    }
    playSound(newTime);
  }
}

// 停止拖动进度条
function stopDrag() {
  isDragging.value = false;
}

// 监听播放进度
watch(pValue, (newValue) => {
  if (newValue >= pMax.value) {
    resetPlayback();
  }
});

// 更新进度条
// watch([pValue, pMax], ([newValue, maxValue]) => {
//   if (maxValue > 0) {
//     progressWidth.value = Math.min((newValue / maxValue) * 100, 100);
//   } else {
//     progressWidth.value = 0;
//   }
// });

// 重置播放状态
function resetPlayback() {
  Playing.value = false;
  pValue.value = 0;
  clearInterval(timer);
  timer = null;
  document.querySelector(".record").style["animation-play-state"] = "paused";
}

// 组件挂载时
onMounted(() => {
  updateProgressWidth();
});

// 组件卸载时
onUnmounted(() => {
  document.removeEventListener("mousemove", drag);
  document.removeEventListener("mouseup", stopDrag);
  if (audioSource) {
    audioSource.stop();
  }
  if (audioContext) {
    audioContext.close();
  }
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
}

.bigger {
  width: 120px;
  height: 120px;
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
  height: 74px;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  background: #fff8fa;
  transition: all 1s;
}

.detail {
  width: 60%;
  margin: auto;
  margin-right: 0px;
  margin-top: 15px;
  padding: 5px 10px;

  & .title {
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
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
  transform: translate(-50%, -165%);
}
</style>
