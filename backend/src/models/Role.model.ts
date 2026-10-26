import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types';

export interface IRole extends Document {
  name: UserRole;
  permissions: string[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['admin', 'librarian', 'student'],
    },
    permissions: [{ type: String, required: true }],
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRole>('Role', roleSchema);
