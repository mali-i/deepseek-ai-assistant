<script setup>
import * as d3 from 'd3'
import { ref, onMounted,nextTick, watchEffect, watch, reactive } from 'vue';
import { usePromptStore } from '../store/prompts'

const promptStore = usePromptStore()
const pixel_width = ref(12)
const svg_left_or_right_margin = ref(10)
const svg_top_bottom_margin = ref(10)
const pixel_margin = ref(5) // rect与右边的rect之间的间隔
var rect_count_x = ref(0)
const scrollContainer = ref(null)
const isDragging = ref(false)
const hasInitializedScroll = ref(false)
let startX
let scrollLeft

const syncScrollWithLeftEdge = () => {
    if (!scrollContainer.value || isDragging.value || !hasInitializedScroll.value) {
        return
    }

    const nextMaxScroll = Math.max(scrollContainer.value.scrollWidth - scrollContainer.value.clientWidth, 0)
    scrollContainer.value.scrollLeft = Math.min(Math.max(scrollContainer.value.scrollLeft, 0), nextMaxScroll)
}

const observer = new ResizeObserver(entries =>{
    for(let entry of entries){
        var newWidth = entry.contentRect.width
        const min_margin = 10
        const col_width = pixel_width.value + pixel_margin.value
        
        // Calculate how many columns fit
        const fitCount = Math.floor((newWidth - 2 * min_margin + pixel_margin.value) / col_width)
        const nextRectCount = Math.max(53, fitCount)
        let nextMargin = 10
        
        // We want at least 53 weeks (1 year) to be available for scrolling
        // but if the sidebar is wider than 53 weeks, we show more to fill it.
        if (nextRectCount > fitCount) {
            nextMargin = 10 // Fixed small margin when scrollable
        } else {
            // Center it if it fits within the width
            const used_width = nextRectCount * col_width - pixel_margin.value
            nextMargin = (newWidth - used_width) / 2
        }

        const shouldRedraw = rect_count_x.value !== nextRectCount || svg_left_or_right_margin.value !== nextMargin
        rect_count_x.value = nextRectCount
        svg_left_or_right_margin.value = nextMargin
        
        // If it fits exactly or is smaller than 53, we don't need to center it with large margins
        // because it will be scrollable.
        if (shouldRedraw) {
            draw_svg()
            continue
        }

        syncScrollWithLeftEdge()
    }
})

const startDragging = (e) => {
    isDragging.value = true
    startX = e.pageX - scrollContainer.value.offsetLeft
    scrollLeft = scrollContainer.value.scrollLeft
}

const stopDragging = () => {
    isDragging.value = false
}

const doDragging = (e) => {
    if (!isDragging.value) return
    e.preventDefault()
    const x = e.pageX - scrollContainer.value.offsetLeft
    const walk = (x - startX) * 1.5 // scroll speed
    scrollContainer.value.scrollLeft = scrollLeft - walk
}

onMounted(async ()=>{
    // console.log('这里是onMounted钩子')
    await nextTick() // 等待DOM更新完成
    if (scrollContainer.value) {
        observer.observe(scrollContainer.value)
    }
    draw_svg();
})

