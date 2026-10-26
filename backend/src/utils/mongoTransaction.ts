import mongoose from 'mongoose';

let transactionsSupported: boolean | null = null;

const detectReplicaSet = async (): Promise<boolean> => {
  const db = mongoose.connection.db;
  if (!db) return false;

  try {
    const info = await db.admin().command({ hello: 1 });
    return Boolean(info.setName);
  } catch {
    try {
      const info = await db.admin().command({ isMaster: 1 });
      return Boolean(info.setName);
    } catch {
      return false;
    }
  }
};

export const checkTransactionSupport = async (): Promise<boolean> => {
  if (transactionsSupported !== null) {
    return transactionsSupported;
  }

  transactionsSupported = await detectReplicaSet();

  if (!transactionsSupported) {
    console.warn(
      'MongoDB transactions unavailable (standalone instance). Using non-transactional writes.'
    );
  }

  return transactionsSupported;
};

export const withTransaction = async <T>(
  fn: (session: mongoose.ClientSession | undefined) => Promise<T>
): Promise<T> => {
  const supported = await checkTransactionSupport();

  if (!supported) {
    return fn(undefined);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const saveOptions = (session?: mongoose.ClientSession) =>
  session ? { session } : undefined;

export const createOptions = (session?: mongoose.ClientSession) =>
  session ? { session } : undefined;
