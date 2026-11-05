import os from 'node:os';
import { connect } from '@colosseum/queue'
import { execute } from './languages/docker';
import { canSatisfy, getServerCaps, normalizeRequest } from './languages/limits';

const RABBIT_URL = process.env.RABBIT_URL || "amqp://guest:guest@127.0.0.1:5672";
// Executions run concurrently on this machine. Time limits are wall-clock, so too many concurrent jobs would make
// verdicts depend on how busy the server happens to be. Each job also compiles (a CPU and memory heavy step in the
// same container), so default to half the CPU cores. Raise it only on a machine that has been checked.
const PREFETCH_COUNT = parseInt(process.env.PREFETCH_COUNT || String(Math.max(1, Math.floor(os.cpus().length / 2))));
// How long a job may keep being passed on because the servers that see it cannot satisfy it, before it fails.
// This is time based (not a count of passes): a capable server may just be busy, and the job must wait for it.
const MAX_WAIT_SECONDS = parseInt(process.env.MAX_JOB_WAIT_SECONDS || "120");
const DECLINE_DELAY_MS = parseInt(process.env.DECLINE_DELAY_MS || "250");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const caps = getServerCaps();
  console.log(`Executioner "${caps.name}": up to ${caps.maxTimeSeconds}s and ${caps.maxMemoryMb}MB per execution, time scale x${caps.timeScale}, ${PREFETCH_COUNT} concurrent jobs`);
  console.log("Connecting to RabbitMQ");
  const {
    subscribe,
    publish,
  } = await connect(RABBIT_URL);
  console.log("Connected to RabbitMQ")

  const failAll = async (parsed: any, message: string) => {
    const fallbackResult = Array.isArray(parsed?.input)
      ? parsed.input.map((inp: any) => ({
          stdout: "",
          stderr: message,
          time: null,
          metadata: inp?.metadata,
        }))
      : [];

    await publish("results", JSON.stringify({
      result: fallbackResult,
      metadata: parsed?.metadata,
    }));
  };

  subscribe("execution", async (msg) => {
    console.log("Received msg");
    const parsed = JSON.parse(msg);

    // Only take a job whose limits this server can fully give. A weaker server passing it on is what keeps the
    // verdict the same whichever server would have run it. A job nobody can satisfy fails with a clear message.
    const verdict = canSatisfy(parsed.options, caps);
    if (!verdict.ok) {
      const firstDeclinedAt = parsed.firstDeclinedAt ?? Date.now();
      const waitedMs = Date.now() - firstDeclinedAt;
      const wanted = normalizeRequest(parsed.options);
      if (waitedMs > MAX_WAIT_SECONDS * 1000) {
        console.warn(`[${caps.name}] giving up on a job after waiting ${Math.round(waitedMs / 1000)}s: ${verdict.reason}`);
        await failAll(parsed, `No execution server can satisfy the limits of this problem (${wanted.timeSeconds}s, ${wanted.memoryMb}MB).`);
        return;
      }
      console.log(`[${caps.name}] declining job (waiting ${Math.round(waitedMs / 1000)}s): ${verdict.reason}`);
      await sleep(DECLINE_DELAY_MS); // avoid spinning when only weak servers are around
      await publish("execution", JSON.stringify({ ...parsed, firstDeclinedAt }));
      return;
    }

    try {
      console.log(`[${caps.name}] running job`);
      const result = await execute(parsed.sources, parsed.input, parsed.options)
      await publish("results", JSON.stringify({
        result,
        metadata: parsed?.metadata,
      }));
    } catch(err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      await failAll(parsed, `Execution worker error: ${errorMessage}`);
    }
  }, PREFETCH_COUNT);
}

run().catch(console.error)
