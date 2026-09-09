import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, cleanupUsers, registerUser, uniqueEmail } from './helpers.js';
import { prisma } from '../src/config/prisma.js';

const createdUsers: string[] = [];

describe('Authentication', () => {
  afterAll(() => cleanupUsers(createdUsers));

  it('registers a new student and returns a token', async () => {
    const email = uniqueEmail();
    const res = await request(app).post('/api/auth/register').send({ name: 'Asha', email, password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTypeOf('string');
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.password).toBeUndefined();
    createdUsers.push(res.body.data.user.id);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored?.password).not.toBe('secret123'); // hashed, never plain text
  });

  it('rejects invalid registration input', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('rejects duplicate emails', async () => {
    const user = await registerUser();
    createdUsers.push(user.id);
    const res = await request(app).post('/api/auth/register').send({ name: 'Dup', email: user.email, password: 'secret123' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const user = await registerUser();
    createdUsers.push(user.id);
    const ok = await request(app).post('/api/auth/login').send({ email: user.email, password: 'secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.token).toBeTypeOf('string');

    const bad = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong-pass' });
    expect(bad.status).toBe(401);
    expect(bad.body.message).toBe('Invalid email or password');
  });

  it('protects routes and returns the current user with a valid token', async () => {
    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const badToken = await request(app).get('/api/auth/me').set(auth('invalid.token.value'));
    expect(badToken.status).toBe(401);

    const user = await registerUser('Ravi');
    createdUsers.push(user.id);
    const me = await request(app).get('/api/auth/me').set(auth(user.token));
    expect(me.status).toBe(200);
    expect(me.body.data.name).toBe('Ravi');
  });
});

describe('Subjects, units, topics and progress', () => {
  let token = '';
  let userId = '';

  beforeAll(async () => {
    const user = await registerUser();
    token = user.token;
    userId = user.id;
    createdUsers.push(userId);
  });

  it('creates a subject with units and topics and tracks progress', async () => {
    const subject = await request(app).post('/api/subjects').set(auth(token)).send({ name: 'DBMS', code: 'CS301', color: 'violet' });
    expect(subject.status).toBe(201);
    const subjectId = subject.body.data.id;

    const unit = await request(app)
      .post(`/api/subjects/${subjectId}/units`)
      .set(auth(token))
      .send({ name: 'Unit 3: Normalization', topics: ['1NF', '2NF', '3NF', 'BCNF'] });
    expect(unit.status).toBe(201);
    expect(unit.body.data.topics).toHaveLength(4);
    const topicId = unit.body.data.topics[0].id;

    const done = await request(app).patch(`/api/topics/${topicId}`).set(auth(token)).send({ completed: true });
    expect(done.status).toBe(200);
    expect(done.body.data.unitCompletion).toBe(25);

    const progress = await request(app).put('/api/progress').set(auth(token)).send({ unitId: unit.body.data.id, completion: 70 });
    expect(progress.status).toBe(200);
    expect(progress.body.data.completion).toBe(70);

    const overview = await request(app).get('/api/progress').set(auth(token));
    expect(overview.status).toBe(200);
    expect(overview.body.data.subjects[0].units[0].completion).toBe(70);
    expect(overview.body.data.overall).toBe(70);

    const detail = await request(app).get(`/api/subjects/${subjectId}`).set(auth(token));
    expect(detail.status).toBe(200);
    expect(detail.body.data.units[0].topics.filter((t: { completed: boolean }) => t.completed)).toHaveLength(1);
  });

  it('validates subject input', async () => {
    const res = await request(app).post('/api/subjects').set(auth(token)).send({ name: '' });
    expect(res.status).toBe(400);
  });
});

describe('Notes upload and search', () => {
  let token = '';
  let subjectId = '';

  beforeAll(async () => {
    const user = await registerUser();
    token = user.token;
    createdUsers.push(user.id);
    const subject = await request(app).post('/api/subjects').set(auth(token)).send({ name: 'Operating Systems' });
    subjectId = subject.body.data.id;
  });

  it('uploads a TXT note, extracts text and makes it searchable', async () => {
    const content = 'A deadlock is a situation where processes wait forever for resources held by each other.\n\nThe four Coffman conditions are mutual exclusion, hold and wait, no preemption and circular wait.';
    const res = await request(app)
      .post('/api/notes/upload')
      .set(auth(token))
      .field('subjectId', subjectId)
      .field('title', 'Deadlock notes')
      .attach('file', Buffer.from(content), 'deadlock.txt');
    expect(res.status).toBe(201);
    expect(res.body.data.wordCount).toBeGreaterThan(10);
    expect(res.body.data.chunkCount).toBeGreaterThanOrEqual(1);

    const list = await request(app).get('/api/notes').set(auth(token));
    expect(list.body.data).toHaveLength(1);

    const search = await request(app).get('/api/notes/search').set(auth(token)).query({ q: 'coffman conditions' });
    expect(search.status).toBe(200);
    expect(search.body.data.results.length).toBeGreaterThan(0);
    expect(search.body.data.results[0].content.toLowerCase()).toContain('coffman');
  });

  it('rejects unsupported and empty files', async () => {
    const wrongType = await request(app)
      .post('/api/notes/upload')
      .set(auth(token))
      .field('subjectId', subjectId)
      .attach('file', Buffer.from('<html></html>'), 'page.html');
    expect(wrongType.status).toBe(400);

    const empty = await request(app)
      .post('/api/notes/upload')
      .set(auth(token))
      .field('subjectId', subjectId)
      .attach('file', Buffer.from('   '), 'empty.txt');
    expect(empty.status).toBe(400);

    const fakePdf = await request(app)
      .post('/api/notes/upload')
      .set(auth(token))
      .field('subjectId', subjectId)
      .attach('file', Buffer.from('this is not a pdf'), 'notes.pdf');
    expect(fakePdf.status).toBe(400);
  });
});

describe('User ownership (data isolation)', () => {
  it('never exposes one student\'s data to another', async () => {
    const alice = await registerUser('Alice');
    const bob = await registerUser('Bob');
    createdUsers.push(alice.id, bob.id);

    const subject = await request(app).post('/api/subjects').set(auth(alice.token)).send({ name: 'Alice Subject' });
    const subjectId = subject.body.data.id;
    const unit = await request(app).post(`/api/subjects/${subjectId}/units`).set(auth(alice.token)).send({ name: 'Unit 1' });
    const note = await request(app)
      .post('/api/notes/upload')
      .set(auth(alice.token))
      .field('subjectId', subjectId)
      .attach('file', Buffer.from('Alice private notes about transactions and ACID properties in databases.'), 'alice.txt');

    expect((await request(app).get(`/api/subjects/${subjectId}`).set(auth(bob.token))).status).toBe(404);
    expect((await request(app).put(`/api/subjects/${subjectId}`).set(auth(bob.token)).send({ name: 'Hacked' })).status).toBe(404);
    expect((await request(app).delete(`/api/subjects/${subjectId}`).set(auth(bob.token))).status).toBe(404);
    expect((await request(app).post(`/api/subjects/${subjectId}/units`).set(auth(bob.token)).send({ name: 'X' })).status).toBe(404);
    expect((await request(app).put(`/api/units/${unit.body.data.id}`).set(auth(bob.token)).send({ name: 'X' })).status).toBe(404);
    expect((await request(app).get(`/api/notes/${note.body.data.id}`).set(auth(bob.token))).status).toBe(404);
    expect((await request(app).delete(`/api/notes/${note.body.data.id}`).set(auth(bob.token))).status).toBe(404);
    expect((await request(app).put('/api/progress').set(auth(bob.token)).send({ unitId: unit.body.data.id, completion: 50 })).status).toBe(404);

    const bobSubjects = await request(app).get('/api/subjects').set(auth(bob.token));
    expect(bobSubjects.body.data).toHaveLength(0);
    const bobSearch = await request(app).get('/api/notes/search').set(auth(bob.token)).query({ q: 'ACID transactions' });
    expect(bobSearch.body.data.results).toHaveLength(0);

    // Alice still sees everything
    expect((await request(app).get(`/api/subjects/${subjectId}`).set(auth(alice.token))).status).toBe(200);
  });
});

describe('Dashboard and system', () => {
  it('returns health and an aggregated dashboard', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.data.database).toBe('ok');

    const user = await registerUser();
    createdUsers.push(user.id);
    const dashboard = await request(app).get('/api/dashboard').set(auth(user.token));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.stats.totalSubjects).toBe(0);
    expect(dashboard.body.data.weeklyActivity).toHaveLength(7);
  });
});

afterAll(async () => {
  await cleanupUsers(createdUsers);
  await prisma.$disconnect();
});
