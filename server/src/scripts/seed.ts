/**
 * Seeds the database.
 *
 *   npm run seed         one account per role (what the assignment asks for)
 *   npm run seed:demo    the same, plus sample borrowers and loans at every
 *                        stage so each dashboard module has data to show
 *
 * Safe to run any number of times: accounts are matched by email and updated
 * in place, and demo records are only created if they do not exist yet.
 */
import { connectDatabase, disconnectDatabase } from '../config/db';
import { EmploymentMode, LoanStatus } from '../constants/loan';
import { Role } from '../constants/roles';
import { BorrowerProfile } from '../models/borrowerProfile.model';
import { Loan } from '../models/loan.model';
import { Payment } from '../models/payment.model';
import { User, type UserDocument } from '../models/user.model';
import { hashPassword } from '../modules/auth/auth.service';
import * as borrowerService from '../modules/borrower/borrower.service';
import * as collectionService from '../modules/collection/collection.service';
import * as disbursementService from '../modules/disbursement/disbursement.service';
import * as sanctionService from '../modules/sanction/sanction.service';
import { addDays } from '../utils/dates';
import { SEED_ACCOUNTS } from './seedAccounts';

const DEMO_PASSWORD = 'Demo@1234';

async function seedAccounts(): Promise<Map<Role, UserDocument>> {
  const accounts = new Map<Role, UserDocument>();
  for (const { name, email, password, role } of SEED_ACCOUNTS) {
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { name, role, passwordHash: await hashPassword(password) } },
      { upsert: true, returnDocument: 'after' },
    );
    accounts.set(role, user);
  }
  return accounts;
}

/** A small but valid one-page PDF, used as the salary slip for demo borrowers. */
function samplePdf(text: string): Buffer {
  const stream = `BT /F1 14 Tf 40 120 Td (${text.replace(/[()\\]/g, '')}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

function slipFile(fullName: string): Express.Multer.File {
  const buffer = samplePdf(`Sample salary slip for ${fullName} - demo data`);
  return {
    buffer,
    size: buffer.length,
    originalname: `salary-slip-${fullName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    mimetype: 'application/pdf',
  } as Express.Multer.File;
}

