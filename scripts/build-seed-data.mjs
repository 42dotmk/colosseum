/**
 * Converts the C++ course homework folder into senatus/seed/cpp-course.json.
 *
 * Usage: node scripts/build-seed-data.mjs "<path to CPP Course>"
 *
 * Only English content is exported. Reference solutions are NOT exported.
 */
import fs from 'node:fs';
import path from 'node:path';

// problem.md starts with a metadata line (difficulty stars and concepts) that is not part of the statement
// (it looks like: **Difficulty:** ★☆☆ (easy) **Concepts:** `cout`, ...). It is removed together with the blank line after it.
const stripMetadata = (md) => md.replace(/^\*\*Difficulty:\*\*.*\n(?:[ \t]*\n)?/m, '');

const root = process.argv[2];
if (!root) {
  console.error('Usage: node scripts/build-seed-data.mjs "<path to CPP Course>"');
  process.exit(1);
}

const lectures = [];
for (const dir of fs.readdirSync(root).filter((d) => /^Lecture \d+/.test(d)).sort()) {
  const hwRoot = path.join(root, dir, 'homework');
  if (!fs.existsSync(hwRoot)) continue;

  const number = Number(dir.match(/^Lecture (\d+)/)[1]);
  const lectureTitle = dir.replace(/^Lecture \d+ - /, '');
  const problems = [];

  for (const hw of fs.readdirSync(hwRoot).sort()) {
    const hwDir = path.join(hwRoot, hw);
    const lessonPath = path.join(hwDir, 'lesson.json');
    if (!fs.existsSync(lessonPath)) continue;
    const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
    const testsDir = path.join(hwDir, 'tests');
    const tests = fs
      .readdirSync(testsDir)
      .filter((f) => f.endsWith('.in'))
      .sort()
      .map((f) => ({
        input: fs.readFileSync(path.join(testsDir, f), 'utf8').replace(/\r\n/g, '\n'),
        output: fs.readFileSync(path.join(testsDir, f.replace(/\.in$/, '.out')), 'utf8').replace(/\r\n/g, '\n'),
      }));

    problems.push({
      slug: lesson.slug,
      order: lesson.homework,
      title: lesson.title.en,
      difficulty: lesson.difficulty,
      concepts: lesson.concepts,
      description: stripMetadata(fs.readFileSync(path.join(hwDir, 'problem.md'), 'utf8').replace(/\r\n/g, '\n')),
      tests,
    });
  }

  lectures.push({ number, title: lectureTitle, problems });
}

const out = path.join(import.meta.dirname, '..', 'senatus', 'seed', 'cpp-course.json');
fs.writeFileSync(out, JSON.stringify({ lectures }, null, 2) + '\n');
console.log(`Wrote ${out}: ${lectures.length} lectures, ${lectures.reduce((n, l) => n + l.problems.length, 0)} problems`);
