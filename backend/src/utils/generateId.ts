import { Model } from 'mongoose';

export const generateSequentialId = async (
  prefix: string,
  model: Model<any>,
  field: string
): Promise<string> => {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;

  const latest = await model
    .findOne({ [field]: new RegExp(`^${fullPrefix}`) })
    .sort({ [field]: -1 })
    .select(field)
    .lean();

  let next = 1;
  const latestDoc = latest as Record<string, string> | null;
  if (latestDoc?.[field]) {
    const num = parseInt(latestDoc[field].split('-').pop() || '0', 10);
    next = num + 1;
  }

  return `${fullPrefix}${String(next).padStart(5, '0')}`;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const daysBetween = (from: Date, to: Date): number => {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};
