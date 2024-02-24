import { AMQPChannel, AMQPClient } from '@cloudamqp/amqp-client'

const MAX_RECONNECT_ATTEMPTS = parseInt(process.env["MAX_RECONNECT_ATTEMPTS"] ?? "5");

type SubscriptionFn = (msg: string) => Promise<void>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const connect = async (url: string) => {
  let channel: AMQPChannel;

  const ensureConnection = async (attempt = 0): Promise<AMQPChannel> => {
    if (channel) {
      return channel;
    }

    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      throw new Error("Max reconnect attempts reached");
    }

    try {
      const amqp = new AMQPClient(url);
      const connection = await amqp.connect();
      channel = await connection.channel();
      connection.onerror = (e) => {
        console.error("Connection error", e);
        connection.close();
      };
      return channel;
    } catch (e: any) {
      console.error("ERROR", e)
      e.connection.close()
      await wait(1000);
      return ensureConnection(attempt++);
    }
  }

  await ensureConnection();

  const subscribe = async (queue: string, fn?: SubscriptionFn, tag?: string) => {
    const ch = await ensureConnection();
    const q = await ch.queue(queue);
    await ch.prefetch(1);
    await q.subscribe({ noAck: false, tag }, async (msg) => {
      const str = msg.bodyToString();
      if (!str) {
        return;
      }
      try {
        await fn?.(str);
        await msg.ack();
      } catch (e: any) {
        console.error("Error in subscription", e);
      }
    });
  }

  const unsubscribe = async (queue: string, tag: string) => {
    const ch = await ensureConnection();
    const q = await ch.queue(queue);
    q.unsubscribe(tag);
  };

  const publish = async (queue: string, msg: string, deliveryMode = 2) => {
    const ch = await ensureConnection();
    const q = await ch.queue(queue);
  
    q.publish(msg, { 
      deliveryMode,
    });
  }

  return {
    subscribe,
    unsubscribe,
    publish,
  };
}

