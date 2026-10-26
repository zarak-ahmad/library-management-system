import { Category } from '../models/Category.model';
import { ApiError } from '../utils/ApiError';
import { createAuditLog } from './audit.service';
import { AuthRequest } from '../types/express.d';
import { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator';

const sanitizeCategory = (category: InstanceType<typeof Category>) => ({
  id: category._id.toString(),
  name: category.name,
  description: category.description,
  isActive: category.isActive,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

export const categoryService = {
  async list(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    const categories = await Category.find(filter).sort({ name: 1 });
    return categories.map(sanitizeCategory);
  },

  async getById(id: string) {
    const category = await Category.findById(id);
    if (!category) throw ApiError.notFound('Category not found');
    return sanitizeCategory(category);
  },

  async create(input: CreateCategoryInput, req: AuthRequest) {
    const existing = await Category.findOne({ name: new RegExp(`^${input.name}$`, 'i') });
    if (existing) throw ApiError.conflict('Category already exists');

    const category = await Category.create({
      ...input,
      createdBy: req.user.id,
    });

    await createAuditLog(req, 'category.create', 'Category', category._id.toString());
    return sanitizeCategory(category);
  },

  async update(id: string, input: UpdateCategoryInput, req: AuthRequest) {
    const category = await Category.findById(id);
    if (!category) throw ApiError.notFound('Category not found');

    if (input.name && input.name.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await Category.findOne({ name: new RegExp(`^${input.name}$`, 'i') });
      if (existing) throw ApiError.conflict('Category name already exists');
      category.name = input.name;
    }

    if (input.description !== undefined) category.description = input.description;
    if (input.isActive !== undefined) category.isActive = input.isActive;

    await category.save();
    await createAuditLog(req, 'category.update', 'Category', category._id.toString());
    return sanitizeCategory(category);
  },

  async deactivate(id: string, req: AuthRequest) {
    const category = await Category.findById(id);
    if (!category) throw ApiError.notFound('Category not found');

    category.isActive = false;
    await category.save();

    await createAuditLog(req, 'category.deactivate', 'Category', category._id.toString());
    return { message: 'Category deactivated successfully' };
  },
};
