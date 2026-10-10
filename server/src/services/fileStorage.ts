import mongoose, { type Types } from 'mongoose';

/**
 * Salary slips are stored in MongoDB GridFS instead of on the server's disk.
 * Free hosting tiers wipe the local disk on every restart, which would turn
 * every uploaded slip into a broken link; GridFS keeps the file next to the
 * application data with no extra service to configure.
 */

const BUCKET_NAME = 'salarySlips';

export interface StoredFileMetadata {
  /** The borrower who uploaded the file. Used for access control on download. */
  owner: Types.ObjectId;
  contentType: string;
}

function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database is not connected.');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export function saveFile(
  buffer: Buffer,
  filename: string,
  metadata: StoredFileMetadata,
): Promise<Types.ObjectId> {
  return new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(filename, { metadata });
    upload.once('error', reject);
    upload.once('finish', () => resolve(upload.id as Types.ObjectId));
    upload.end(buffer);
  });
}

export async function findFile(fileId: Types.ObjectId | string) {
  const id = new mongoose.Types.ObjectId(fileId);
  const file = await bucket().find({ _id: id }).limit(1).next();
  if (!file) return null;
  return {
    id,
    filename: file.filename,
    length: file.length,
    metadata: file.metadata as unknown as StoredFileMetadata,
  };
}

export function openDownloadStream(fileId: Types.ObjectId) {
  return bucket().openDownloadStream(fileId);
}

export async function deleteFile(fileId: Types.ObjectId): Promise<void> {
  try {
    await bucket().delete(fileId);
  } catch {
    // The file is already gone, which is the outcome we wanted.
  }
}
