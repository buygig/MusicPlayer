import { ref } from "vue";

/**
 * 一个用于处理进度条拖拽交互的 Vue 组合式函数。
 *
 * @param {object} options - 拖拽处理器的选项。
 * @param {import("vue").Ref<HTMLElement>} options.progressBar - 指向进度条容器元素的 Ref。
 * @param {import("vue").Ref<HTMLElement>} options.progressElement - 指向进度指示器元素的 Ref。
 * @param {import("vue").Ref<number>} options.pMax - 指向最大值（如歌曲时长）的 Ref。
 * @param {(time: number) => void} options.onDragStart - 拖拽开始时的回调函数。
 * @param {(time: number) => void} options.onDrag - 拖拽过程中的回调函数。
 * @param {() => void} options.onDragEnd - 拖拽结束时的回调函数。
 * @returns {{ startDrag: (event: MouseEvent) => void, isDragging: import("vue").Ref<boolean> }}
 */
export function useDrag(options) {
  const { progressBar, progressElement, pMax, onDragStart, onDrag, onDragEnd } =
    options;

  const isDragging = ref(false);
  let barRect = null;
  let rafId = null;

  function updateProgressFromEvent(event) {
    if (!barRect || !pMax.value) return 0;
    const percentage = Math.max(
      0,
      Math.min(1, (event.clientX - barRect.left) / barRect.width)
    );
    const newTime = percentage * pMax.value;
    return Math.max(0, Math.min(newTime, pMax.value - 0.1));
  }

  function handleDrag(event) {
    if (!isDragging.value) {
      isDragging.value = true;
      if (progressElement.value) {
        progressElement.value.classList.add("dragging");
      }
    }

    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      const newTime = updateProgressFromEvent(event);
      onDrag(newTime);
    });
  }

  function stopDrag() {
    if (rafId) cancelAnimationFrame(rafId);

    if (progressElement.value) {
      progressElement.value.classList.remove("dragging");
    }

    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);
    document.body.style.userSelect = "";

    onDragEnd();
    isDragging.value = false;
  }

  function startDrag(event) {
    event.preventDefault();

    barRect = progressBar.value.getBoundingClientRect();
    const newTime = updateProgressFromEvent(event);

    onDragStart(newTime);

    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", stopDrag);
    document.body.style.userSelect = "";

    isDragging.value = false;
  }

  return {
    startDrag,
    isDragging,
  };
}
