---
source: Recharts GitHub (main branch)
library: recharts
package: recharts
topic: chart-components-api
fetched: 2026-04-24T00:00:00Z
official_docs: https://recharts.github.io/en-US/
---

# Recharts Chart Components API

## LineChart

```tsx
<LineChart 
  width={400} 
  height={400} 
  data={data}
  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
  <Line 
    type="monotone" 
    dataKey="uv" 
    stroke="#ff7300" 
    strokeWidth={2}
    dot={{ r: 4 }}
    activeDot={{ r: 6 }}
  />
  <Line 
    type="monotone" 
    dataKey="pv" 
    stroke="#387908" 
    strokeWidth={2}
  />
</LineChart>
```

## AreaChart

```tsx
<AreaChart width={400} height={400} data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Area 
    type="monotone" 
    dataKey="uv" 
    fill="#ff7300" 
    stroke="#ff7300"
    fillOpacity={0.6}
  />
  <Area 
    type="monotone" 
    dataKey="pv" 
    fill="#387908" 
    stroke="#387908"
    fillOpacity={0.6}
  />
</AreaChart>
```

## BarChart

```tsx
<BarChart width={400} height={400} data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="uv" fill="#ff7300" radius={[4, 4, 0, 0]} />
  <Bar dataKey="pv" fill="#387908" radius={[4, 4, 0, 0]} />
</BarChart>
```

## ComposedChart

```tsx
<ComposedChart width={400} height={400} data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="uv" fill="#ff7300" barSize={20} />
  <Line type="monotone" dataKey="pv" stroke="#387908" />
  <Area type="monotone" dataKey="amt" fill="#38790840" />
</ComposedChart>
```

## ScatterChart

```tsx
<ScatterChart width={400} height={400} data={data}>
  <XAxis dataKey="x" name="X Value" />
  <YAxis dataKey="y" name="Y Value" />
  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
  <Legend />
  <Scatter name="Series A" data={data1} fill="#ff7300">
    <Cell fill="#ff7300" />
  </Scatter>
  <Scatter name="Series B" data={data2} fill="#387908">
    <Cell fill="#387908" />
  </Scatter>
</ScatterChart>
```

## All Charts Share Common Props

All Cartesian charts (LineChart, AreaChart, BarChart, ComposedChart, ScatterChart) use `CartesianChartProps`:

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
    className?: string;
    // Animation
    isAnimationActive?: boolean;
    animationDuration?: number;
    animationEasing?: EasingInput;
    animationBegin?: number;
  };
  ref?: React.Ref<SVGSVGElement>;
}
```

## Data Props

```typescript
// Data format for all charts
const data = [
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
];
```

## Grid Component

```typescript
<CartesianGrid 
  strokeDasharray="3 3"    // dashed grid lines
  stroke="#e5e7eb"         // grid color
  verticalStrokeDasharray="0"  // no vertical lines
/>
```

## Axis Components

```typescript
// XAxis
<XAxis 
  dataKey="name"
  tick={{ fill: '#6b7280', fontSize: 12 }}
  axisLine={{ stroke: '#e5e7eb' }}
  tickLine={{ stroke: '#e5e7eb' }}
  stroke="#6b7280"
  type="category" | "number"
  domain={['auto', 'dataMin', 'dataMax']}
/>

// YAxis
<YAxis 
  tick={{ fill: '#6b7280', fontSize: 12 }}
  axisLine={{ stroke: '#e5e7eb' }}
  tickLine={{ stroke: '#e5e7eb' }}
  stroke="#6b7280"
  type="number"
  domain={[0, 'auto']}
  tickFormatter={(value) => `${value}€`}
/>
```