<template>
  <div class="control">
    <button
      class="prev btn"
      type="button"
      aria-label="上一首"
      @click="onPrevClick"
    >
      <svg>
        <use href="/allsvg.svg#prev"></use>
      </svg>
    </button>

    <button
      class="play btn"
      type="button"
      :aria-label="playing ? '暂停' : '播放'"
      @click="onPlayClick"
    >
      <svg id="play" v-if="!playing">
        <use href="/allsvg.svg#play"></use>
      </svg>
      <svg id="stop" v-else>
        <use href="/allsvg.svg#stop"></use>
      </svg>
    </button>

    <button
      class="next btn"
      type="button"
      aria-label="下一首"
      @click="onNextClick"
    >
      <svg>
        <use href="/allsvg.svg#next"></use>
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  playing: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["prevSong", "playSong", "nextSong"]);

const onPrevClick = () => emit("prevSong");
const onPlayClick = () => emit("playSong");
const onNextClick = () => emit("nextSong");
</script>

<style scoped>
.control {
  width: 250px;
  height: 80px;
  display: flex;
  justify-content: space-between;
  margin-right: 15px;
}

.btn {
  /* 重置按钮样式 */
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  /* 已有样式 */
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #dee0e4;
}

.btn svg {
  width: 28px;
  height: 28px;
}

.btn:nth-of-type(2) {
  color: #c7cad1;
}

.btn:hover {
  background: #dee0e4;
  border-radius: 10px;
  color: #fff;
}
</style>
