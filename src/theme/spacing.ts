export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  slideMargin: number;
  headerGutter: number;
  sectionGap: number;
}

// All values are in inches to match PptxGenJS coordinate space.
export const Spacing: SpacingScale = {
  xs: 0.08,
  sm: 0.16,
  md: 0.32,
  lg: 0.48,
  xl: 0.64,
  xxl: 0.96,
  slideMargin: 0.5,
  headerGutter: 0.1,
  sectionGap: 0.3,
};
