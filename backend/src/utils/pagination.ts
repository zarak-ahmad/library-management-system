export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginationResult {
  skip: number;
  limit: number;
  page: number;
  sort: Record<string, 1 | -1>;
}

export const parsePagination = (query: PaginationOptions): PaginationResult => {
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20), 10)));
  const skip = (page - 1) * limit;

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (query.sort) {
    const sortField = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
    const sortOrder = query.sort.startsWith('-') ? -1 : 1;
    sort = { [sortField]: sortOrder as 1 | -1 };
  }

  return { skip, limit, page, sort };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
