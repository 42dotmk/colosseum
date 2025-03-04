package executioner

import (
	"encoding/json"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

type RabbitMQ struct {
	Conn *amqp.Connection
	Channel *amqp.Channel

}

type parsed struct {
	sources []string
	input string
	options string
}

func main(){
	conn,err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		fmt.Errorf("Failed to connect to RabbitMQ: %s", err)
	}
	fmt.Println("Connected to RabbitMQ")

	ch, err := conn.Channel()
	if err != nil {
		fmt.Errorf("Failed to open a channel: %s", err)
	}
	msgs, err := ch.Consume("execution", "", false, false, false, false, nil)
	fmt.Println("Channel opened")

	pub, err := ch.QueueDeclare("results", false, false, false, false, nil)

	go func(){
		for d := range msgs {
			fmt.Printf("Received a message: %s\n", d.Body)
			var p parsed
			err := json.Unmarshal(d.Body, &p)
			if err != nil {
				fmt.Errorf("Failed to parse message: %s", err)
				continue
			}
			result, err := execute(p.sources, p.input, p.options)
			if err != nil {
				fmt.Errorf("Failed to execute: %s", err)
			}
			fmt.Println("Execution result:", result)
			err = pub.Publish(json.Marshal(result), "results", false, false, amqp.Publishing)
			if err != nil {}
			fmt.Errorf("Failed to publish result: %s", err)
		}
	}()

}

type LanguageOptions struct {
	Language       string            `json:"language"`
	EntrypointFile string            `json:"entrypointFile"`
	Options        map[string]string `json:"options"`
}

type File struct {
	ID       *string                `json:"id,omitempty"`
	Filename string                 `json:"filename"`
	Content  string                 `json:"content"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

func execute(sources []string, input string, options string) (string, error){


	return "result", nil
}

