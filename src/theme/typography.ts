export interface TypeScale {
  display: number;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  body: number;
  small: number;
  label: number;
}

export interface TypographyConfig {
  fontFamily: string;
  scale: TypeScale;
  lineSpacing: {
    tight: number;
    normal: number;
    loose: number;
  };
}

export const Typography: TypographyConfig = {
  fontFamily: 'Calibri',

  scale: {
    display: 44,
    h1: 36,
    h2: 28,
    h3: 24,
    h4: 20,
    body: 16,
    small: 14,
    label: 12,
  },

  // PptxGenJS lineSpacingMultiple values
  lineSpacing: {
    tight: 0.9,
    normal: 1.0,
    loose: 1.3,
  },
};
