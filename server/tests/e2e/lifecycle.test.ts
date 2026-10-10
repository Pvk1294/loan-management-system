/**
 * End-to-end test of the API against a real MongoDB.
 *
 * It walks one loan through its whole life, exactly as the assignment's demo
 * does (borrower applies → sanction → disbursement → payments → auto-close),
 * and checks along the way that every role is confined to its own module.
 *
 * Needs MongoDB running locally (docker compose up -d). Uses its own database,
 * `lms_test`, which it wipes before it starts.
 */
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/db';
import { Role } from '../../src/constants/roles';
import { BorrowerProfile } from '../../src/models/borrowerProfile.model';
import { Loan } from '../../src/models/loan.model';
import { Payment } from '../../src/models/payment.model';
import { User } from '../../src/models/user.model';
import { hashPassword } from '../../src/modules/auth/auth.service';

const app = createApp();
const api = () => request(app);

const PASSWORD = 'Passw0rd!';
const STAFF_ROLES = [Role.ADMIN, Role.SALES, Role.SANCTION, Role.DISBURSEMENT, Role.COLLECTION] as const;
const MODULE_ENDPOINTS = {
  [Role.SALES]: '/api/sales/leads',
  [Role.SANCTION]: '/api/sanction/loans',
  [Role.DISBURSEMENT]: '/api/disbursement/loans',
  [Role.COLLECTION]: '/api/collection/loans',
} as const;

/** Bearer tokens by role, filled in as accounts log in. */
const tokens: Record<string, string> = {};
const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const pngOfSize = (bytes: number) => Buffer.concat([Buffer.from(PNG_MAGIC), Buffer.alloc(bytes - PNG_MAGIC.length)]);

const today = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
const yearsAgo = (years: number) => `${new Date().getUTCFullYear() - years}-01-15`;

const validProfile = {
  fullName: 'Meera Krishnan',
  pan: 'abcde1234f', // lower case on purpose: the API normalises it
  dateOfBirth: yearsAgo(30),
  monthlySalary: 60_000,
  employmentMode: 'SALARIED',
};

async function signup(name: string, email: string): Promise<string> {
  const res = await api().post('/api/auth/signup').send({ name, email, password: PASSWORD });
  expect(res.status).toBe(201);
  return res.body.data.token as string;
}

let loanId: string;
let slipFileId: string;

