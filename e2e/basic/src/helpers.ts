import { kebabize } from "@svebcomponents/utils";

export interface LabelOptions {
  label: string;
}

export const formatLabel = (label: string): string => `Label: ${label}`;

/**
 * Exercises the same declared-dependency import from an ordinary module entry,
 * which is built into the browser output directory under the same contract as
 * the components beside it.
 */
export const slugify = (label: string): string => kebabize(label);
