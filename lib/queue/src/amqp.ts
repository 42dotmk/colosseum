import {Connection, Consumer, ConsumerStatus, Publisher} from 'rabbitmq-client';

type SubscriptionFn = (msg: string) => Promise<void>;
type UnsubscribeFn = () => Promise<void>;

export const connect = async (url: string) => {
  console.log(`Connect via rabbitmq-client ${url}`);

  const rabbit = new Connection(url);
  const consumers: Consumer[] = [];
  const publishers: { [key: string]: Publisher } = {};

  rabbit.on('error', (err) => {
    console.log('RabbitMQ connection error', err)
  });

  rabbit.on('connection', () => {
    console.log('Connection successfully (re)established')
  });

  const disconnect = async () => {
    console.log('Disconnecting');

    console.log('Closing consumers' + consumers.length);
    for (const sub of consumers) {
      console.log('Closing consumer ' + sub.consumerTag);
      await sub.close();
    }

    for (const pub of Object.values(publishers)) {
      console.log('Closing publisher');

      await pub.close();
    }

    await rabbit.close();
  }

  const subscribe = async (queue: string, fn?: SubscriptionFn, prefetchCount: number = 1): Promise<UnsubscribeFn> => {
    const sub = rabbit.createConsumer({
      queue,
      queueOptions: {durable: true},
      qos: { prefetchCount },
    }, async (msg) => {
      console.log('received message (user-events)', msg);
      try {
        const str = msg.body.toString('utf8');
        await fn?.(str);
        return ConsumerStatus.ACK;
      } catch (e: any) {
        console.error("Error in subscription", e);
        return ConsumerStatus.DROP;
      }
    });
    
    sub.on('error', (err) => {
      // Maybe the consumer was cancelled, or the connection was reset before a
      // message could be acknowledged.
      console.log('consumer error (user-events)', err)
    });

    consumers.push(sub);

    return async () => {
      if (consumers.indexOf(sub) === -1) {
        consumers.splice(consumers.indexOf(sub), 1);
      }
      await sub.close();
    };
  }

  const publish = async (queue: string, msg: string, deliveryMode = 2) => {
    const pub = publishers[queue] ?? rabbit.createPublisher({
      confirm: true,
      maxAttempts: 2,
    });

    if (!publishers[queue]) {
      publishers[queue] = pub;
    }

    await pub.send(queue, msg);
  };

  const unsubscribe = async (tag: string) => {
  };

  return {
    subscribe,
    unsubscribe,
    publish,
    disconnect,
  };
}

