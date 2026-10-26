import { parsePagination, buildPaginationMeta } from '../../src/utils/pagination';

describe('pagination utils', () => {
  it('parses default pagination values', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.sort).toEqual({ createdAt: -1 });
  });

  it('parses custom page and limit', () => {
    const result = parsePagination({ page: 3, limit: 10 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(20);
  });

  it('caps limit at 100', () => {
    const result = parsePagination({ limit: 500 });
    expect(result.limit).toBe(100);
  });

  it('parses descending sort prefix', () => {
    const result = parsePagination({ sort: '-title' });
    expect(result.sort).toEqual({ title: -1 });
  });

  it('builds pagination metadata', () => {
    const meta = buildPaginationMeta(45, 2, 20);
    expect(meta).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });
});
