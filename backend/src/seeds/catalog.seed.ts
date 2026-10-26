import { Genre } from '../models/Genre.model';
import { Category } from '../models/Category.model';
import { User } from '../models/User.model';

const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'Technology',
  'Engineering',
  'Medical',
  'History',
  'Literature',
  'Business',
  'Arts',
];

const CATEGORIES = [
  'Textbook',
  'Reference',
  'Research',
  'General',
  'Periodical',
  'Thesis',
];

export const seedGenresAndCategories = async (): Promise<void> => {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.warn('Admin not found — skipping genre/category seed');
    return;
  }

  for (const name of GENRES) {
    await Genre.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, isActive: true, createdBy: admin._id } },
      { upsert: true, new: true }
    );
  }

  for (const name of CATEGORIES) {
    await Category.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, isActive: true, createdBy: admin._id } },
      { upsert: true, new: true }
    );
  }

  console.log('Genres and categories seeded');
};
