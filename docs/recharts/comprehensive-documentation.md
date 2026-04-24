---
source: Recharts GitHub (main branch)
library: recharts
package: recharts
topic: charts-overview
fetched: 2026-04-24T00:00:00Z
official_docs: https://recharts.github.io/en-US/
---

# Recharts Documentation Summary

## Overview

Recharts is a **Redefined** chart library built with React and D3. Main principles:
- **Simply** deploy with React components
- **Native** SVG support, lightweight with minimal dependencies  
- **Declarative** components

**Installation:**
```bash
npm install recharts react-is
```

---

## Chart Components

All charts follow the same composition pattern - they are composed of independent child components.

### LineChart

```tsx
<LineChart width={400} height={400} data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <CartesianGrid stroke="#f5f5f5" />
  <Line type="monotone" dataKey="uv" stroke="#ff7300" />
  <Line type="monotone" dataKey="pv" stroke="#387908" />
</LineChart>
```

### AreaChart

```tsx
<AreaChart width={400} height={400} data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Area type="monotone" dataKey="uv" fill="#ff7300" stroke="#ff7300" />
  <Area type="monotone" dataKey="pv" fill="#387908" stroke="#387908" />
</AreaChart>
```

### BarChart

```tsx
<BarChart width={400} height={400} data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="uv" fill="#ff7300" />
  <Bar dataKey="pv" fill="#387908" />
</BarChart>
```

### ComposedChart

```tsx
<ComposedChart width={400} height={400} data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="uv" fill="#ff7300" />
  <Line type="monotone" dataKey="pv" stroke="#387908" />
  <Area type="monotone" dataKey="amt" fill="#38790880" />
</ComposedChart>
```

### ScatterChart

```tsx
<ScatterChart width={400} height={400} data={data}>
  <XAxis dataKey="x" />
  <YAxis dataKey="y" />
  <Tooltip />
  <Legend />
  <Scatter name="A" dataKey="x" fill="#ff7300" />
  <Scatter name="B" dataKey="y" fill="#387908" />
</ScatterChart>
```

---

## TypeScript Types

All chart components accept `CartesianChartProps<DataPointType>` which includes:

### Core Props Interface

```typescript
interface ChartProps {
  width?: number | string;       // Chart width
  height?: number | string;      // Chart height
  data?: DataPointType[];        // Data array
  margin?: Margin;               // { top, right, bottom, left }
  title?: string | ReactNode;
  style?: CSSProperties;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

### Stack Offset Types

```typescript
type StackOffsetType = 'sign' | 'expand' | 'none' | 'wiggle' | 'silhouette' | 'positive';
```

### Layout Types

```typescript
type CartesianLayout = 'horizontal' | 'vertical';
type PolarLayout = 'centric' | 'radial';
type LayoutType = CartesianLayout | PolarLayout;
```

---

## Tooltip Component

### TooltipProps Interface

```typescript
interface TooltipProps<TValue = ValueType, TName = NameType> {
  active?: boolean;
  allowEscapeViewBox?: { x: boolean; y: boolean };
  animationDuration?: number;        // default: 400
  animationEasing?: EasingInput;      // default: 'ease'
  axisId?: AxisId;                   // default: 0
  content?: ContentType<TValue, TName>;
  contentStyle?: CSSProperties;
  cursor?: boolean | CursorDefinition;
  filterNull?: boolean;
  isAnimationActive?: boolean;       // default: true
  offset?: number;
  position?: Coordinate;
  reverseDirection?: boolean;
  separator?: string;
  trigger?: TooltipTrigger;
  useTranslate3d?: boolean;          // default: false
  viewBox?: ViewBox;
  wrapperStyle?: CSSProperties;
}
```

### TooltipContentProps (render props)

```typescript
interface TooltipContentProps<TValue = ValueType, TName = NameType> extends TooltipProps {
  label?: string | number;
  payload: TooltipPayload;
  coordinate: Coordinate | undefined;
  active: boolean;
  accessibilityLayer: boolean;
  activeIndex: TooltipIndex | undefined;
}
```

### Custom Tooltip Example

```tsx
function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
        <p className="font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

