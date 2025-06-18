<template>
  <div class="song-list">
    <h3>Song List</h3>
    <ul>
      <li
        v-for="(song, index) in songList"
        :key="index"
        @click="selectSong(index)"
      >
        {{ song.name }}
      </li>
    </ul>
  </div>
</template>
<script setup>
const props = defineProps({
  songList: {
    type: Array,
    default: () => [],
  },
});
const emit = defineEmits(["selectSong"]);
const selectSong = (index) => {
  const selectedSong = props.songList.value[index];
  selectSong.index = index;
  emit("selectSong", selectedSong);
};
</script>

<style>
.song-list {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 200px;
  max-height: 300px;
  overflow-y: auto;
  background: #fff;
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 10px 20px rgba(111, 83, 91, 0.3);

  & h3 {
    margin-top: 0;
    margin-bottom: 10px;
  }
  & ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  & li {
    padding: 5px 0;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & li:hover {
    background-color: #f0f0f0;
  }
}
</style>
