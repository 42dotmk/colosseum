import { connect } from '@colosseum/queue/amqp'
import { execute } from './languages/docker';

const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";

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
    const result = await execute(parsed.sources, parsed.input, parsed.options);
    await publish("results", JSON.stringify({
      result,
      metadata: parsed?.metadata,
    }));
  });
}

run().catch(console.error)