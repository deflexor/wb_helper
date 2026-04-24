---
source: Recharts GitHub (main branch)
library: recharts
package: recharts
topic: typescript-props
fetched: 2026-04-24T00:00:00Z
official_docs: https://recharts.github.io/en-US/
---

# Recharts TypeScript Props Reference

## Core Chart Props

### CartesianChartProps

```typescript
interface CartesianChartProps<DataPointType = any> {
  chartName: string;
  defaultTooltipEventType: TooltipEventType;
  validateTooltipEventTypes: TooltipEventType[];
  tooltipPayloadSearcher: TooltipSearcher;
  categoricalChartProps: CategoricalChartProps;
  ref?: React.Ref<SVGSVGElement>;
}

interface CategoricalChartProps {
  width?: number | string;
  height?: number | string;
  data?: DataPointType[];
  margin?: Margin;
  title?: string | ReactNode;
  style?: CSSProperties;
  className?: string;
  // Animation
  isAnimationActive?: boolean;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  animationBegin?: AnimationDuration;
}
```

## Margin

```typescript
interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Example
margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
```

## Layout Types

```typescript
type CartesianLayout = 'horizontal' | 'vertical';
type PolarLayout = 'centric' | 'radial';
type LayoutType = CartesianLayout | PolarLayout;
type StackOffsetType = 'sign' | 'expand' | 'none' | 'wiggle' | 'silhouette' | 'positive';
```

## Value Types

```typescript
type ValueType = string | number | Date | Array<string | number | Date>;
type NameType = string | number;
```

## Tooltip Types

```typescript
interface TooltipProps<TValue = ValueType, TName = NameType> {
  active?: boolean;
  allowEscapeViewBox?: { x: boolean; y: boolean };
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  axisId?: AxisId;
  content?: ContentType<TValue, TName>;
  contentStyle?: CSSProperties;
  cursor?: boolean | CursorDefinition;
  filterNull?: boolean;
  isAnimationActive?: boolean;
  offset?: number;
  position?: Coordinate;
  reverseDirection?: boolean;
  separator?: string;
  trigger?: TooltipTrigger;
  useTranslate3d?: boolean;
  viewBox?: ViewBox;
  wrapperStyle?: CSSProperties;
}

interface TooltipContentProps<TValue = ValueType, TName = NameType> extends TooltipProps {
  label?: string | number;
  payload: TooltipPayload;
  coordinate: Coordinate | undefined;
  active: boolean;
  accessibilityLayer: boolean;
  activeIndex?: TooltipIndex;
}
```

## Legend Types

```typescript
interface LegendProps {
  align?: 'left' | 'center' | 'right';
  content?: ContentType;
  height?: number | string;
  iconSize?: number;
  iconType?: 'circle' | 'plainline' | 'square' | 'none';
  layout?: 'horizontal' | 'vertical';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  width?: number | string;
  wrapperStyle?: CSSProperties;
  payloadUniqBy?: UniqueOption<LegendPayload>;
  itemSorter?: LegendItemSorter | null;
  portal?: HTMLElement | null;
  formatter?: (value: any, entry: LegendPayload, index: number) => ReactNode;
}

type LegendItemSorter = 'value' | 'dataKey' | ((item: LegendPayload) => number | string);
```

## Payload Types

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

interface TooltipPayloadEntry {
  value: ValueType;
  name: NameType;
  dataKey: string | number;
  color?: string;
  payload?: any;
}
```

## Coordinate Types

```typescript
interface Coordinate {
  x: number;
  y: number;
  tooltipDimension?: number;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

## Axis Domain

```typescript
type AxisDomain = 
  | 'auto' 
  | 'dataMin' 
  | 'dataMax' 
  | number 
  | [number, number]
  | ((dataMin: number, dataMax: number) => [number, number]);
```

## ResponsiveContainer

```typescript
interface ResponsiveContainerProps {
  aspect?: number;
  width?: string | number;       // default: '100%'
  height?: string | number;     // default: '100%'
  minWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: number;
  initialDimension?: { width: number; height: number };
  children: ReactNode;
  debounce?: number;
  id?: string | number;
  className?: string | number;
  style?: CSSProperties;
  onResize?: (width: number, height: number) => void;
}

type Percent = string;  // e.g., "100%"
```

## Easing Input

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

## Content Type

```typescript
type ContentType<TValue = ValueType, TName = NameType> =
  | ReactElement
  | ((props: TooltipContentProps<TValue, TName>) => ReactNode);
```

## Tooltip Trigger

```typescript
type TooltipTrigger = 'hover' | 'click';
```

## Cell Props (for Bar/Scatter)

```typescript
interface CellProps {
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
}
```

## Line/Area/Bar Props

```typescript
interface DataProps {
  type?: 'basis' | 'basisClosed' | 'basisOpen' | 'linear' | 'linearClosed' | 'natural' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
  dataKey: string | number;
  stroke?: string;
  strokeWidth?: number | string;
  fill?: string;
  fillOpacity?: number | string;
  dot?: boolean | DotProps | ReactElement | ((props: DotProps) => ReactElement);
  activeDot?: boolean | DotProps | ReactElement | ((props: DotProps) => ReactElement);
  strokeDasharray?: string | number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  isAnimationActive?: boolean;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
}
```

## Dot Props

```typescript
interface DotProps {
  cx?: number;
  cy?: number;
  r?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  className?: string;
}
```

## XAxis/YAxis Props

```typescript
interface AxisProps {
  dataKey?: string;
  type?: 'category' | 'number';
  domain?: AxisDomain;
  tick?: boolean | ReactElement | ((props: TickProps) => ReactElement) | CSSProperties;
  tickFormatter?: (value: any, index: number) => string;
  tickCount?: number;
  tickSize?: number;
  tickMargin?: number;
  axisLine?: boolean | ReactElement | CSSProperties;
  tickLine?: boolean | ReactElement | CSSProperties;
  stroke?: string;
  strokeWidth?: number | string;
  orientation?: 'top' | 'bottom' | 'left' | 'right';
  hide?: boolean;
  scale?: 'auto' | 'linear' | 'pow' | 'log' | 'band' | 'point' | 'ordinal';
  allowDecimals?: boolean;
  allowDuplicatedCategory?: boolean;
  interval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd';
  paddingAngle?: number;
  paddingInner?: number;
  paddingOuter?: number;
  minTickGap?: number;
}
```

## CartesianGrid Props

```typescript
interface CartesianGridProps {
  stroke?: string;
  strokeDasharray?: string | number;
  strokeWidth?: number | string;
  vertical?: boolean;
  horizontal?: boolean;
  verticalStroke?: string;
  horizontalStroke?: string;
  verticalStrokeDasharray?: string | number;
  horizontalStrokeDasharray?: string | number;
}
```

## Default Values

| Component | Prop | Default |
|-----------|------|---------|
| Tooltip | animationDuration | 400 |
| Tooltip | animationEasing | 'ease' |
| Tooltip | isAnimationActive | true |
| Tooltip | filterNull | true |
| Tooltip | separator | ': ' |
| Legend | iconSize | 14 |
| Legend | iconType | 'circle' |
| Legend | align | 'center' |
| Legend | layout | 'horizontal' |
| Legend | verticalAlign | 'bottom' |
| Legend | itemSorter | 'value' |
| ResponsiveContainer | width | '100%' |
| ResponsiveContainer | height | '100%' |
| ResponsiveContainer | minWidth | 0 |