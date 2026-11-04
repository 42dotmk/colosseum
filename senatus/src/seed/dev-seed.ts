/**
 * Local development seed. Enabled with SEED_DEV_DATA=true (see senatus/.env.example).
 * Idempotent: safe to run on every bootstrap.
 *
 * Seeds: Strapi admin, participant users, role permissions, the C++ language and the
 * C++ course homework as one event per lecture (first event starts at
 * SEED_FIRST_EVENT_START, default 2026-12-01, each next one 14 days later).
 */
import fs from 'node:fs';
import path from 'node:path';

const DAY_MS = 24 * 60 * 60 * 1000;
const EVENT_SPACING_DAYS = 14;
const EVENT_DURATION_MS = 13 * DAY_MS + 23 * 60 * 60 * 1000 + 59 * 60 * 1000;

export const SEED_USERS = [
  { username: 'student', email: 'student@colosseum.local', password: 'Student123!', register: true },
  { username: 'alice', email: 'alice@colosseum.local', password: 'Alice123!', register: true },
  { username: 'bob', email: 'bob@colosseum.local', password: 'Bob12345!', register: true },
  // Never registered for any event: used to verify the registration guard.
  { username: 'mallory', email: 'mallory@colosseum.local', password: 'Mallory123!', register: false },
];

const log = (msg: string) => console.log(`[seed] ${msg}`);

const seedAdmin = async (strapi: any) => {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@colosseum.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';

  const existing = await strapi.db.query('admin::user').findOne({ where: { email } });
  if (existing) return;

  const role = await strapi.db.query('admin::role').findOne({ where: { code: 'strapi-super-admin' } });
  await strapi.service('admin::user').create({
    email,
    firstname: 'Colosseum',
    lastname: 'Admin',
    password,
    isActive: true,
    roles: role ? [role.id] : [],
  });
  log(`created admin ${email}`);
};

// Actions participants need through the REST API. The test-case controller strips hidden/locked data.
const AUTHENTICATED_ACTIONS = [
  'api::event.event.find',
  'api::event.event.findOne',
  'api::problem.problem.find',
  'api::problem.problem.findOne',
  'api::language.language.find',
  'api::language.language.findOne',
  'api::test-case.test-case.find',
  'api::test-case.test-case.findOne',
  'api::tutorial.tutorial.find',
  'api::tutorial.tutorial.findOne',
  'api::submission.submission.find',
  'api::submission.submission.findOne',
  'api::submission.submission.create',
  'api::execution.execution.find',
  'api::execution.execution.findOne',
  'api::event-registration.event-registration.find',
  'api::event-registration.event-registration.findOne',
  'api::event-question.event-question.find',
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.user.findOne',
  'plugin::users-permissions.user.update',
];

const PUBLIC_ACTIONS = [
  'api::event.event.find',
  'api::event.event.findOne',
  'api::language.language.find',
  'api::tutorial.tutorial.find',
  'api::tutorial.tutorial.findOne',
];

const grant = async (strapi: any, roleType: string, actions: string[]) => {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: roleType } });
  if (!role) return;
  for (const action of actions) {
    const exists = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: role.id } });
    if (!exists) {
      await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
    }
  }
};

const seedUsers = async (strapi: any) => {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const userService = strapi.plugin('users-permissions').service('user');
  const users: Record<string, any> = {};

  for (const u of SEED_USERS) {
    let user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: u.email } });
    if (!user) {
      user = await userService.add({
        username: u.username,
        email: u.email,
        password: u.password,
        provider: 'local',
        confirmed: true,
        blocked: false,
        role: role.id,
      });
      log(`created user ${u.email}`);
    }
    users[u.email] = user;
  }
  return users;
};

const seedLanguage = async (strapi: any) => {
  const existing = await strapi.documents('api::language.language').findMany({ filters: { codeName: 'cpp' } });
  if (existing.length) return existing[0];
  const language = await strapi.documents('api::language.language').create({
    data: { name: 'C++ (GCC)', codeName: 'cpp', entrypoint: 'main.cpp', defaultMaxCpuTime: 5, defaultMaxMemory: 256 },
    status: 'published',
  });
  log('created language C++');
  return language;
};

