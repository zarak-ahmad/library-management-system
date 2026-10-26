import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { seedAdmin, seedRoles } from '../src/seeds/index';
import { seedGenresAndCategories } from '../src/seeds/catalog.seed';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  await mongoose.connect(process.env.MONGODB_URI);
  await seedRoles();
  await seedAdmin();
  await seedGenresAndCategories();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  const preserved = new Set(['roles', 'users', 'genres', 'categories']);

  for (const [name, collection] of Object.entries(collections)) {
    if (preserved.has(name)) continue;
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
