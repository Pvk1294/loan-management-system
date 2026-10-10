import { type HydratedDocument, Schema, type Types, model } from 'mongoose';

/** One repayment recorded by the Collection team. Rows are never edited. */
export interface IPayment {
  loan: Types.ObjectId;
  /** Bank reference of the transfer. Unique across every payment in the system. */
  utr: string;
  /** Rupees, at most two decimals. */
  amount: number;
  /** The day the borrower paid, as entered by the executive. */
  paidAt: Date;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    loan: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    // The unique index is the real guard against duplicates: two requests
    // carrying the same UTR at the same moment cannot both be inserted.
    utr: { type: String, required: true, unique: true, uppercase: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paidAt: { type: Date, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export type PaymentDocument = HydratedDocument<IPayment>;

export const Payment = model<IPayment>('Payment', paymentSchema);
