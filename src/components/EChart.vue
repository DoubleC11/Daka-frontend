<script setup>
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册，避免整包 echarts 进产物
echarts.use([
  BarChart, LineChart, PieChart, RadarChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkLineComponent,
  CanvasRenderer
])

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: [Number, String], default: 240 },
  label: { type: String, default: '数据图表' }
})

const el = ref(null)
const chart = shallowRef(null)
let ro = null
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')

function render() {
  if (!chart.value) return
  chart.value.setOption(
    {
      animation: !reduceMotion?.matches,
      animationDuration: 240,
      animationDurationUpdate: 180,
      ...props.option
    },
    true
  )
}

function onMotionChange() {
  render()
}

onMounted(() => {
  chart.value = echarts.init(el.value)
  render()
  ro = new ResizeObserver(() => chart.value?.resize())
  ro.observe(el.value)
  reduceMotion?.addEventListener?.('change', onMotionChange)
})

watch(() => props.option, render, { deep: true })

onBeforeUnmount(() => {
  ro?.disconnect()
  chart.value?.dispose()
  reduceMotion?.removeEventListener?.('change', onMotionChange)
})
</script>

<template>
  <div ref="el" class="chart" role="img" :aria-label="label"
    :style="{ height: typeof height === 'number' ? height + 'px' : height }" />
</template>

<style scoped>
.chart {
  width: 100%;
}
</style>
