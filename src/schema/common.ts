import { z } from 'zod';

/**
 * Trend direction of a metric compared to the prior sprint (VISION §5, §17).
 *
 * The JSON only states the semantic direction; how a trend is visualized
 * (arrow glyphs, deltas) belongs to the renderer.
 */
export const TREND_VALUES = ['up', 'down', 'flat'] as const;
export const trendSchema = z.enum(TREND_VALUES);
export type Trend = z.infer<typeof trendSchema>;

/**
 * Status vocabulary shared by metrics and notice items, mirroring the
 * status-icon set of the asset library (VISION §8): healthy, attention,
 * blocked, complete, upcoming.
 */
export const STATUS_VALUES = ['healthy', 'attention', 'blocked', 'complete', 'upcoming'] as const;
export const statusSchema = z.enum(STATUS_VALUES);
export type Status = z.infer<typeof statusSchema>;

/**
 * Status of a project / initiative (VISION §18, §37). "on-track" is the value
 * shown in the VISION §37 example; the remaining values are its natural
 * counterparts.
 */
export const PROJECT_STATUS_VALUES = ['on-track', 'at-risk', 'blocked', 'complete'] as const;
export const projectStatusSchema = z.enum(PROJECT_STATUS_VALUES);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

/**
 * Reference to a product in the product catalog by id (VISION §9, §37).
 *
 * The schema carries the id only. Product visual identity (logo, icon,
 * accent) is resolved by the renderer from the catalog and never appears in
 * the JSON.
 */
export const productIdSchema = z.string().min(1);
export type ProductId = z.infer<typeof productIdSchema>;

/**
 * Reference to a catalog icon by id (VISION §8, §39).
 *
 * Icons are a semantic vocabulary: the JSON names the icon and the renderer
 * resolves it. No coordinates, sizes, or colors can be expressed here.
 */
export const iconIdSchema = z.string().min(1);
export type IconId = z.infer<typeof iconIdSchema>;

/**
 * A short supporting bullet. Bullets carry what the presentation says;
 * typography and placement belong to the renderer (VISION §5).
 */
export const bulletSchema = z.string().min(1);
export type Bullet = z.infer<typeof bulletSchema>;