const STARTER = `#include <iostream>
using namespace std;

int main()
{
    // Write your solution here

    return 0;
}
`;

const seedCourse = async (strapi: any, language: any, users: Record<string, any>) => {
  const firstStart = new Date(process.env.SEED_FIRST_EVENT_START || '2026-12-01T00:00:00Z');
  if (Number.isNaN(firstStart.getTime())) throw new Error('Invalid SEED_FIRST_EVENT_START');

  const courseFile = path.join(strapi.dirs.app.root, 'seed', 'cpp-course.json');
  const lectures: any[] = JSON.parse(fs.readFileSync(courseFile, 'utf8')).lectures;
  for (let i = 0; i < lectures.length; i++) {
    const lecture = lectures[i];
    const title = `C++ Course: Lecture ${lecture.number} Homework - ${lecture.title}`;
    const start = new Date(firstStart.getTime() + i * EVENT_SPACING_DAYS * DAY_MS);
    const end = new Date(start.getTime() + EVENT_DURATION_MS);

    const found = await strapi.documents('api::event.event').findMany({ filters: { title } });
    let event = found[0];
    if (!event) {
      event = await strapi.documents('api::event.event').create({
        data: {
          title,
          description: `Homework for lecture ${lecture.number} (${lecture.title}) of the C++ course. ${lecture.problems.length} problems.`,
          start: start.toISOString(),
          end: end.toISOString(),
          registrationMode: 'open',
          supportedLanguages: [language.documentId],
        },
        status: 'published',
      });
      log(`created event "${title}" (${start.toISOString()})`);
    }

    const existingProblems = await strapi.documents('api::problem.problem').findMany({
      filters: { event: { documentId: event.documentId } },
      pagination: { page: 1, pageSize: 200 },
    });
    const existingTitles = new Set(existingProblems.map((p: any) => p.title));
    {
      for (const p of lecture.problems) {
        const problemTitle = `${String(p.order).padStart(2, '0')}. ${p.title}`;
        if (existingTitles.has(problemTitle)) continue;
        const problem = await strapi.documents('api::problem.problem').create({
          data: {
            title: problemTitle,
            description: p.description,
            points: 50 + 50 * p.difficulty,
            event: event.documentId,
            starterCodes: [{ code: STARTER, language: language.documentId }],
          },
          status: 'published',
        });
        // Roles: 1st test is the visible sample, 2nd is hidden, 3rd is hidden + locked
        // (never revealed to participants). Weights grow with how hidden the test is.
        await Promise.all(
          p.tests.map((test: any, t: number) =>
            strapi.documents('api::test-case.test-case').create({
              data: {
                input: test.input,
                output: test.output,
                hidden: t >= 1,
                locked: t >= 2,
                weight: t + 1,
                problem: problem.documentId,
              },
              status: 'published',
            }),
          ),
        );
      }
      log(`lecture ${lecture.number}: ${lecture.problems.length} problems ensured`);
    }

    for (const u of SEED_USERS.filter((x) => x.register)) {
      const user = users[u.email];
      const reg = await strapi.documents('api::event-registration.event-registration').findMany({
        filters: { event: { documentId: event.documentId }, user: { documentId: user.documentId } },
      });
      if (!reg.length) {
        await strapi.documents('api::event-registration.event-registration').create({
          data: { event: event.documentId, user: user.documentId, registeredAt: new Date().toISOString() },
        });
      }
    }
  }
};

export const runDevSeed = async (strapi: any) => {
  log('seeding development data');
  await seedAdmin(strapi);
  await grant(strapi, 'authenticated', AUTHENTICATED_ACTIONS);
  await grant(strapi, 'public', PUBLIC_ACTIONS);
  const users = await seedUsers(strapi);
  const language = await seedLanguage(strapi);
  await seedCourse(strapi, language, users);
  log('done');
};
