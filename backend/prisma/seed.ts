/**
 * Seed script - creates a demo student with subjects, units, topics, notes,
 * progress and a sample quiz so the app has data to show immediately.
 *
 *   npm run prisma:seed
 *
 * Demo login: demo@studymcp.ai / demo1234
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@studymcp.ai';
const DEMO_PASSWORD = 'demo1234';

const NORMALIZATION_NOTES = `Unit 3 - Normalization

Normalization is the process of organising data in a database to reduce redundancy and improve data integrity. It divides large tables into smaller, related tables and defines relationships between them using keys.

Functional dependency: An attribute B is functionally dependent on attribute A (written A -> B) if each value of A is associated with exactly one value of B. For example, StudentID -> StudentName.

First Normal Form (1NF): A relation is in 1NF when every attribute contains only atomic (indivisible) values and there are no repeating groups. Each row must be unique and identified by a primary key.

Second Normal Form (2NF): A relation is in 2NF if it is in 1NF and every non-key attribute is fully functionally dependent on the whole primary key. Partial dependencies (a non-key attribute depending on only part of a composite key) must be removed.

Third Normal Form (3NF): A relation is in 3NF if it is in 2NF and there are no transitive dependencies, i.e. no non-key attribute depends on another non-key attribute. For every functional dependency X -> Y either X is a super key or Y is a prime attribute. Example: Student(RollNo, Name, DeptCode, DeptName) has the transitive dependency RollNo -> DeptCode -> DeptName; splitting into Student(RollNo, Name, DeptCode) and Department(DeptCode, DeptName) gives 3NF.

Boyce-Codd Normal Form (BCNF): A stronger version of 3NF. For every non-trivial functional dependency X -> Y, X must be a super key. BCNF removes the anomalies that 3NF can still allow when a relation has multiple overlapping candidate keys.

Anomalies removed by normalization: insertion anomaly (cannot add data because other data is missing), update anomaly (the same fact stored in many rows must be changed everywhere) and deletion anomaly (deleting a row removes unrelated facts).

Denormalization is the deliberate introduction of redundancy to improve read performance, commonly used in reporting and data warehouses.`;

const DEADLOCK_NOTES = `Unit 3 - Deadlocks

A deadlock is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource held by some other process in the set.

Necessary conditions (Coffman conditions): 1) Mutual exclusion - at least one resource must be non-shareable. 2) Hold and wait - a process holds at least one resource while waiting for others. 3) No preemption - resources cannot be forcibly taken away. 4) Circular wait - a circular chain of processes exists where each waits for a resource held by the next.

Deadlock handling strategies: prevention (break one of the four conditions), avoidance (Banker's algorithm keeps the system in a safe state), detection and recovery (resource allocation graph, wait-for graph, then abort a process or preempt resources) and ignoring the problem (the ostrich algorithm used by many operating systems).

Banker's algorithm: each process declares its maximum need; a request is granted only if the resulting state is safe, meaning there exists a sequence in which every process can finish.`;

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, include: { subjects: true } });
  if (existing && existing.subjects.length > 0) {
    console.log(`Demo user already seeded (${DEMO_EMAIL}). Nothing to do.`);
    return;
  }

  const user =
    existing ??
    (await prisma.user.create({
      data: { name: 'Demo Student', email: DEMO_EMAIL, password: await bcrypt.hash(DEMO_PASSWORD, 10) },
    }));

  const subjectsData = [
    {
      name: 'Database Management Systems',
      code: 'DBMS',
      color: 'violet',
      description: 'Relational model, SQL, normalization and transactions.',
      units: [
        { name: 'Unit 1: Introduction', topics: ['DBMS vs file system', 'Three schema architecture', 'Data independence'], completion: 90 },
        { name: 'Unit 2: ER Model', topics: ['Entities and attributes', 'Relationships', 'ER to relational mapping'], completion: 75 },
        { name: 'Unit 3: Normalization', topics: ['Functional dependency', '1NF and 2NF', '3NF', 'BCNF'], completion: 30 },
        { name: 'Unit 4: SQL', topics: ['DDL and DML', 'Joins', 'Subqueries', 'Views'], completion: 10 },
        { name: 'Unit 5: Transactions', topics: ['ACID properties', 'Concurrency control', 'Recovery'], completion: 0 },
      ],
    },
    {
      name: 'Operating Systems',
      code: 'OS',
      color: 'cyan',
      description: 'Processes, scheduling, memory management and deadlocks.',
      units: [
        { name: 'Unit 1: Processes and Threads', topics: ['Process states', 'Context switching', 'Threads'], completion: 80 },
        { name: 'Unit 2: CPU Scheduling', topics: ['FCFS and SJF', 'Round robin', 'Priority scheduling'], completion: 55 },
        { name: 'Unit 3: Deadlocks', topics: ['Coffman conditions', "Banker's algorithm", 'Detection and recovery'], completion: 25 },
        { name: 'Unit 4: Memory Management', topics: ['Paging', 'Segmentation', 'Virtual memory'], completion: 0 },
      ],
    },
    {
      name: 'Computer Networks',
      code: 'CN',
      color: 'emerald',
      description: 'OSI model, TCP/IP, routing and transport protocols.',
      units: [
        { name: 'Unit 1: Network Models', topics: ['OSI layers', 'TCP/IP model'], completion: 60 },
        { name: 'Unit 2: Data Link Layer', topics: ['Framing', 'Error detection', 'Flow control'], completion: 20 },
        { name: 'Unit 3: Network Layer', topics: ['IP addressing', 'Subnetting', 'Routing algorithms'], completion: 0 },
      ],
    },
  ];

  const created: Record<string, { subjectId: string; units: Record<string, string> }> = {};

  for (const s of subjectsData) {
    const subject = await prisma.subject.create({
      data: { userId: user.id, name: s.name, code: s.code, color: s.color, description: s.description },
    });
    created[s.code] = { subjectId: subject.id, units: {} };
    for (const [index, u] of s.units.entries()) {
      const completedCount = Math.round((u.completion / 100) * u.topics.length);
      const unit = await prisma.unit.create({
        data: {
          subjectId: subject.id,
          name: u.name,
          order: index + 1,
          topics: { create: u.topics.map((name, i) => ({ name, order: i + 1, completed: i < completedCount })) },
          progress: { create: { userId: user.id, completion: u.completion, lastStudiedAt: new Date(Date.now() - (index + 1) * 86_400_000) } },
        },
      });
      created[s.code].units[u.name] = unit.id;
    }
  }

  // Notes (already chunked the same way the upload pipeline does: by paragraph)
  const notes = [
    { code: 'DBMS', unit: 'Unit 3: Normalization', title: 'DBMS Unit 3 - Normalization notes', content: NORMALIZATION_NOTES },
    { code: 'OS', unit: 'Unit 3: Deadlocks', title: 'OS Unit 3 - Deadlock notes', content: DEADLOCK_NOTES },
  ];
  for (const n of notes) {
    const chunks = n.content.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
    await prisma.note.create({
      data: {
        userId: user.id,
        subjectId: created[n.code].subjectId,
        unitId: created[n.code].units[n.unit],
        title: n.title,
        fileName: `${n.title}.txt`,
        fileType: 'txt',
        fileSize: Buffer.byteLength(n.content),
        content: n.content,
        wordCount: n.content.split(/\s+/).length,
        chunks: { create: chunks.map((content, index) => ({ index, content })) },
      },
    });
  }

  // A sample quiz with one attempt
  const quiz = await prisma.quiz.create({
    data: {
      userId: user.id,
      subjectId: created.DBMS.subjectId,
      unitId: created.DBMS.units['Unit 2: ER Model'],
      title: 'ER Model basics',
      difficulty: 'EASY',
      numberOfQuestions: 3,
      questions: {
        create: [
          { order: 1, type: 'MCQ', question: 'Which symbol represents an entity in an ER diagram?', options: ['Rectangle', 'Diamond', 'Ellipse', 'Circle'], correctAnswer: 'Rectangle', explanation: 'Entities are drawn as rectangles; relationships as diamonds; attributes as ellipses.' },
          { order: 2, type: 'MCQ', question: 'A weak entity is identified by', options: ['Its own primary key', 'A partial key plus the owner entity key', 'A foreign key only', 'A composite attribute'], correctAnswer: 'A partial key plus the owner entity key', explanation: 'Weak entities depend on the identifying (owner) entity for identification.' },
          { order: 3, type: 'TRUE_FALSE', question: 'A many-to-many relationship becomes a separate table when mapped to the relational model.', options: ['True', 'False'], correctAnswer: 'True', explanation: 'M:N relationships are mapped to a new relation containing both participating keys.' },
        ],
      },
    },
    include: { questions: true },
  });
  await prisma.quizResult.create({
    data: {
      quizId: quiz.id,
      userId: user.id,
      score: 2,
      total: 3,
      percentage: 66.7,
      timeTakenSec: 95,
      answers: quiz.questions.map((q, i) => ({ questionId: q.id, selected: i === 1 ? q.options[0] : q.correctAnswer, correct: q.correctAnswer, isCorrect: i !== 1 })),
    },
  });

  await prisma.activity.createMany({
    data: [
      { userId: user.id, type: 'NOTE_UPLOAD', title: 'Uploaded notes "DBMS Unit 3 - Normalization notes"', subjectId: created.DBMS.subjectId },
      { userId: user.id, type: 'QUIZ_COMPLETED', title: 'Scored 2/3 (66.7%) in "ER Model basics"', subjectId: created.DBMS.subjectId },
      { userId: user.id, type: 'TOPIC_COMPLETED', title: 'Completed topic "Process states" in Unit 1: Processes and Threads', subjectId: created.OS.subjectId },
    ],
  });

  console.log('Seed complete.');
  console.log(`Demo login -> email: ${DEMO_EMAIL}  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
