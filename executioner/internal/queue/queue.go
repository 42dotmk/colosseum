package queue

import "context"

type Handler func(ctx context.Context, body []byte) error

type Consumer interface {
	Consume(ctx context.Context, queueName string, handler Handler) error
	Close() error
}

type Publisher interface {
	Publish(ctx context.Context, queueName string, message []byte) error
	Close() error
}
