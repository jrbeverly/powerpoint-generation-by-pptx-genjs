export interface HeaderLayout {
  height: number;
  primaryIconX: number;
  primaryIconY: number;
  primaryIconSize: number;
  titleX: number;
  titleY: number;
  /** Height of the title text block, derived from height and titleY. */
  titleHeight: number;
  /** X of the rightmost state icon; the right zone extends to stateRight + stateIconSize. */
  stateRight: number;
  stateIconY: number;
  stateIconSize: number;
  /** Product logo lockup size in the right zone (logos are 160×40 SVGs, 4:1). */
  productLogoW: number;
  productLogoH: number;
  /** Horizontal gap between the product logo and the state icon. */
  productLogoGap: number;
}

export interface ContentLayout {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SlideLayout {
  slide: { width: number; height: number };
  header: HeaderLayout;
  content: ContentLayout;
}

// content.top is derived from header.height so changing HEADER_HEIGHT
// automatically shifts the content region — no magic number to maintain.
const HEADER_HEIGHT = 1.0;
const HEADER_BOTTOM_PADDING = 0.35;
const TITLE_Y = 0.3;
// Product logos are 160×40 SVG lockups (4:1 aspect ratio).
const PRODUCT_LOGO_HEIGHT = 0.4;
const PRODUCT_LOGO_WIDTH = PRODUCT_LOGO_HEIGHT * 4;
// Horizontal gap between the product logo and the rightmost state icon.
const PRODUCT_LOGO_GAP = 0.16;

export const Layout: SlideLayout = {
  slide: { width: 13.333, height: 7.5 },

  header: {
    height: HEADER_HEIGHT,
    primaryIconX: 0.5,
    primaryIconY: 0.28,
    primaryIconSize: 0.45,
    titleX: 1.15,
    titleY: TITLE_Y,
    titleHeight: HEADER_HEIGHT - TITLE_Y * 2,
    stateRight: 12.75,
    stateIconY: 0.28,
    stateIconSize: 0.45,
    productLogoW: PRODUCT_LOGO_WIDTH,
    productLogoH: PRODUCT_LOGO_HEIGHT,
    productLogoGap: PRODUCT_LOGO_GAP,
  },

  content: {
    left: 0.6,
    right: 12.73,
    top: HEADER_HEIGHT + HEADER_BOTTOM_PADDING,
    bottom: 6.8,
  },
};