interface DemoBorrower {
  name: string;
  email: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: EmploymentMode;
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Moves every date on a loan back by a number of days, so demo loans look like
 * they have been in the system for a while instead of all starting today.
 */
async function backdateLoan(loanId: string, days: number): Promise<void> {
  const loan = await Loan.findById(loanId);
  if (!loan) return;
  const shift = (date?: Date) => (date ? addDays(date, -days) : date);

  loan.appliedAt = addDays(loan.appliedAt, -days);
  loan.sanctionedAt = shift(loan.sanctionedAt);
  loan.rejectedAt = shift(loan.rejectedAt);
  loan.disbursedAt = shift(loan.disbursedAt);
  loan.dueDate = shift(loan.dueDate);
  loan.statusHistory.forEach((change) => {
    change.changedAt = addDays(change.changedAt, -days);
  });
  await loan.save();
}

async function seedDemoData(staff: Map<Role, UserDocument>): Promise<void> {
  const sanctionId = staff.get(Role.SANCTION)!.id;
  const disbursementId = staff.get(Role.DISBURSEMENT)!.id;
  const collectionId = staff.get(Role.COLLECTION)!.id;

  /** Creates a demo borrower, or returns null if they were seeded on an earlier run. */
  const createBorrower = async (name: string, email: string): Promise<string | null> => {
    if (await User.exists({ email })) return null;
    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      role: Role.BORROWER,
    });
    return user.id;
  };

  const submitDetails = (userId: string, borrower: DemoBorrower) =>
    borrowerService.submitProfile(userId, {
      fullName: borrower.name,
      pan: borrower.pan,
      dateOfBirth: new Date(`${borrower.dateOfBirth}T00:00:00.000Z`),
      monthlySalary: borrower.monthlySalary,
      employmentMode: borrower.employmentMode,
    });

  /** Takes a demo borrower all the way to a submitted loan and returns the loan id. */
  const createLoan = async (borrower: DemoBorrower, amount: number, tenureDays: number): Promise<string | null> => {
    const userId = await createBorrower(borrower.name, borrower.email);
    if (!userId) return null;
    await submitDetails(userId, borrower);
    await borrowerService.uploadSalarySlip(userId, slipFile(borrower.name));
    const loan = await borrowerService.applyForLoan(userId, { amount, tenureDays });
    return loan.id;
  };

  // --- Leads for the Sales module: one borrower at each stage, none with a loan ---

  await createBorrower('Riya Sharma', 'riya.sharma@demo.lms.dev');

  const karan: DemoBorrower = {
    name: 'Karan Mehta',
    email: 'karan.mehta@demo.lms.dev',
    pan: 'BKMPM4821K',
    dateOfBirth: '2005-03-14',
    monthlySalary: 18_000,
    employmentMode: EmploymentMode.SALARIED,
  };
  const karanId = await createBorrower(karan.name, karan.email);
  if (karanId) {
    // Too young and under the salary floor: the rule engine rejects, which is the point.
    await submitDetails(karanId, karan).catch(() => undefined);
  }

  const neha: DemoBorrower = {
    name: 'Neha Gupta',
    email: 'neha.gupta@demo.lms.dev',
    pan: 'AFGPG7310N',
    dateOfBirth: '1994-08-22',
    monthlySalary: 62_000,
    employmentMode: EmploymentMode.SALARIED,
  };
  const nehaId = await createBorrower(neha.name, neha.email);
  if (nehaId) await submitDetails(nehaId, neha);

  const arjun: DemoBorrower = {
    name: 'Arjun Nair',
    email: 'arjun.nair@demo.lms.dev',
    pan: 'CNAPN5567A',
    dateOfBirth: '1989-11-05',
    monthlySalary: 95_000,
    employmentMode: EmploymentMode.SELF_EMPLOYED,
  };
  const arjunId = await createBorrower(arjun.name, arjun.email);
  if (arjunId) {
    await submitDetails(arjunId, arjun);
    await borrowerService.uploadSalarySlip(arjunId, slipFile(arjun.name));
  }

  // --- Loans: at least one in every status, for the other three modules ---

  // APPLIED: waiting in the Sanction queue.
  const priyaLoan = await createLoan(
    { name: 'Priya Iyer', email: 'priya.iyer@demo.lms.dev', pan: 'DIYPI2290P', dateOfBirth: '1992-01-17', monthlySalary: 78_000, employmentMode: EmploymentMode.SALARIED },
    150_000,
    120,
  );
  if (priyaLoan) await backdateLoan(priyaLoan, 2);

  const vikramLoan = await createLoan(
    { name: 'Vikram Singh', email: 'vikram.singh@demo.lms.dev', pan: 'ESIPS8834V', dateOfBirth: '1985-06-30', monthlySalary: 140_000, employmentMode: EmploymentMode.SELF_EMPLOYED },
    300_000,
    240,
  );
  if (vikramLoan) await backdateLoan(vikramLoan, 1);

  // REJECTED by Sanction.
  const mohitLoan = await createLoan(
    { name: 'Mohit Jain', email: 'mohit.jain@demo.lms.dev', pan: 'FJAPJ6672M', dateOfBirth: '1998-09-09', monthlySalary: 27_000, employmentMode: EmploymentMode.SALARIED },
    450_000,
    365,
  );
  if (mohitLoan) {
    await sanctionService.rejectLoan(
      mohitLoan,
      sanctionId,
      'Requested amount is too high for the declared monthly income.',
    );
    await backdateLoan(mohitLoan, 6);
  }

  // SANCTIONED: waiting in the Disbursement queue.
  const snehaLoan = await createLoan(
    { name: 'Sneha Reddy', email: 'sneha.reddy@demo.lms.dev', pan: 'GREPR1458S', dateOfBirth: '1990-12-02', monthlySalary: 110_000, employmentMode: EmploymentMode.SALARIED },
    200_000,
    180,
  );
  if (snehaLoan) {
    await sanctionService.approveLoan(snehaLoan, sanctionId);
    await backdateLoan(snehaLoan, 3);
  }

  // DISBURSED with one part-payment: active in Collection.
  const rahulLoan = await createLoan(
    { name: 'Rahul Verma', email: 'rahul.verma@demo.lms.dev', pan: 'HVEPV9043R', dateOfBirth: '1987-04-25', monthlySalary: 88_000, employmentMode: EmploymentMode.SALARIED },
    100_000,
    90,
  );
  if (rahulLoan) {
    await sanctionService.approveLoan(rahulLoan, sanctionId);
    await disbursementService.disburseLoan(rahulLoan, disbursementId);
    await backdateLoan(rahulLoan, 20);
    await collectionService.recordPayment(
      rahulLoan,
      { utr: 'HDFCN52026091800421', amount: 40_000, paidAt: new Date(`${isoDate(addDays(new Date(), -5))}T00:00:00.000Z`) },
      collectionId,
    );
  }

  // CLOSED: repaid in full across two payments.
  const ananyaLoan = await createLoan(
    { name: 'Ananya Das', email: 'ananya.das@demo.lms.dev', pan: 'JDAPD3316A', dateOfBirth: '1993-07-11', monthlySalary: 54_000, employmentMode: EmploymentMode.SALARIED },
    50_000,
    30,
  );
  if (ananyaLoan) {
    await sanctionService.approveLoan(ananyaLoan, sanctionId);
    await disbursementService.disburseLoan(ananyaLoan, disbursementId);
    await backdateLoan(ananyaLoan, 35);
    const { totalRepayment } = (await Loan.findById(ananyaLoan))!;
    const day = (daysAgo: number) => new Date(`${isoDate(addDays(new Date(), -daysAgo))}T00:00:00.000Z`);
    await collectionService.recordPayment(
      ananyaLoan,
      { utr: 'ICICN22026090500977', amount: 25_000, paidAt: day(18) },
      collectionId,
    );
    await collectionService.recordPayment(
      ananyaLoan,
      { utr: '426518903377', amount: Math.round((totalRepayment - 25_000) * 100) / 100, paidAt: day(6) },
      collectionId,
    );
  }
}

async function main(): Promise<void> {
  const withDemoData = process.argv.includes('--demo');

  await connectDatabase();
  // Make sure the unique indexes exist before anything is inserted.
  await Promise.all([User.init(), BorrowerProfile.init(), Loan.init(), Payment.init()]);

  const staff = await seedAccounts();
  console.log('\nSeeded one account per role:\n');
  console.table(SEED_ACCOUNTS.map(({ role, email, password }) => ({ role, email, password })));

  if (withDemoData) {
    await seedDemoData(staff);
    const [borrowers, loans, payments] = await Promise.all([
      User.countDocuments({ role: Role.BORROWER }),
      Loan.countDocuments(),
      Payment.countDocuments(),
    ]);
    const byStatus = await Promise.all(
      Object.values(LoanStatus).map(async (status) => `${status}: ${await Loan.countDocuments({ status })}`),
    );
    console.log(`Demo data ready: ${borrowers} borrowers, ${loans} loans (${byStatus.join(', ')}), ${payments} payments.`);
    console.log(`Demo borrowers log in with their email and the password ${DEMO_PASSWORD}.\n`);
  }

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('Seeding failed:', err);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
