import { CONTEXT_LENGTH_PRESETS } from "./constants"

// 吸附到最近的预设挡位
export const snapToNearestPreset = (value: number, isDragging = false): number => {
  if (value <= 0) return 0
  if (value >= 2000000) return 2000000
  
  // 找到最接近的预设挡位
  let nearest = CONTEXT_LENGTH_PRESETS[0]
  let minDiff = Math.abs(value - nearest)
  
  for (const preset of CONTEXT_LENGTH_PRESETS) {
    const diff = Math.abs(value - preset)
    if (diff < minDiff) {
      minDiff = diff
      nearest = preset
    }
  }
  
  // 动态阈值：对于小数值使用固定阈值，对于大数值使用百分比阈值
  let threshold: number
  if (nearest <= 32768) { // 32K及以下
    threshold = 500 // 固定500 tokens阈值
  } else if (nearest <= 131072) { // 128K及以下
    threshold = nearest * 0.05 // 5%阈值
  } else {
    threshold = nearest * 0.03 // 3%阈值（对于更大的值）
  }
  
  // 如果是拖动操作，使用更宽松的阈值
  if (isDragging) {
    threshold *= 1.5
  }
  
  if (minDiff <= threshold) {
    return nearest
  }
  
  return value
}
