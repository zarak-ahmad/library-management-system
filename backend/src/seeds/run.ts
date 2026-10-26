import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { seedAdmin, seedRoles, seedLibrarian, seedDemoStudent } from './index';
import { seedGenresAndCategories } from './catalog.seed';

dotenv.config();

const run = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await seedRoles();
  await seedAdmin();
  await seedLibrarian();
  await seedDemoStudent();
  await seedGenresAndCategories();

  await mongoose.disconnect();
  console.log('Seeding complete');
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
