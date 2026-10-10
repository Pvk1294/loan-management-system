import multer from 'multer';
import { SALARY_SLIP } from '../constants/loan';
import { ApiError } from '../utils/ApiError';

const allowedMimeTypes: readonly string[] = SALARY_SLIP.ALLOWED_MIME_TYPES;

/**
 * Salary slip upload: one file in the `file` field, PDF/JPG/PNG, 5 MB at most.
 * The file is held in memory only long enough to be written to GridFS.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SALARY_SLIP.MAX_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, JPG and PNG files are accepted.'));
    }
  },
});

export const salarySlipUpload = upload.single('file');

/**
 * Identifies a file by its leading bytes. The MIME type sent by the browser is
 * only a claim, so the content is checked as well before anything is stored.
 */
export function detectFileType(buffer: Buffer): string | null {
  const startsWith = (...bytes: number[]) => bytes.every((byte, index) => buffer[index] === byte);
  if (startsWith(0x25, 0x50, 0x44, 0x46)) return 'application/pdf'; // %PDF
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  return null;
}