const draw_svg = async ()=>{
    await nextTick() // 等待DOM更新完成
    const container = scrollContainer.value
    const previousScrollLeft = container ? container.scrollLeft : 0

    d3.select('#svg_container').selectAll('rect').remove()
    d3.select('#svg_container').selectAll('text').remove()
    
    const month_label_height = 20
    // 日期方块的个数应该是： rect_count_x * 7
    // svg中的日期方块的渲染布局应该是先纵向布局，再横向布局。纵向布局7个日期方块，再横向布局
    // 要从jsonData中读取对应个数的日期方, 从当前日期往前推 rect_count_x * 7 个日期方块
    // 把计算出来的日期方块与svg中的rect进行绑定
    // 从左到右按周向历史日期排列，每列内从上到下由旧到新。
    // 因此今天固定位于最左列的最下方。
    const today = new Date()
    var date_list = []
    for(let col = 0; col < rect_count_x.value; col++){
        for(let row = 0; row < 7; row++){
            const daysAgo = col * 7 + (6 - row)
            const date = new Date(today)
            date.setDate(today.getDate() - daysAgo)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const date_str = `${year}-${month}-${day}`
            // 查找 promptStats 中是否有这个日期的键
            const prompts_num = promptStore.promptStats[date_str]?.num || 0
            date_list.push({"date": date_str, "prompts_num": prompts_num})
        }
    }
    // console.log(date_list)

    const col_width = pixel_width.value + pixel_margin.value
    const total_width = rect_count_x.value * col_width - pixel_margin.value + 2 * svg_left_or_right_margin.value
    d3.select('#svg_container').attr('width', total_width)

    // Add month labels
    const month_labels = []
    let last_month = -1
    let last_year = -1
    for (let col = 0; col < rect_count_x.value; col++) {
        // 使用每列最下方（该列最新）的日期生成月份标签。
        const d = date_list[col * 7 + 6]
        const date = new Date(d.date)
        const month = date.getMonth()
        const year = date.getFullYear()
        
        if (month !== last_month || year !== last_year) {
            // Only add if it's not too close to the previous label (at least 3 columns apart)
            if (month_labels.length === 0 || col - month_labels[month_labels.length-1].col >= 3) {
                month_labels.push({
                    name: date.toLocaleString('en-US', { month: 'short' }),
                    year: year,
                    col: col
                })
                last_month = month
                last_year = year
            }
        }
    }

    // Finalize label names: show year on first, last, and when year changes
    month_labels.forEach((label, idx) => {
        const isFirst = idx === 0
        const isLast = idx === month_labels.length - 1
        const yearChanged = !isFirst && label.year !== month_labels[idx-1].year
        
        if (isFirst || isLast || yearChanged) {
            label.name = `${label.year}/${label.name}`
        }
    })

    d3.select('#svg_container').selectAll('text.month-label')
        .data(month_labels)
        .enter()
        .append('text')
        .attr('class', 'month-label')
        .attr('x', d => svg_left_or_right_margin.value + (pixel_width.value + pixel_margin.value) * d.col)
        .attr('y', svg_top_bottom_margin.value + 10)
        .attr('font-size', '10px')
        .attr('font-family', 'var(--apple-font)')
        .attr('fill', 'var(--text-muted)')
        .text(d => d.name)
    
    d3.select('#svg_container').selectAll('rect').data(date_list)
     .enter().append('rect')
      .attr('width', pixel_width.value)
      .attr('height', pixel_width.value)
      .attr('rx', 3) // 圆角
      .attr('ry', 3)
      .attr('x',(d,i)=>{
        const col = Math.floor(i / 7) // 计算当前rect是第几列
        return svg_left_or_right_margin.value + (pixel_width.value + pixel_margin.value) * (col)    
      })
      .attr('y',(d,i)=>{
        const row = i % 7 // 计算当前rect是第几行
        return svg_top_bottom_margin.value + month_label_height + (pixel_width.value + pixel_margin.value) * (row)    
      })
      .attr('fill', v => {
        if (v.prompts_num == 0) {
            return 'var(--apple-bg-secondary)'  // 使用 CSS 变量适配深色模式
        }

        if (v.prompts_num > 14) {
            return 'var(--apple-blue)'  // 深蓝色
        }
        if(v.prompts_num >9){
            return 'rgba(0, 122, 255, 0.8)'
        }
        if(v.prompts_num >4){
            return 'rgba(0, 122, 255, 0.6)'
        }
        return 'rgba(0, 122, 255, 0.4)'  // 浅蓝色
        })
     .on('click', (e,v)=>handleClick(e,v))
     .style('cursor', 'pointer') // 添加鼠标手势
     .append('title') // 添加悬浮提示
      .text(d => `${d.date}: ${d.prompts_num} prompts`)
    
    // 计算并设置SVG的实际高度
    const svgHeight = svg_top_bottom_margin.value * 2 + month_label_height + (pixel_width.value + pixel_margin.value) * 7 - pixel_margin.value
    d3.select('#svg_container').attr('height', svgHeight)

    // 绘制完成后保持当前滚动位置；仅首次渲染时显示左侧的最新日期。
    nextTick(() => {
        if (!scrollContainer.value || isDragging.value) {
            return
        }

        const nextMaxScroll = Math.max(scrollContainer.value.scrollWidth - scrollContainer.value.clientWidth, 0)

        if (!hasInitializedScroll.value) {
            scrollContainer.value.scrollLeft = 0
            hasInitializedScroll.value = true
            return
        }

        scrollContainer.value.scrollLeft = Math.min(previousScrollLeft, nextMaxScroll)
    })
}

const handleClick = (e,v)=>{
    // console.log(`Clicked on date: ${v.date}, prompts_num: ${v.prompts_num}`)
    // 点击某个日期的rect，触发事件，显示该日期的所有prompts
    promptStore.selectedDate = v.date
}

// 监听 promptStats 的变化
watch(() => promptStore.promptStats, async () => {
    await nextTick() // 等待DOM更新完成
    // console.log('promptStats changed, redrawing svg...')
    draw_svg()
}, { deep: true })

</script>

<template>
    <div id="container" class="w-full overflow-hidden">
        <div 
            ref="scrollContainer"
            class="bg-[var(--background-secondary)] overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
            @mousedown="startDragging"
            @mousemove="doDragging"
            @mouseup="stopDragging"
            @mouseleave="stopDragging"
        >
            <svg id="svg_container" class="h-auto block"></svg>
        </div>
    </div> 
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
