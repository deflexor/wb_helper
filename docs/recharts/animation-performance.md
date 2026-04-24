---
source: Recharts GitHub (main branch)
library: recharts
package: recharts
topic: animation-performance
fetched: 2026-04-24T00:00:00Z
official_docs: https://recharts.github.io/en-US/
---

# Animation and Performance Tips

## Animation Configuration

### Animation Props Available On

Most chart components support animation props:
- Tooltip
- Legend  
- All chart types (LineChart, AreaChart, BarChart, etc.)
- Axis components
- Data components (Line, Area, Bar, Scatter)

### Animation Props Interface

```typescript
interface AnimationProps {
  isAnimationActive?: boolean;       // default: true
  animationDuration?: number;       // default varies (400-1500ms)
  animationEasing?: EasingInput;
  animationBegin?: number;           // default: 0
}
```

## Easing Functions

```typescript
type EasingInput = 
  | 'ease'           // default
  | 'ease-in' 
  | 'ease-out' 
  | 'ease-in-out'
  | 'linear'
  | 'quad'
  | 'cubic'
  | 'sin'
  | 'exp'
  | 'circle'
  | 'back'
  | 'backIn'
  | 'backOut'
  | 'backInOut'
  | 'elastic'
  | 'bounce';
```

## Disabling Animation

### For Large Datasets

```tsx
// Disable animation for 1000+ data points
<LineChart isAnimationActive={false}>
  <Line dataKey="values" />
</LineChart>

// Disable for all components
<LineChart 
  isAnimationActive={false}
  animationDuration={0}
>
  <Area isAnimationActive={false} animationDuration={0} />
  <Tooltip isAnimationActive={false} animationDuration={0} />
</LineChart>
```

### Per-Component

```tsx
<AreaChart>
  <Area isAnimationActive={false} />           {/* No animation */}
  <Tooltip animationDuration={0} />             {/* Instant tooltip */}
  <Legend isAnimationActive={true} />           {/* Still animates */}
</AreaChart>
```

## Performance Tips

### 1. Use ResizeObserver Debouncing

```tsx
// Throttle resize events to avoid expensive re-renders
<ResponsiveContainer debounce={200}>
  <LineChart data={largeDataset}>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

### 2. Use `useTranslate3d` for GPU Acceleration

```tsx
<Tooltip useTranslate3d={true} />
```

### 3. Simplify SVG Rendering

```tsx
// Instead of complex custom shapes, use simpler alternatives
<Line 
  type="monotone"      // Simpler than 'basis' or 'cardinal'
  strokeWidth={1}      // Thinner lines render faster
  dot={false}          // Disable dots for large datasets
/>
```

### 4. Limit Data Points

```tsx
// Downsample data for better performance
const downsampledData = data.filter((_, i) => i % 3 === 0);

<LineChart data={downsampledData}>
  {/* ... */}
</LineChart>
```

### 5. Use Canvas for Very Large Datasets

Recharts is SVG-based. For 10,000+ points, consider:
- Using a canvas-based library
- Implementing virtual scrolling
- Aggregating data server-side

### 6. Memoize Chart Components

```tsx
import { memo } from 'react';

const MemoizedLineChart = memo(LineChart);
const MemoizedLine = memo(Line);

function ParentComponent() {
  return (
    <MemoizedLineChart data={data}>
      <MemoizedLine dataKey="value" />
    </MemoizedLineChart>
  );
}
```

### 7. Avoid Unnecessary Re-renders

```tsx
// Extract data to prevent unnecessary updates
const chartData = useMemo(() => processData(rawData), [rawData]);

<ResponsiveContainer>
  <LineChart data={chartData}>  {/* Stable reference */}
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

### 8. Optimize Tooltip

```tsx
// Disable tooltip animation for heavy charts
<Tooltip 
  animationDuration={0}
  isAnimationActive={false}
  trigger="click"      // Only show on click
/>

// Or use a lightweight custom tooltip
<Tooltip 
  content={({ active, payload }) => 
    active && payload?.length ? (
      <div className="text-xs">{payload[0].value}</div>
    ) : null
  }
/>
```

## Animation Duration Guidelines

| Use Case | Duration | Easing |
|----------|----------|--------|
| Subtle feedback | 200ms | ease-out |
| Tooltip appear | 300-400ms | ease |
| Chart transitions | 500-800ms | ease-in-out |
| Complex animations | 1000-1500ms | ease |

## CSS-Based Animation (Alternative)

For purely CSS animation, you can disable JS animation and use CSS:

```tsx
<LineChart isAnimationActive={false}>
  <Line 
    dataKey="value"
    // Use CSS animation on SVG elements via className
    className="chart-line"
  />
</LineChart>
```

```css
.chart-line {
  animation: drawLine 1s ease-out forwards;
}

@keyframes drawLine {
  from { stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
}
```

## Memory Management

### Clean Up Large Data

```tsx
// Clear data when component unmounts
useEffect(() => {
  return () => {
    // Cleanup if needed
  };
}, []);
```

### Use Pagination for Time Series

```tsx
const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });

const visibleData = useMemo(() => 
  data.slice(visibleRange.start, visibleRange.end),
  [data, visibleRange]
);

<LineChart data={visibleData}>
  {/* ... */}
</LineChart>
```

## Performance Checklist

1. ☐ Disable animation for datasets > 500 points
2. ☐ Use `debounce` on ResponsiveContainer when resizing
3. ☐ Enable `useTranslate3d` for smooth tooltip transitions
4. ☐ Downsample data client-side or server-side
5. ☐ Memoize chart components with `memo()`
6. ☐ Use explicit dimensions to prevent layout thrashing
7. ☐ Remove unused chart elements (grid, legend if not needed)
8. ☐ Use `trigger="click"` instead of hover for complex tooltips