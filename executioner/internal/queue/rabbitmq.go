package queue

import (
	"context"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog"
)

type RabbitMQ struct {
	Conn    *amqp.Connection
	Channel *amqp.Channel
	Logger  *zerolog.Logger
}

func NewRabbitMQ(connectionString string, logger *zerolog.Logger) (*RabbitMQ, error) {
	conn, err := amqp.Dial(connectionString)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}
	return &RabbitMQ{
		Conn:    conn,
		Channel: ch,
		Logger:  logger,
	}, nil
}

func (r *RabbitMQ) Consume(ctx context.Context, queueName string, handler Handler) error {
	_, err := r.Channel.QueueDeclare(queueName, true, false, false, false, nil)
	if err != nil {
		return err
	}

	msqs, err := r.Channel.Consume(queueName, "", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("Failed to register a consumer: %s", err)
	}

	r.Logger.Info().Str("queue", queueName).Msg("Consumer registered")

	for {
		select {
		case <-ctx.Done():
			r.Logger.Info().Str("queue", queueName).Msg("Context cancelled, stopping consumer")
			return ctx.Err()

		case msg, ok := <-msqs:
			if !ok {
				r.Logger.Info().Str("queue", queueName).Msg("Message channel closed, stopping consumer")
				return fmt.Errorf("message channel closed")
			}

			if err := handler(ctx, msg.Body); err != nil {
				r.Logger.Error().Err(err).Msg("Failed to handle message")
				msg.Nack(false, true)
				continue
			}
			msg.Ack(false)
		}
	}

}

func (r *RabbitMQ) Publish(ctx context.Context, queueName string, message []byte) error {
	_, err := r.Channel.QueueDeclare(queueName, true, false, false, false, nil)
	if err != nil {
		r.Logger.Error().Str("queue", queueName).Err(err).Msg("Failed to declare queue for publishing")
		return err
	}

	err = r.Channel.Publish(
		"",
		queueName,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        message,
		},
	)
	if err != nil {
		r.Logger.Error().Str("queue", queueName).Err(err).Msg("Failed to publish message")
		return err
	}

	r.Logger.Info().Str("queue", queueName).Int("size", len(message)).Msg("Published message")

	return nil
}

func (r *RabbitMQ) Close() error {
	if err := r.Conn.Close(); err != nil {
		return err
	}
	return nil
}

func (r *RabbitMQ) CloseChannel() error {
	if err := r.Channel.Close(); err != nil {
		return err
	}
	return nil
}
