const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise the controller boundary with Strapi's actual installed relation parser.
// Database and authentication calls are mocked; no server or database is started.
const coreDirectory = path.dirname(require.resolve('@strapi/core'));
const { mapRelation } = require(path.join(coreDirectory,
  'services/document-service/transform/relations/utils/map-relation.js'));
const controllerPath = path.join(__dirname, '../src/api/submission/controllers/submission.ts');
const source = fs.readFileSync(controllerPath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const languages = [
  { id: 7, codeName: 'python', documentId: '5e76fd83b09556a6ab0295bb' },
  { id: 9, codeName: 'rust', documentId: '7275c77d9c260f184a4b537e' },
  { id: 3, codeName: 'nodejs', documentId: 'gggimopy7kot7tremwjgblyb' },
];

function createController() {
  const writes = [];
  const strapi = {
    config: { get: () => false },
    documents(uid) {
      if (uid === 'api::language.language') {
        return {
          findFirst: async ({ filters }) => languages.find(language =>
            filters.id !== undefined ? language.id === filters.id : language.codeName === filters.codeName),
        };
      }
      if (uid === 'api::problem.problem') {
        return { findOne: async () => ({ event: { documentId: 'event-document' } }) };
      }
      assert.equal(uid, 'api::submission.submission');
      const write = async ({ data }) => {
        writes.push(data);
        return { documentId: 'submission-document', ...data };
      };
      return { create: write, update: write };
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(name) {
      if (name === '@strapi/strapi') {
        return { factories: { createCoreController: (_uid, factory) => factory({ strapi }) } };
      }
      if (name.endsWith('/current-user')) {
        return { getCurrentUser: async () => ({ id: 1, documentId: 'user-document' }) };
      }
      if (name.endsWith('/event-registration') || name === '@colosseum/queue') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  }, { filename: controllerPath });
  return { controller: module.exports.default, writes };
}

for (const method of ['create', 'update']) {
  for (const language of languages) {
    for (const input of [language.documentId, language.codeName, language.id, String(language.id)]) {
      test(`${method}: ${language.codeName} accepts ${JSON.stringify(input)}`, async () => {
        const { controller, writes } = createController();
        const ctx = {
          request: { body: { data: { code: 'example', language: input, problem: 'problem-document' } } },
          params: { id: 'submission-document' },
        };
        await controller[method](ctx);
        assert.equal(writes.length, 1);
        const mapped = await mapRelation(relation => relation, writes[0].language);
        assert.equal(mapped.set.length, 1);
        assert.equal(mapped.set[0].documentId, language.documentId);
        assert.equal(mapped.set[0].id, undefined, 'document IDs must not enter the row-ID path');
      });
    }
  }
}

test('update: code-only updates do not add a language relation', async () => {
  const { controller, writes } = createController();
  await controller.update({
    request: { body: { data: { code: 'updated code' } } },
    params: { id: 'submission-document' },
  });
  assert.equal(writes.length, 1);
  assert.equal(Object.hasOwn(writes[0], 'language'), false);
});

test('create: a missing language is still rejected', async () => {
  const { controller, writes } = createController();
  let error;
  await controller.create({
    request: { body: { data: { code: 'example', problem: 'problem-document' } } },
    badRequest: message => { error = message; },
  });
  assert.equal(error, 'Language is required');
  assert.equal(writes.length, 0);
});
