// 获取 Base64 编码的图片
export function getBase64Image(image) {
  const base64String = image.data.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return `data:${image.format};base64,${window.btoa(base64String)}`;
}