beforeAll(async () => {
  await connectDatabase();
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), BorrowerProfile.init(), Loan.init(), Payment.init()]);

  const passwordHash = await hashPassword(PASSWORD);
  await User.create(STAFF_ROLES.map((role) => ({ name: `${role} user`, email: `${role}@test.dev`, passwordHash, role })));
  for (const role of STAFF_ROLES) {
    const res = await api().post('/api/auth/login').send({ email: `${role}@test.dev`, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe(role);
    tokens[role] = res.body.data.token;
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('authentication', () => {
  it('signs a borrower up, never returning the password hash', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({ name: 'Meera Krishnan', email: 'Meera@Example.com', password: PASSWORD, role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: 'Meera Krishnan',
      email: 'meera@example.com',
      role: 'borrower', // a "role" sent by the client is ignored
    });
    tokens.borrower = res.body.data.token;

    const stored = await User.findOne({ email: 'meera@example.com' }).select('+passwordHash');
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(stored?.passwordHash).not.toContain(PASSWORD);
  });

  it('refuses a duplicate email with 409', async () => {
    const res = await api().post('/api/auth/signup').send({ name: 'Meera Two', email: 'meera@example.com', password: PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('refuses a weak password and a bad email with 400 and field-level details', async () => {
    const res = await api().post('/api/auth/signup').send({ name: 'X', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    const wrongPassword = await api().post('/api/auth/login').send({ email: 'meera@example.com', password: 'Wrong1234' });
    const unknownEmail = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('answers 401 without a token, with a malformed token and with a tampered token', async () => {
    const tampered = `${tokens.borrower.slice(0, -3)}abc`;
    for (const header of [undefined, 'Bearer not.a.jwt', `Bearer ${tampered}`, tokens.borrower]) {
      const req = api().get('/api/auth/me');
      const res = await (header ? req.set('Authorization', header) : req);
      expect(res.status).toBe(401);
    }
  });

  it('returns the current user for a valid token', async () => {
    const res = await api().get('/api/auth/me').set(auth('borrower'));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('meera@example.com');
  });
});

describe('borrower journey', () => {
  it('starts at the personal details step', async () => {
    const res = await api().get('/api/borrower/application').set(auth('borrower'));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nextStep: 'PERSONAL_DETAILS', profile: null, activeLoan: null, loans: [] });
    expect(res.body.data.rules.loan).toMatchObject({ MIN_AMOUNT: 50_000, MAX_AMOUNT: 500_000, ANNUAL_INTEREST_RATE: 12 });
  });

  it('BRE rejects with 422 and lists every failed rule', async () => {
    const res = await api().put('/api/borrower/profile').set(auth('borrower')).send({
      fullName: 'Meera Krishnan',
      pan: 'ABC123',
      dateOfBirth: yearsAgo(20),
      monthlySalary: 20_000,
      employmentMode: 'UNEMPLOYED',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BRE_REJECTED');
    expect(res.body.error.details.failures.map((f: { rule: string }) => f.rule)).toEqual([
      'AGE',
      'SALARY',
      'PAN',
      'EMPLOYMENT',
    ]);
  });

  it.each([
    ['is too old', { dateOfBirth: yearsAgo(55) }, 'AGE'],
    ['earns too little', { monthlySalary: 24_999 }, 'SALARY'],
    ['has a malformed PAN', { pan: 'ABCDE12345' }, 'PAN'],
    ['is unemployed', { employmentMode: 'UNEMPLOYED' }, 'EMPLOYMENT'],
  ])('BRE rejects an applicant who %s, and only for that reason', async (_label, override, rule) => {
    const res = await api().put('/api/borrower/profile').set(auth('borrower')).send({ ...validProfile, ...override });
    expect(res.status).toBe(422);
    expect(res.body.error.details.failures.map((f: { rule: string }) => f.rule)).toEqual([rule]);
  });

  it('a rejected borrower stays on step 2 and cannot skip ahead', async () => {
    const overview = await api().get('/api/borrower/application').set(auth('borrower'));
    expect(overview.body.data.nextStep).toBe('PERSONAL_DETAILS');
    expect(overview.body.data.profile.bre.status).toBe('REJECTED');

    const upload = await api()
      .post('/api/borrower/salary-slip')
      .set(auth('borrower'))
      .attach('file', pngOfSize(2048), { filename: 'slip.png', contentType: 'image/png' });
    expect(upload.status).toBe(409);
    expect(upload.body.error.code).toBe('ELIGIBILITY_REQUIRED');

    const apply = await api().post('/api/borrower/loans').set(auth('borrower')).send({ amount: 100_000, tenureDays: 90 });
    expect(apply.status).toBe(422);
    expect(apply.body.error.code).toBe('BRE_REJECTED');
  });

  it('malformed details are a 400, which is different from a BRE rejection', async () => {
    const res = await api()
      .put('/api/borrower/profile')
      .set(auth('borrower'))
      .send({ ...validProfile, dateOfBirth: '2026-02-30', monthlySalary: 'lots' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['dateOfBirth', 'monthlySalary']),
    );
  });

  it('accepts corrected details and moves to the salary slip step', async () => {
    const res = await api().put('/api/borrower/profile').set(auth('borrower')).send(validProfile);
    expect(res.status).toBe(200);
    expect(res.body.data.profile).toMatchObject({ pan: 'ABCDE1234F', age: expect.any(Number), bre: { status: 'PASSED', failures: [] } });

    const overview = await api().get('/api/borrower/application').set(auth('borrower'));
    expect(overview.body.data.nextStep).toBe('SALARY_SLIP');
  });

  it('cannot apply before uploading a salary slip', async () => {
    const res = await api().post('/api/borrower/loans').set(auth('borrower')).send({ amount: 100_000, tenureDays: 90 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SALARY_SLIP_REQUIRED');
  });

  it('refuses a file of the wrong type, even if it is renamed to look like a PDF', async () => {
    const textFile = await api()
      .post('/api/borrower/salary-slip')
      .set(auth('borrower'))
      .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(textFile.status).toBe(415);

    const disguised = await api()
      .post('/api/borrower/salary-slip')
      .set(auth('borrower'))
      .attach('file', Buffer.from('MZ this is really an executable'), { filename: 'slip.pdf', contentType: 'application/pdf' });
    expect(disguised.status).toBe(415);
    expect(disguised.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('refuses a file over 5 MB with 413', async () => {
    const res = await api()
      .post('/api/borrower/salary-slip')
      .set(auth('borrower'))
      .attach('file', pngOfSize(5 * 1024 * 1024 + 1), { filename: 'huge.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('stores a valid salary slip and moves to the loan step', async () => {
    const res = await api()
      .post('/api/borrower/salary-slip')
      .set(auth('borrower'))
      .attach('file', pngOfSize(4096), { filename: 'june slip.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.salarySlip).toMatchObject({ filename: 'june slip.png', mimeType: 'image/png', size: 4096 });
    slipFileId = res.body.data.salarySlip.fileId;

    const overview = await api().get('/api/borrower/application').set(auth('borrower'));
    expect(overview.body.data.nextStep).toBe('LOAN_CONFIG');
  });

  it.each([
    [{ amount: 49_999, tenureDays: 90 }, 'amount'],
    [{ amount: 500_001, tenureDays: 90 }, 'amount'],
    [{ amount: 100_000.5, tenureDays: 90 }, 'amount'],
    [{ amount: 100_000, tenureDays: 29 }, 'tenureDays'],
    [{ amount: 100_000, tenureDays: 366 }, 'tenureDays'],
  ])('refuses an out-of-range loan request %j', async (body, field) => {
    const res = await api().post('/api/borrower/loans').set(auth('borrower')).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe(field);
  });

  it('creates the loan with interest calculated on the server', async () => {
    const res = await api()
      .post('/api/borrower/loans')
      .set(auth('borrower'))
      // The extra fields are an attempt to dictate the numbers; they must be ignored.
      .send({ amount: 100_000, tenureDays: 90, interest: 1, totalRepayment: 1, status: 'DISBURSED' });

    expect(res.status).toBe(201);
    expect(res.body.data.loan).toMatchObject({
      status: 'APPLIED',
      principal: 100_000,
      tenureDays: 90,
      interestRate: 12,
      interest: 2958.9,
      totalRepayment: 102_958.9,
      amountPaid: 0,
      outstanding: 102_958.9,
      applicant: { fullName: 'Meera Krishnan', pan: 'ABCDE1234F' },
    });
    loanId = res.body.data.loan.id;
  });

  it('allows only one loan in progress, even when two requests race', async () => {
    const second = await api().post('/api/borrower/loans').set(auth('borrower')).send({ amount: 60_000, tenureDays: 30 });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ACTIVE_LOAN_EXISTS');

    const racerToken = await signup('Race Tester', 'racer@example.com');
    const racer = { Authorization: `Bearer ${racerToken}` };
    await api().put('/api/borrower/profile').set(racer).send({ ...validProfile, fullName: 'Race Tester' });
    await api().post('/api/borrower/salary-slip').set(racer).attach('file', pngOfSize(1024), { filename: 's.png', contentType: 'image/png' });

    const results = await Promise.all(
      Array.from({ length: 5 }, () => api().post('/api/borrower/loans').set(racer).send({ amount: 75_000, tenureDays: 45 })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409]);
  });

  it('locks the personal details while a loan is in progress', async () => {
    const res = await api().put('/api/borrower/profile').set(auth('borrower')).send({ ...validProfile, monthlySalary: 900_000 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTIVE_LOAN_EXISTS');
  });
});

describe('role-based access control', () => {
  it('lets each executive into their own module only, and Admin into all of them', async () => {
    for (const role of STAFF_ROLES) {
      for (const [moduleRole, endpoint] of Object.entries(MODULE_ENDPOINTS)) {
        const res = await api().get(endpoint).set(auth(role));
        const allowed = role === Role.ADMIN || role === moduleRole;
        expect(res.status, `${role} → ${endpoint}`).toBe(allowed ? 200 : 403);
        if (!allowed) expect(res.body.error.code).toBe('FORBIDDEN');
      }
    }
  });

  it('keeps borrowers out of every dashboard module', async () => {
    for (const endpoint of Object.values(MODULE_ENDPOINTS)) {
      const res = await api().get(endpoint).set(auth('borrower'));
      expect(res.status, `borrower → ${endpoint}`).toBe(403);
    }
  });

  it('keeps staff, Admin included, out of the borrower portal', async () => {
    for (const role of STAFF_ROLES) {
      const res = await api().get('/api/borrower/application').set(auth(role));
      expect(res.status, `${role} → borrower portal`).toBe(403);
    }
  });

  it('answers 401, not 403, when nobody is logged in', async () => {
    for (const endpoint of [...Object.values(MODULE_ENDPOINTS), '/api/borrower/application']) {
      const res = await api().get(endpoint);
      expect(res.status, endpoint).toBe(401);
    }
  });

  it('blocks actions as well as lists: a Sales executive cannot sanction a loan', async () => {
    const res = await api().post(`/api/sanction/loans/${loanId}/approve`).set(auth(Role.SALES));
    expect(res.status).toBe(403);
    expect((await Loan.findById(loanId))?.status).toBe('APPLIED');
  });

  it('a borrower cannot read another borrower’s loan', async () => {
    const strangerToken = await signup('Nosy Stranger', 'stranger@example.com');
    const res = await api().get(`/api/borrower/loans/${loanId}`).set('Authorization', `Bearer ${strangerToken}`);
    expect(res.status).toBe(404);
  });

  it('only the owner and the reviewing teams can open a salary slip', async () => {
    const strangerLogin = await api().post('/api/auth/login').send({ email: 'stranger@example.com', password: PASSWORD });
    const expectations: [string, number][] = [
      [`Bearer ${tokens.borrower}`, 200],
      [`Bearer ${tokens[Role.SANCTION]}`, 200],
      [`Bearer ${tokens[Role.ADMIN]}`, 200],
      [`Bearer ${tokens[Role.COLLECTION]}`, 403],
      [`Bearer ${tokens[Role.SALES]}`, 403],
      [`Bearer ${strangerLogin.body.data.token}`, 403],
    ];
    for (const [header, status] of expectations) {
      const res = await api().get(`/api/files/${slipFileId}`).set('Authorization', header);
      expect(res.status).toBe(status);
    }

    const owner = await api().get(`/api/files/${slipFileId}`).set(auth('borrower'));
    expect(owner.headers['content-type']).toBe('image/png');
    expect(owner.body.length).toBe(4096);
  });
});

describe('sales module', () => {
  it('lists registered borrowers who have not applied, with their stage', async () => {
    await signup('Fresh Lead', 'fresh@example.com');

    const res = await api().get('/api/sales/leads').set(auth(Role.SALES));
    expect(res.status).toBe(200);
    const emails = res.body.data.leads.map((lead: { email: string }) => lead.email);

    expect(emails).toContain('fresh@example.com');
    expect(emails).toContain('stranger@example.com');
    // Borrowers who have applied are no longer leads.
    expect(emails).not.toContain('meera@example.com');
    expect(emails).not.toContain('racer@example.com');

    const fresh = res.body.data.leads.find((lead: { email: string }) => lead.email === 'fresh@example.com');
    expect(fresh).toMatchObject({ stage: 'REGISTERED', profile: null });
    expect(res.body.meta.counts).toMatchObject({ REGISTERED: 2, total: 2 });
  });

  it('tracks a lead through the stages and supports filtering and search', async () => {
    const login = await api().post('/api/auth/login').send({ email: 'fresh@example.com', password: PASSWORD });
    const lead = { Authorization: `Bearer ${login.body.data.token}` };

    await api().put('/api/borrower/profile').set(lead).send({ ...validProfile, fullName: 'Fresh Lead', monthlySalary: 10_000 });
    let res = await api().get('/api/sales/leads?stage=NOT_ELIGIBLE').set(auth(Role.SALES));
    expect(res.body.data.leads).toHaveLength(1);
    expect(res.body.data.leads[0].profile.rejectionReasons[0].rule).toBe('SALARY');

    await api().put('/api/borrower/profile').set(lead).send({ ...validProfile, fullName: 'Fresh Lead' });
    res = await api().get('/api/sales/leads?stage=ELIGIBLE').set(auth(Role.SALES));
    expect(res.body.data.leads.map((l: { email: string }) => l.email)).toEqual(['fresh@example.com']);

    await api().post('/api/borrower/salary-slip').set(lead).attach('file', pngOfSize(1024), { filename: 's.png', contentType: 'image/png' });
    res = await api().get('/api/sales/leads?search=FRESH').set(auth(Role.SALES));
    expect(res.body.data.leads).toHaveLength(1);
    expect(res.body.data.leads[0]).toMatchObject({ stage: 'READY_TO_APPLY', profile: { salarySlipUploaded: true, eligibilityAttempts: 2 } });
  });
});

describe('sanction → disbursement → collection', () => {
  it('shows the applied loan in the Sanction queue', async () => {
    const res = await api().get('/api/sanction/loans').set(auth(Role.SANCTION));
    expect(res.status).toBe(200);
    const loan = res.body.data.loans.find((l: { id: string }) => l.id === loanId);
    expect(loan).toMatchObject({ status: 'APPLIED', borrower: { email: 'meera@example.com' } });
    expect(res.body.meta.counts.queue).toBe(2);
  });

  it('refuses to skip a step: an applied loan cannot be disbursed', async () => {
    const res = await api().post(`/api/disbursement/loans/${loanId}/disburse`).set(auth(Role.DISBURSEMENT));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'INVALID_STATUS_TRANSITION', details: { currentStatus: 'APPLIED' } });
  });

  it('refuses a payment on a loan that has not been disbursed', async () => {
    const res = await api()
      .post(`/api/collection/loans/${loanId}/payments`)
      .set(auth(Role.COLLECTION))
      .send({ utr: 'UTR000000000001', amount: 1000, paidAt: today() });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LOAN_NOT_ACTIVE');
  });

  it('requires a reason to reject', async () => {
    const res = await api().post(`/api/sanction/loans/${loanId}/reject`).set(auth(Role.SANCTION)).send({ reason: '  ' });
    expect(res.status).toBe(400);
    expect((await Loan.findById(loanId))?.status).toBe('APPLIED');
  });

  it('rejects a loan with a reason, which frees the borrower to apply again', async () => {
    const racer = await Loan.findOne({ 'applicant.fullName': 'Race Tester' });
    const res = await api()
      .post(`/api/sanction/loans/${racer!.id}/reject`)
      .set(auth(Role.SANCTION))
      .send({ reason: 'Income documents could not be verified.' });

    expect(res.status).toBe(200);
    expect(res.body.data.loan).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Income documents could not be verified.',
      rejectedAt: expect.any(String),
    });

    const again = await api().post(`/api/sanction/loans/${racer!.id}/approve`).set(auth(Role.SANCTION));
    expect(again.status).toBe(409); // REJECTED is terminal

    const login = await api().post('/api/auth/login').send({ email: 'racer@example.com', password: PASSWORD });
    const reapply = await api()
      .post('/api/borrower/loans')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ amount: 50_000, tenureDays: 30 });
    expect(reapply.status).toBe(201);
  });

  it('sanctions the loan, once', async () => {
    const res = await api().post(`/api/sanction/loans/${loanId}/approve`).set(auth(Role.SANCTION));
    expect(res.status).toBe(200);
    expect(res.body.data.loan).toMatchObject({ status: 'SANCTIONED', sanctionedAt: expect.any(String) });
    expect(res.body.data.loan.statusHistory.at(-1)).toMatchObject({
      status: 'SANCTIONED',
      changedBy: { role: 'sanction' },
    });

    const twice = await api().post(`/api/sanction/loans/${loanId}/approve`).set(auth(Role.SANCTION));
    expect(twice.status).toBe(409);
  });

  it('moves it from the Sanction queue to the Disbursement queue', async () => {
    const sanctionQueue = await api().get('/api/sanction/loans').set(auth(Role.SANCTION));
    expect(sanctionQueue.body.data.loans.map((l: { id: string }) => l.id)).not.toContain(loanId);

    const sanctionHistory = await api().get('/api/sanction/loans?view=history').set(auth(Role.SANCTION));
    expect(sanctionHistory.body.data.loans.map((l: { id: string }) => l.id)).toContain(loanId);

    const disbursementQueue = await api().get('/api/disbursement/loans').set(auth(Role.DISBURSEMENT));
    expect(disbursementQueue.body.data.loans.map((l: { id: string }) => l.id)).toEqual([loanId]);
  });

  it('disburses the loan and sets the due date from the tenure', async () => {
    const res = await api().post(`/api/disbursement/loans/${loanId}/disburse`).set(auth(Role.DISBURSEMENT));
    expect(res.status).toBe(200);

    const { status, disbursedAt, dueDate } = res.body.data.loan;
    expect(status).toBe('DISBURSED');
    const days = (new Date(dueDate).getTime() - new Date(disbursedAt).getTime()) / 86_400_000;
    expect(days).toBe(90);

    const twice = await api().post(`/api/disbursement/loans/${loanId}/disburse`).set(auth(Role.DISBURSEMENT));
    expect(twice.status).toBe(409);
  });

  const pay = (body: Record<string, unknown>, who: string = Role.COLLECTION) =>
    api().post(`/api/collection/loans/${loanId}/payments`).set(auth(who)).send(body);

  it.each([
    ['a UTR that is too short', { utr: 'SHORT1', amount: 1000 }, 400],
    ['a UTR with symbols', { utr: 'UTR-0000-0000-01', amount: 1000 }, 400],
    ['a zero amount', { utr: 'UTR000000000002', amount: 0 }, 400],
    ['a negative amount', { utr: 'UTR000000000002', amount: -500 }, 400],
    ['an amount with three decimals', { utr: 'UTR000000000002', amount: 100.555 }, 400],
    ['a missing date', { utr: 'UTR000000000002', amount: 1000, paidAt: undefined }, 400],
    ['a date in the future', { utr: 'UTR000000000002', amount: 1000, paidAt: '2999-01-01' }, 422],
    ['a date before disbursement', { utr: 'UTR000000000002', amount: 1000, paidAt: '2020-01-01' }, 422],
    ['more than the outstanding balance', { utr: 'UTR000000000002', amount: 102_958.91 }, 422],
  ])('refuses a payment with %s', async (_label, body, status) => {
    const res = await pay({ paidAt: today(), ...body });
    expect(res.status).toBe(status);
    expect((await Loan.findById(loanId))?.amountPaid).toBe(0);
    expect(await Payment.countDocuments({ loan: loanId })).toBe(0);
  });

  it('records a part-payment and reduces the outstanding balance', async () => {
    const res = await pay({ utr: 'hdfcn52026100912345', amount: 40_000, paidAt: today() });
    expect(res.status).toBe(201);
    expect(res.body.data.payment).toMatchObject({ utr: 'HDFCN52026100912345', amount: 40_000, paidAt: today() });
    expect(res.body.data.loan).toMatchObject({ status: 'DISBURSED', amountPaid: 40_000, outstanding: 62_958.9 });
  });

  it('refuses a duplicate UTR, on this loan or any other, in any letter case', async () => {
    const res = await pay({ utr: 'HDFCN52026100912345', amount: 100, paidAt: today() });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_UTR');

    const lowerCase = await pay({ utr: 'hdfcn52026100912345', amount: 100, paidAt: today() });
    expect(lowerCase.status).toBe(409);

    expect((await Loan.findById(loanId))?.amountPaid).toBe(40_000);
  });

  it('cannot be overpaid by two payments recorded at the same moment', async () => {
    // Each payment alone fits within the ₹62,958.90 outstanding; together they do not.
    const results = await Promise.all([
      pay({ utr: 'RACE00000000001', amount: 40_000, paidAt: today() }),
      pay({ utr: 'RACE00000000002', amount: 40_000, paidAt: today() }, Role.ADMIN),
    ]);
    const statuses = results.map((r) => r.status).sort();

    expect(statuses[0]).toBe(201);
    expect([409, 422]).toContain(statuses[1]);

    const loan = await Loan.findById(loanId);
    expect(loan?.amountPaid).toBe(80_000);
    // The ledger and the running total agree: the losing payment left no row behind.
    const ledger = await Payment.find({ loan: loanId });
    expect(ledger.reduce((sum, p) => sum + p.amount, 0)).toBe(80_000);
  });

  it('closes the loan automatically when the last rupee is paid', async () => {
    const res = await pay({ utr: '426518903377', amount: 22_958.9, paidAt: today() });
    expect(res.status).toBe(201);
    expect(res.body.data.loan).toMatchObject({
      status: 'CLOSED',
      amountPaid: 102_958.9,
      outstanding: 0,
      closedAt: expect.any(String),
    });
    expect(res.body.data.loan.statusHistory.map((h: { status: string }) => h.status)).toEqual([
      'APPLIED',
      'SANCTIONED',
      'DISBURSED',
      'CLOSED',
    ]);
  });

  it('accepts nothing more once the loan is closed', async () => {
    const res = await pay({ utr: 'UTR000000000009', amount: 1, paidAt: today() });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LOAN_NOT_ACTIVE');
  });

  it('moves the closed loan to Collection history with its payments', async () => {
    const queue = await api().get('/api/collection/loans').set(auth(Role.COLLECTION));
    expect(queue.body.data.loans.map((l: { id: string }) => l.id)).not.toContain(loanId);

    const history = await api().get('/api/collection/loans?view=history').set(auth(Role.COLLECTION));
    expect(history.body.data.loans.map((l: { id: string }) => l.id)).toContain(loanId);

    const payments = await api().get(`/api/collection/loans/${loanId}/payments`).set(auth(Role.COLLECTION));
    expect(payments.body.data.payments).toHaveLength(3);
    expect(payments.body.data.payments[0].recordedBy.name).toBeTruthy();
  });

  it('shows the borrower their closed loan and lets them start a new application', async () => {
    const detail = await api().get(`/api/borrower/loans/${loanId}`).set(auth('borrower'));
    expect(detail.status).toBe(200);
    expect(detail.body.data.loan.status).toBe('CLOSED');
    expect(detail.body.data.payments).toHaveLength(3);
    // Staff names are not exposed to borrowers.
    expect(detail.body.data.loan.statusHistory[1].changedBy).toBeUndefined();

    const overview = await api().get('/api/borrower/application').set(auth('borrower'));
    expect(overview.body.data).toMatchObject({ nextStep: 'LOAN_CONFIG', activeLoan: null });
    expect(overview.body.data.loans).toHaveLength(1);
  });
});

describe('error handling', () => {
  it('answers unknown routes, bad ids and bad JSON in the same error shape', async () => {
    const unknown = await api().get('/api/nope');
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('NOT_FOUND');

    const badId = await api().post('/api/sanction/loans/not-an-id/approve').set(auth(Role.SANCTION));
    expect(badId.status).toBe(400);

    const missing = await api().post('/api/sanction/loans/64b7f0000000000000000000/approve').set(auth(Role.SANCTION));
    expect(missing.status).toBe(404);

    const badJson = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(badJson.status).toBe(400);
    expect(badJson.body.error.code).toBe('INVALID_JSON');
  });
});
