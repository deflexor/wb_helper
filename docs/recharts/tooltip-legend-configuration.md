---
source: Recharts GitHub (main branch)
library: recharts
package: recharts
topic: tooltip-legend-configuration
fetched: 2026-04-24T00:00:00Z
official_docs: https://recharts.github.io/en-US/
---

# Tooltip and Legend Configuration

## Tooltip Component

### TooltipProps Interface

```typescript
interface TooltipProps<TValue = ValueType, TName = NameType> {
  // Visibility
  active?: boolean;
  
  // Positioning
  allowEscapeViewBox?: { x: boolean; y: boolean };
  offset?: number;
  position?: Coordinate;
  reverseDirection?: boolean;
  
  // Animation
  animationDuration?: number;    // default: 400
  animationEasing?: EasingInput; // default: 'ease'
  isAnimationActive?: boolean;   // default: true
  
  // Content
  content?: ContentType<TValue, TName>;
  contentStyle?: CSSProperties;
  cursor?: boolean | CursorDefinition;
  filterNull?: boolean;          // default: true
  separator?: string;           // default: ': '
  
  // Layout
  trigger?: TooltipTrigger;
  useTranslate3d?: boolean;     // default: false
  viewBox?: ViewBox;
  wrapperStyle?: CSSProperties;
  
  // Sync
  axisId?: AxisId;              // default: 0
}
```

### TooltipContentProps (render function props)

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

### Custom Tooltip Examples

**Basic Custom Tooltip:**
```tsx
function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-900">{label}</p>
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

**Rich Tooltip with Formatting:**
```tsx
function RichTooltip({ active, payload, label }: TooltipContentProps) {
  if (active && payload && payload.length) {
    return (
      <div className="p-4 bg-slate-900 text-white rounded-lg shadow-xl">
        <p className="text-lg font-bold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }} 
            />
            <span className="text-sm">{entry.name}:</span>
            <span className="font-mono font-semibold">
              {typeof entry.value === 'number' 
                ? entry.value.toLocaleString() 
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
```

### Tooltip Trigger Types

```typescript
type TooltipTrigger = 'hover' | 'click';

// Usage
<Tooltip trigger="click" />
```

---

## Legend Component

### LegendProps Interface

```typescript
interface LegendProps {
  // Layout
  align?: 'left' | 'center' | 'right';
  layout?: 'horizontal' | 'vertical';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  
  // Sizing
  width?: number | string;
  height?: number | string;
  iconSize?: number;         // default: 14
  iconType?: 'circle' | 'plainline' | 'square' | 'none';
  
  // Content
  content?: ContentType;
  formatter?: (value: any, entry: LegendPayload, index: number) => ReactNode;
  
  // Styling
  wrapperStyle?: CSSProperties;
  
  // Sorting
  itemSorter?: LegendItemSorter | null;  // default: 'value'
  
  // Portal
  portal?: HTMLElement | null;
  
  // Functionality
  payloadUniqBy?: UniqueOption<LegendPayload>;
  onBBoxUpdate?: (box: ElementOffset | null) => void;
}

type LegendItemSorter = 'value' | 'dataKey' | ((item: LegendPayload) => number | string);
```

### LegendPayload Structure

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

### Custom Legend Examples

**Horizontal Legend:**
```tsx
function CustomLegend({ payload }: { payload: LegendPayload[] }) {
  return (
    <div className="flex flex-wrap gap-4 justify-center items-center mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span 
            className="w-4 h-4 rounded-sm" 
            style={{ backgroundColor: entry.color }} 
          />
          <span className="text-sm text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

<Legend 
  layout="horizontal"
  verticalAlign="bottom"
  content={<CustomLegend />}
/>
```

**Vertical Legend with Custom Icons:**
```tsx
function VerticalLegend({ payload }: { payload: LegendPayload[] }) {
  return (
    <div className="flex flex-col gap-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-3 p-2">
          <div 
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: entry.color }} 
          />
          <span className="text-sm font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

<Legend 
  layout="vertical"
  align="right"
  verticalAlign="middle"
  width={150}
  content={<VerticalLegend />}
/>
```

**Styled with Tailwind:**
```tsx
<Legend 
  wrapperStyle={{ 
    padding: '12px',
    backgroundColor: 'rgb(248 250 252)',
    borderRadius: '8px',
    border: '1px solid rgb(226 232 240)'
  }}
/>
```

---

## Combined Tooltip and Legend Usage

```tsx
<LineChart width={600} height={300} data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  
  <Tooltip 
    contentStyle={{ 
      backgroundColor: '#1e293b',
      border: 'none',
      borderRadius: '8px',
      color: 'white'
    }}
    formatter={(value) => [value, 'Value']}
    labelStyle={{ color: '#94a3b8' }}
  />
  
  <Legend 
    layout="horizontal"
    verticalAlign="bottom"
    iconType="circle"
    iconSize={10}
  />
  
  <Line type="monotone" dataKey="uv" stroke="#f59e0b" />
  <Line type="monotone" dataKey="pv" stroke="#10b981" />
</LineChart>
```