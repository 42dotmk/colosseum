/**
 * Runs one execution job directly (no queue) and prints the result as JSON.
 * Usage: tsx tools/exec-cli.ts <job.json>
 * The server capability env vars (MAX_EXECUTION_TIME, MEMORY_LIMIT_PER_EXECUTION, ...) apply as usual.
 */
import fs from 'node:fs';
import { execute } from '../languages/docker';

const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const result = await execute(job.sources, job.input, job.options);
console.log('RESULT_JSON:' + JSON.stringify(result));
