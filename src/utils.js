// 获取 Base64 编码的图片
export const getBase64Image = (image) => {
  let base64 = "";
  for (let i = 0; i < image.data.length; i++) {
    base64 += String.fromCharCode(image.data[i]);
  }
  return `data:${image.format};base64,${window.btoa(base64)}`;
};

/**
 * 将LRC格式的字符串解析为歌词对象数组。
 * @param {string} lrcText LRC文件的字符串内容。
 * @returns {Array<{time: number, text: string}>} 一个歌词对象数组。
 */
export const parseLrc = (lrcText) => {
  if (!lrcText) return [];
  const lines = lrcText.split("\n");
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, "").trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
};
