// Tremor Raw chartColors [v0.0.0]

export type ColorUtility = "bg" | "stroke" | "fill" | "text"

// TopFarms token palette (Phase 0). One-Green: greens carry the primary series;
// existing semantic tokens cover genuinely-categorical series. Every value is a
// utility generated from an @theme token in src/index.css — no hardcoded colour,
// no second design system. Pass keys via the chart `colors` prop (e.g. ["brand"]).
export const chartColors = {
  brand: {
    bg: "bg-brand",
    stroke: "stroke-brand",
    fill: "fill-brand",
    text: "text-brand",
  },
  brandDeep: {
    bg: "bg-brand-700",
    stroke: "stroke-brand-700",
    fill: "fill-brand-700",
    text: "text-brand-700",
  },
  brandLight: {
    bg: "bg-brand-300",
    stroke: "stroke-brand-300",
    fill: "fill-brand-300",
    text: "text-brand-300",
  },
  info: {
    bg: "bg-info",
    stroke: "stroke-info",
    fill: "fill-info",
    text: "text-info",
  },
  warn: {
    bg: "bg-warn",
    stroke: "stroke-warn",
    fill: "fill-warn",
    text: "text-warn",
  },
  ai: {
    bg: "bg-ai",
    stroke: "stroke-ai",
    fill: "fill-ai",
    text: "text-ai",
  },
  danger: {
    bg: "bg-danger",
    stroke: "stroke-danger",
    fill: "fill-danger",
    text: "text-danger",
  },
  gray: {
    bg: "bg-surface-2",
    stroke: "stroke-border-strong",
    fill: "fill-border-strong",
    text: "text-text-subtle",
  },
  lightGray: {
    bg: "bg-surface-2",
    stroke: "stroke-border",
    fill: "fill-border",
    text: "text-text-subtle",
  },
} as const satisfies {
  [color: string]: {
    [key in ColorUtility]: string
  }
}

export type AvailableChartColorsKeys = keyof typeof chartColors

export const AvailableChartColors: AvailableChartColorsKeys[] = Object.keys(
  chartColors,
) as Array<AvailableChartColorsKeys>

export const constructCategoryColors = (
  categories: string[],
  colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
  const categoryColors = new Map<string, AvailableChartColorsKeys>()
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index % colors.length])
  })
  return categoryColors
}

export const getColorClassName = (
  color: AvailableChartColorsKeys,
  type: ColorUtility,
): string => {
  const fallbackColor = {
    bg: "bg-gray-500",
    stroke: "stroke-gray-500",
    fill: "fill-gray-500",
    text: "text-gray-500",
  }
  return chartColors[color]?.[type] ?? fallbackColor[type]
}

// Tremor Raw getYAxisDomain [v0.0.0]

export const getYAxisDomain = (
  autoMinValue: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
) => {
  const minDomain = autoMinValue ? "auto" : (minValue ?? 0)
  const maxDomain = maxValue ?? "auto"
  return [minDomain, maxDomain]
}

// Tremor Raw hasOnlyOneValueForKey [v0.1.0]

export function hasOnlyOneValueForKey(
  array: any[],
  keyToCheck: string,
): boolean {
  const val: any[] = []

  for (const obj of array) {
    if (Object.prototype.hasOwnProperty.call(obj, keyToCheck)) {
      val.push(obj[keyToCheck])
      if (val.length > 1) {
        return false
      }
    }
  }

  return true
}
