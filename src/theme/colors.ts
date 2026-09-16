export interface BaseColors {
  // Backgrounds
  backgroundDark: string;
  backgroundMid: string;
  backgroundLight: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDark: string;

  // Status
  healthy: string;
  attention: string;
  blocked: string;
  complete: string;
  upcoming: string;

  // Base accent — product themes layer their own accent on top
  accent: string;
}

// All color values are 6-digit hex strings without a leading '#',
// matching PptxGenJS's HexColor format.
export const Colors: BaseColors = {
  backgroundDark: '1F2937',
  backgroundMid: '374151',
  backgroundLight: 'F9FAFB',

  textPrimary: 'FFFFFF',
  textSecondary: 'D1D5DB',
  textMuted: '9CA3AF',
  textDark: '111827',

  healthy: '10B981',
  attention: 'F59E0B',
  blocked: 'EF4444',
  complete: '6B7280',
  upcoming: '3B82F6',

  accent: '6366F1',
};
