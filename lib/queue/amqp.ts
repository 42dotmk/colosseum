import { AMQPChannel, AMQPClient } from '@cloudamqp/amqp-client'

const MAX_RECONNECT_ATTEMPTS = parseInt(process.env["MAX_RECONNECT_ATTEMPTS"] ?? "5");
const MAX_PARALLEL_PROCESSSES = parseInt(process.env["MAX_PARALLEL_PROCESSSES"] ?? "100");

type SubscriptionFn = (msg: string) => Promise<void>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const connect = async (url: string) => {
  let pubChannel: AMQPChannel | null;
  let subChannel: AMQPChannel | null;

  const disconnect = async () => {
    if (pubChannel) {
      await pubChannel.close();
      pubChannel = null;
    }
    if (subChannel) {
      await subChannel.close();
      subChannel = null;
    }
  }

  const ensureConnection = async (attempt = 0): Promise<{ pubChannel: AMQPChannel, subChannel: AMQPChannel }> => {
    if (subChannel && pubChannel) {
      return { pubChannel, subChannel };
    }

    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      throw new Error("Max reconnect attempts reached");
    }

    try {
      const amqp = new AMQPClient(url);
      const connection = await amqp.connect();
      subChannel = await connection.channel();
      pubChannel = await connection.channel();
      connection.onerror = (e) => {
        console.error("Connection error", e);
        connection.close();
      };
      return { subChannel, pubChannel };
    } catch (e: any) {
      console.error("ERROR", e)
      e.connection.close()
      await wait(1000);
      return ensureConnection(attempt++);
    }
  }

  await ensureConnection();

  const subscribe = async (queue: string, fn?: SubscriptionFn, tag?: string) => {
    const { subChannel: ch } = await ensureConnection();
    const q = await ch.queue(queue);
    await ch.prefetch(MAX_PARALLEL_PROCESSSES);
    await q.subscribe({ noAck: false, tag }, async (msg) => {
      const str = msg.bodyToString();
      if (!str) {
        return;
      }
      try {
        await fn?.(str);
        await msg.ack();
      } catch (e: any) {
        await msg.nack(true);
        console.error("Error in subscription", e);
      }
    });
  }

  const unsubscribe = async (queue: string, tag: string) => {
    const { subChannel: ch } = await ensureConnection();
    const q = await ch.queue(queue);
    q.unsubscribe(tag);
  };

  const publish = async (queue: string, msg: string, deliveryMode = 2) => {
    const { pubChannel } = await ensureConnection();
    const q = await pubChannel.queue(queue);
  
    q.publish(msg, { 
      deliveryMode,
    });
  }

  return {
    subscribe,
    unsubscribe,
    publish,
    disconnect,
  };
}

