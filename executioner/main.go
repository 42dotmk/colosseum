package main

import (
	"colosseum/languages"
	"encoding/json"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

	type RabbitMQ struct {
		Conn *amqp.Connection
		Channel *amqp.Channel
	}


	type ExecutionRequestContract struct {
		Sources []languages.File `json:"sources"`
		Input []languages.File	`json:"input"`
		Options languages.LanguageOptions `json:"options"`
		Metadata map[string]interface{} `json:"metadata"`
	}



	func main(){
		conn,err := amqp.Dial("amqp://guest:guest@localhost")
		if err != nil {
			fmt.Errorf("Failed to connect to RabbitMQ: %s", err)
		}
		fmt.Println("Connected to RabbitMQ")

		ch, err := conn.Channel()
		if err != nil {
			fmt.Errorf("Failed to open a channel: %s", err)
		}

		queueName := "execution" 
		_, err = ch.QueueDeclare(
			queueName, 
			true,      
			false,     
			false,     
			false,
			nil,       
		)
		if err != nil {
			fmt.Errorf("Failed to declare the queue: %s", err)
		}
		fmt.Println("Queue declared")

		msgs, err := ch.Consume("execution", "", false, false, false, false, nil)
		fmt.Println("Channel opened")

		for d:= range msgs{
			fmt.Printf("Received a message: %s\n", d.Body)
			go func(msg amqp.Delivery){
				var p ExecutionRequestContract
				err := json.Unmarshal(msg.Body, &p)
				metadata := p.Metadata
				if err != nil {
					fmt.Errorf("Failed to parse message: %s", err)
					return
				}
				result, err := execute(p.Sources, p.Input, p.Options)
				if err != nil {
					fmt.Errorf("Failed to execute: %s", err)
					
				}
				d.Ack(false)
				metadataJSON, err := json.Marshal(metadata)
				if err != nil {
					fmt.Errorf("Failed to marshal metadata: %s", err)
					return
				}
				resMsg := fmt.Sprintf(`{"results": "%s", "metadata": %s}`, result, metadataJSON)
				fmt.Println(resMsg)
				err = ch.Publish(
					"",
					"results",
					false,
					false,
					amqp.Publishing{
						ContentType: "application/json",
						Body: []byte(resMsg),
					})
				if err != nil {
					fmt.Errorf("Failed to publish result: %s", err)
				}
				fmt.Println("Execution result:", result)
			}(d)
		}
		select {}
	}

func execute(sources []languages.File, input []languages.File, options languages.LanguageOptions) (string, error){
	
	languages.Init()

	return languages.StartCodeContainer(sources, input, options)
	
}

