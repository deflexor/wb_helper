---
source: Recharts GitHub (main branch)
library: recharts
package: recharts
topic: responsive-container
fetched: 2026-04-24T00:00:00Z
official_docs: https://recharts.github.io/en-US/
---

# ResponsiveContainer Setup

## ResponsiveContainer Props

```typescript
interface ResponsiveContainerProps {
  // Aspect ratio (width / height)
  // If specified, height will be calculated from width
  aspect?: number;
  
  // Width of chart container
  // Can be number (pixels) or percent string
  width?: Percent | number;    // default: '100%'
  
  // Height of chart container  
  // Can be number (pixels) or percent string
  height?: Percent | number;   // default: '100%'
  
  // Minimum dimensions
  minWidth?: string | number;  // default: 0
  minHeight?: string | number;
  
  // Maximum height
  maxHeight?: number;
  
  // Initial dimensions before measurement
  initialDimension?: {         // default: { width: -1, height: -1 }
    width: number;
    height: number;
  };
  
  // Chart content (can contain multiple charts)
  children: ReactNode;
  
  // Debounce resize handler (ms)
  debounce?: number;           // default: 0 (no debounce)
  
  // HTML attributes
  id?: string | number;
  className?: string | number;
  style?: CSSProperties;
  
  // Resize callback
  onResize?: (width: number, height: number) => void;
}

type Percent = string;  // e.g., "100%", "50%"
```

## Basic Usage

```tsx
import { ResponsiveContainer, LineChart } from 'recharts';

function ChartComponent() {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="uv" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## With Aspect Ratio

```tsx
// Height calculated as width / aspect
<ResponsiveContainer aspect={2}>
  <LineChart data={data}>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>

// Aspect of 2 means height = width / 2 (50% height relative to width)
```

## Fixed Height Container

```tsx
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={data}>
    {/* ... */}
  </AreaChart>
</ResponsiveContainer>
```

## Min/Max Dimensions

```tsx
<ResponsiveContainer
  width="100%"
  minWidth={200}
  maxHeight={500}
>
  <BarChart data={data}>
    {/* ... */}
  </BarChart>
</ResponsiveContainer>
```

## Debounced Resize

```tsx
// Useful for expensive re-renders during resize
<ResponsiveContainer debounce={200}>
  <ComposedChart data={data}>
    {/* ... */}
  </ComposedChart>
</ResponsiveContainer>
```

## Resize Callback

```tsx
const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

<ResponsiveContainer
  width="100%"
  height={400}
  onResize={(width, height) => {
    setDimensions({ width, height });
    console.log(`Chart size: ${width}x${height}`);
  }}
>
  <LineChart data={data}>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

## Multiple Charts with Shared Dimensions

```tsx
// All charts in children share the same dimensions
<ResponsiveContainer width="100%" height={400}>
  <ComposedChart>
    <Bar dataKey="uv" />
    <Line dataKey="pv" />
    <Area dataKey="amt" />
  </ComposedChart>
</ResponsiveContainer>
```

## Tailwind CSS Usage

```tsx
// Container with Tailwind styling
<div className="w-full h-80 bg-white rounded-xl shadow-sm p-4">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      <XAxis dataKey="name" />
      <Tooltip />
      <Line type="monotone" dataKey="uv" />
    </LineChart>
  </ResponsiveContainer>
</div>

// Min height with Tailwind
<ResponsiveContainer className="min-h-[200px]">
  <AreaChart data={data}>
    {/* ... */}
  </AreaChart>
</ResponsiveContainer>

// Responsive width using percentage
<ResponsiveContainer width="100%" height={400}>
  {/* Chart fills container width */}
</ResponsiveContainer>
```

## Common Patterns

### Full Width Chart
```tsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart>
    {/* fills available width */}
  </LineChart>
</ResponsiveContainer>
```

### Card with Chart
```tsx
<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
  <h3 className="text-lg font-semibold mb-4">Sales Overview</h3>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={salesData}>
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="sales" fill="#3b82f6" />
    </BarChart>
  </ResponsiveContainer>
</div>
```

### Responsive Grid of Charts
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data1}>
        <Line />
      </LineChart>
    </ResponsiveContainer>
  </div>
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data2}>
        <Area />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</div>
```

## Key Notes

1. **Always wrap charts in ResponsiveContainer** for responsive behavior
2. **Use percentage width** (`"100%"`) for fluid width
3. **Set explicit height** to prevent zero-height rendering
4. **Debounce for expensive charts** to avoid resize jank
5. **Multiple charts share dimensions** when placed in same container