<Tooltip content={<CustomTooltip />} />
```

---

## Legend Component

### LegendProps Interface

```typescript
interface LegendProps {
  align?: 'left' | 'center' | 'right';
  content?: ContentType;             // React element or render function
  height?: number | string;
  iconSize?: number;
  iconType?: 'circle' | 'plainline' | 'square' | 'none';
  layout?: 'horizontal' | 'vertical';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  width?: number | string;
  wrapperStyle?: CSSProperties;
  payloadUniqBy?: UniqueOption<LegendPayload>;
  itemSorter?: LegendItemSorter | null;  // default: 'value' (alphabetical)
  portal?: HTMLElement | null;
}
```

### LegendPayload

```typescript
interface LegendPayload {
  id?: string;
  value: string | number;
  color?: string;
  payload?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    stroke?: string;
  };
  dataKey?: string | number;
  type?: string;
}
```

### Custom Legend Example

```tsx
function CustomLegend({ payload }: { payload: LegendPayload[] }) {
  return (
    <div className="flex gap-4 justify-center mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }} 
          />
          <span className="text-sm">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

<Legend content={<CustomLegend />} />
```

---

## ResponsiveContainer

### Props Interface

```typescript
interface ResponsiveContainerProps {
  aspect?: number;                    // width/height ratio
  width?: Percent | number;           // default: '100%'
  height?: Percent | number;          // default: '100%'
  minWidth?: string | number;        // default: 0
  minHeight?: string | number;
  maxHeight?: number;
  initialDimension?: { width: number; height: number };  // default: {width: -1, height: -1}
  children: ReactNode;
  debounce?: number;                  // debounce resize handler (ms)
  id?: string | number;
  className?: string | number;
  style?: CSSProperties;
  onResize?: (width: number, height: number) => void;
}

type Percent = string;  // e.g., "100%", "50%"
```

### Usage with Tailwind

```tsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="uv" stroke="#ff7300" />
  </LineChart>
</ResponsiveContainer>

// Using aspect ratio
<ResponsiveContainer aspect={2} className="min-h-[200px]">
  <AreaChart data={data}>
    <XAxis dataKey="name" />
    <Area dataKey="uv" fill="#ff7300" />
  </AreaChart>
</ResponsiveContainer>
```

---

## Animation Configuration

### Animation Props (available on most components)

```typescript
interface AnimationProps {
  isAnimationActive?: boolean;       // default: true
  animationDuration?: number;        // default varies (usually 400-1500ms)
  animationEasing?: EasingInput;
}
```

### EasingInput Values

```typescript
type EasingInput = 
  | 'ease' 
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

### Performance Tips

1. **Disable animations for large datasets:**
```tsx
<LineChart isAnimationActive={false}>
  {/* For 1000+ data points */}
</LineChart>
```

2. **Use debounce with ResponsiveContainer:**
```tsx
<ResponsiveContainer debounce={200}>
  {/* Resize events throttled */}
</ResponsiveContainer>
```

3. **Enable useTranslate3d for smooth animations:**
```tsx
<Tooltip useTranslate3d={true} />
```

4. **Disable animation on tooltip for heavy charts:**
```tsx
<Tooltip animationDuration={0} isAnimationActive={false} />
```

---

## Custom Styling with Tailwind/CSS

### Chart Container

```tsx
<div className="w-full h-80 bg-white rounded-xl shadow-sm p-4">
  <ResponsiveContainer>
    <LineChart data={data}>
      {/* ... */}
    </LineChart>
  </ResponsiveContainer>
</div>
```

### Axis Styling

```tsx
<XAxis 
  tick={{ fill: '#6b7280', fontSize: 12 }}
  axisLine={{ stroke: '#e5e7eb' }}
  tickLine={{ stroke: '#e5e7eb' }}
  stroke="#6b7280"
/>
```

### Custom Colors with Tailwind

```tsx
<Line 
  type="monotone" 
  dataKey="value" 
  stroke="rgb(251 191 36)"    // amber-400
  strokeWidth={2}
  dot={{ fill: 'rgb(251 191 36)', strokeWidth: 2 }}
/>

<Area 
  fill="rgb(251 191 36 / 0.2)"  // with opacity
  stroke="rgb(251 191 36)"
/>
```

### Grid Styling

```tsx
<CartesianGrid 
  strokeDasharray="3 3"
  stroke="#e5e7eb"
  verticalStrokeDasharray="0"
/>
```

---

## Key Interfaces Summary

### ValueType / NameType

```typescript
type ValueType = string | number | Date | Array<string | number | Date>;
type NameType = string | number;
```

### Payload Entry

```typescript
interface Payload {
  value?: ValueType;
  name?: NameType;
  dataKey?: string | number;
  color?: string;
  fill?: string;
  stroke?: string;
  strokeDasharray?: string | number;
  strokeWidth?: number | string;
  type?: 'line' | 'grid' | 'rect' | 'circle' | 'cross' | 'square' | 'diamond' | 'star' | 'triangle' | 'wye';
}
```

### CartesianChartProps (base for all charts)

```typescript
interface CartesianChartProps<DataPointType = any> {
  chartName: string;
  defaultTooltipEventType: TooltipEventType;
  validateTooltipEventTypes: TooltipEventType[];
  tooltipPayloadSearcher: TooltipSearcher;
  categoricalChartProps: {
    width?: number | string;
    height?: number | string;
    data?: DataPointType[];
    margin?: Margin;
    title?: string | ReactNode;
    style?: CSSProperties;
    // ... many more
  };
  ref?: React.Ref<SVGSVGElement>;
}
```

---

## Official Resources

- Documentation: https://recharts.github.io/en-US/
- Storybook: https://recharts.github.io/en-US/storybook
- GitHub: https://github.com/recharts/recharts
- NPM: https://www.npmjs.com/package/recharts