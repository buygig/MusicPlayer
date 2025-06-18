import { getBase64Image, parseLrc } from "@/utils";

/**
 * @typedef {import('vue').Ref<Array>} RefArray
 * @typedef {import('vue').Ref<string>} RefString
 * @typedef {import('vue').Ref<HTMLElement>} RefHTMLElement
 * @typedef {import('vue').Ref<Array<{file: File, name: string, index: number}>>} RefSongList
 */

/**
 * 音乐数据加载的组合式函数。
 * 负责获取歌曲元数据（ID3）、封面和三级歌词系统。
 *
 * @param {{
 *  lyrics: RefArray,
 *  currentLyricLine: RefString,
 *  artistName: RefString,
 *  songTitle: RefString,
 *  recordElement: RefHTMLElement,
 *  songList: RefSongList
 * }} refs - 从主组件传入的、用于更新UI的响应式引用。
 * @returns {{load: (song: {file: File}) => Promise<void>}} 返回一个包含 load 方法的对象。
 */
export function useSongLoader(refs) {
  const {
    lyrics,
    currentLyricLine,
    artistName,
    songTitle,
    recordElement,
    songList,
  } = refs;

  /**
   * 加载一首歌的所有元数据和歌词。
   * @param {{file: File, name: string, index: number}} song - 要加载的歌曲对象。
   */
  async function load(song) {
    // 重置UI状态
    lyrics.value = [];
    currentLyricLine.value = "";
    artistName.value = "加载中...";
    songTitle.value = song.name.replace(".mp3", "");
    if (recordElement.value) {
      recordElement.value.style.backgroundImage = "";
    }

    // 将回调式的 ID3.loadTags 封装成 Promise，使其能被 await 调用
    const getTags = (songFile) =>
      new Promise((resolve, reject) => {
        const url = songFile.urn || songFile.name;
        ID3.loadTags(url, () => resolve(ID3.getAllTags(url)), {
          tags: ["title", "artist", "picture", "lyrics"],
          dataReader: ID3.FileAPIReader(songFile),
          onError: (reason) => reject(reason),
        });
      });

    try {
      const tags = await getTags(song.file);

      // 更新UI
      artistName.value = tags.artist || "未知艺术家";
      songTitle.value = tags.title || song.name.replace(".mp3", "");
      const image = tags.picture;
      if (image && recordElement.value) {
        const base64 = getBase64Image(image);
        recordElement.value.style.backgroundImage = `url(${base64})`;
      }

      // --- 三级歌词获取逻辑 ---

      // 方案一: ID3 内嵌歌词
      if (tags.lyrics) {
        const lrcText =
          typeof tags.lyrics === "string" ? tags.lyrics : tags.lyrics.text;
        lyrics.value = parseLrc(lrcText);
        if (lyrics.value.length > 0) {
          console.log("成功: 从ID3标签加载歌词。");
          return;
        }
      }

      // 方案二: .lrc 文件
      const musicFileName = song.file.name.substring(
        0,
        song.file.name.lastIndexOf(".")
      );
      const lrcFile = songList.value.find(
        (item) => item.file.name === `${musicFileName}.lrc`
      );
      if (lrcFile) {
        const lrcText = await lrcFile.file.text();
        lyrics.value = parseLrc(lrcText);
        if (lyrics.value.length > 0) {
          console.log("成功: 从.lrc文件加载歌词。");
          return;
        }
      }

      // 方案三: 网络 API
      const artistForApi = tags.artist || "未知艺术家";
      const titleForApi = tags.title || song.name.replace(".mp3", "");
      if (artistForApi !== "未知艺术家" && titleForApi) {
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(
          artistForApi
        )}/${encodeURIComponent(titleForApi)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.lyrics) {
            lyrics.value = parseLrc(data.lyrics);
            if (lyrics.value.length > 0)
              console.log("成功: 从网络API加载歌词。");
          }
        }
      }
    } catch (error) {
      console.error("加载元数据或歌词失败:", error);
      artistName.value = "元数据加载失败";
    }
  }

  return {
    load,
  };
}
