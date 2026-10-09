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
  height: { type: [Number, String], default: 240 }
})

const el = ref(null)
const chart = shallowRef(null)
let ro = null

function render() {
  if (!chart.value) return
  chart.value.setOption(props.option, true)
}

onMounted(() => {
  chart.value = echarts.init(el.value)
  render()
  ro = new ResizeObserver(() => chart.value?.resize())
  ro.observe(el.value)
})

watch(() => props.option, render, { deep: true })

onBeforeUnmount(() => {
  ro?.disconnect()
  chart.value?.dispose()
})
</script>

<template>
  <div ref="el" class="chart" :style="{ height: typeof height === 'number' ? height + 'px' : height }" />
</template>

<style scoped>
.chart {
  width: 100%;
}
</style>
