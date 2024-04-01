import { connect } from '@colosseum/queue'
import { execute } from './languages/docker';

const RABBIT_URL = process.env.RABBIT_URL || "amqp://guest:guest@localhost";
const PREFETCH_COUNT = parseInt(process.env.PREFETCH_COUNT || "10");

async function run() {
  console.log("Connecting to RabbitMQ");
  const { 
    subscribe,
    publish,
  } = await connect(RABBIT_URL);
  console.log("Connected to RabbitMQ")
  subscribe("execution", async (msg) => {
    console.log("Received msg");
    const parsed = JSON.parse(msg);
    try {
      const result = await execute(parsed.sources, parsed.input, parsed.options)
      await publish("results", JSON.stringify({
        result,
        metadata: parsed?.metadata,
      }));
    } catch(err) {
      console.error(err);
      await publish("results", JSON.stringify({
        error: "Unknown error",
      }));
    }
  }, PREFETCH_COUNT);
}

run().catch(console.error)