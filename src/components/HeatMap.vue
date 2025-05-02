<script setup>
import * as d3 from 'd3'
import { onMounted, ref, watch, nextTick } from 'vue'
import { usePromptStore } from '../store/prompts'
var svgWidth = ref(220)
var svgHeight = ref(150)
var svgMargin = ref(30)
var weekBoxWidth = ref(0)
var monthBoxHeight = ref(20)
const promptStore = usePromptStore()

// 将绘制热力图的逻辑封装成函数
const drawHeatmap = async () => {
    await nextTick()
    
    // 清除现有的热力图
    const heatmap = d3.select('.heatmap')
    heatmap.selectAll('*').remove()
    
    heatmap.attr('width', svgWidth.value)
    heatmap.attr('height', svgHeight.value)

    var dataset = generateData(3)

    var monthScale = d3.scaleLinear()
     .domain([0, dataset.months.length])
     .range([0, svgWidth.value - weekBoxWidth.value - svgMargin.value +10])

    const monthBox = heatmap.append('g')
     .attr('transform', 'translate('+(svgMargin.value+weekBoxWidth.value)+', '+svgMargin.value+')')

    monthBox.selectAll('text')
     .data(dataset.months).enter()
     .append('text')
     .text(v=>{return v})
     .attr('x', (v,i)=>{return monthScale(i)})
     .attr('fill', '#999')
     .attr('font-size', '12px')
     .attr('font-family', 'sans-serif')

    // 绘制日期方块
    const cellBox = heatmap.append('g').attr(
        'transform',
        'translate('+(svgMargin.value+weekBoxWidth.value)+', '+(svgMargin.value+10)+')')

    // 设置方块间距
    const cellMargin = ref(3)
    // 计算方块大小
    const cellHeight = (svgHeight.value-svgMargin.value-monthBoxHeight.value-cellMargin.value*6-10)/7

    const cellWidth = (svgWidth.value - weekBoxWidth.value - svgMargin.value - 10 - cellMargin.value*(dataset.days.length/7 - 1))/(dataset.days.length/7)
    
    const cellSize = Math.min(cellWidth, cellHeight)
    // 方块列计数器
    var cellCol = 0
    var cell = cellBox.selectAll('rect').data(dataset.days).enter()
    .append('rect')
    .attr('width', cellSize)
    .attr('height', cellSize)
    .attr('rx', 3)
    .attr('fill', v => {
        if (v.total == undefined) {
            return '#EFEFEF'  // 表示无数据
        }

        if (v.total > 14) {
            return '#2C82C9'  // 深蓝色，表示多条数据
        }
        if(v.total >9){
            return '#4A90E2'
        }
        if(v.total >4){
            return '#7CB9E8'
        }

        return '#A7C7E7'  // 浅蓝色，表示一条数据
    })
    .attr('x', (v, i) => {
        if (i%7 == 0) {
            cellCol++
        }

        var x = (cellCol-1)*cellSize

        return cellCol > 1 ? x+cellMargin.value*(cellCol-1) : x
    })
    .attr('y', (v, i) => {
        var y = i%7

        return y>0 ? y*cellSize+cellMargin.value*y : y*cellSize
    })
    .on('click', (e,v)=>handleClick(e,v))

    // 日期方块添加鼠标移入时的数据提示
    cell.append('title').text(v => {
        let message = 'None'
        if (v.total) {
            message = v.total+" prompting questions."
        }
        return v.date + "\n" + message
    })
}

// 监听 promptStats 的变化
watch(() => promptStore.promptStats, async () => {
    console.log('promptStats changed, redrawing heatmap')
    await drawHeatmap()
}, { deep: true })

onMounted(async () => {
    console.log('mounted')
    await drawHeatmap()
})

const handleClick = (e,v)=>{
    console.log('-----------')
    console.log(e)
    console.log(v)
    console.log('点击了日期:', v.date)
    promptStore.selectedDate = v.date
    console.log('promptStore.selectedDate', promptStore.selectedDate)
}

const generateData = (forwardMonth, options={}) => {
    const data = promptStore.promptStats
    var fillData = {}
    for(const key in data){
        fillData[key] = data[key].num
    }
    const config = Object.assign({},{
        endDate: null,
        fill:fillData,
    }, options)

    const months = []
    const days = []

    // 计算需要填充的日期
    for (let i=forwardMonth; i>0; i--) {
        let referDate = config.endDate
            ? new Date(config.endDate)
            : new Date()

        referDate.setMonth(referDate.getMonth()-i+2)
        referDate.setDate(0)

        let month = referDate.getMonth()+1
        month = month < 10 ? '0'+month : month

        for (let d=1; d<=referDate.getDate(); d++) {
            let day = d < 10 ? '0'+d : d
            let data = {
                date: referDate.getFullYear()+'-'+month+'-'+day,
            }

            if (config.fill.hasOwnProperty(data.date)) {
                data.total = config.fill[data.date]
            }

            days.push(data)
        }

        months.push(referDate.getFullYear()+'-'+month)
    }

    // 确保第一个日期是从星期一开始
    // 不是星期一就向前追加相应的天数
    let firstDate = days[0].date

    let d = new Date(firstDate)
    let day = d.getDay()
    if (day == 0) {
        day = 7
    }

    for (let i=1; i<day; i++) {
        let d = new Date(firstDate)
        d.setDate(d.getDate()-i)

        let v = [d.getFullYear(), d.getMonth()+1, d.getDate()]

        if (v[1] < 10) {
            v[1] = '0'+v[1];
        }

        if (v[2] < 10) {
            v[2] = '0'+v[2];
        }

        days.unshift({date: v.join('-')})
    }

    return {days: days, months: months}


}
</script>

<template>
    <svg ref="heatmap" class="heatmap"></svg>
</template>

<style scoped>
.heatmap {
    width:100%;
}
</style>