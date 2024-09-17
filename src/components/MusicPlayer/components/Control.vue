<template>
  <div class="control">
    <div class="prev btn" @click="$emit('prevSong')">
      <svg>
        <use href="/allsvg.svg#prev"></use>
      </svg>
    </div>

    <div class="play btn" @click="$emit('playSong')">
      <svg id="play" v-if="!playing">
        <use href="/allsvg.svg#play"></use>
      </svg>

      <svg id="stop" v-else>
        <use href="/allsvg.svg#stop"></use>
      </svg>
    </div>

    <div class="next btn" @click="$emit('nextSong')">
      <svg>
        <use href="/allsvg.svg#next"></use>
      </svg>
    </div>
  </div>
</template>

<script setup>
defineProps({
  playing: Boolean,
});

defineEmits(["prevSong", "playSong", "nextSong"]);
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
