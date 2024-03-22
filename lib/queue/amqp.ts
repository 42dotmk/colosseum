const jackrabbit = require('@pager/jackrabbit');

const MAX_RECONNECT_ATTEMPTS = parseInt(process.env["MAX_RECONNECT_ATTEMPTS"] ?? "5");
const MAX_PARALLEL_PROCESSSES = parseInt(process.env["MAX_PARALLEL_PROCESSSES"] ?? "100");

const IS_DEBUG = process.env["QUEUE_DEBUG"] === "true";

type SubscriptionFn = (msg: string) => Promise<void>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const logDebug = (...args: any[]) => {
  if (true) {
    console.log(...args);
  }
}

export const connect = async (url: string) => {
  const rabbit = jackrabbit(url);

  const disconnect = async () => {
    rabbit.close();
  }

  const subscribe = async (queue: string, fn?: SubscriptionFn, tag?: string) => {
    rabbit
      .default()
      .queue({ name: queue })
      .consume(async (data: any, ack: any, nack: any, msg: any) => {
        logDebug("Received message", data.toString('utf8'));
        const str = data.toString('utf8');
        if (!str) {
          return;
        }
        try {
          await fn?.(str);
          await ack();
        } catch (e: any) {
          await nack({
            requeue: false
          });
          console.error("Error in subscription", e);
        }
      }, { noAck: false });
  }

  const publish = async (queue: string, msg: string, deliveryMode = 2) => {
    rabbit
    .default()
    .publish(msg, { key: queue });
  }

  const unsubscribe = async (tag: string) => {
  };

  return {
    subscribe,
    unsubscribe,
    publish,
    disconnect,
  };
}

