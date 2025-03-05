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
	Sources []string `json:"sources"`
	Input []string	`json:"input"`
	Options languages.LanguageOptions `json:"options"`
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


	go func(){
		fmt.Println("Waiting for messages")
		for d := range msgs {
			fmt.Printf("Received a message: %s\n", d.Body)
			var p ExecutionRequestContract
			err := json.Unmarshal(d.Body, &p)
			if err != nil {
				fmt.Errorf("Failed to parse message: %s", err)
				continue
			}
			result, err := execute(p.Sources, p.Input, p.Options)
			if err != nil {
				fmt.Errorf("Failed to execute: %s", err)
			}
			fmt.Println("Execution result:", result)
			body, err := json.Marshal(result)
			if err != nil {
				fmt.Errorf("Failed to marshal result: %s", err)
				continue
			}
			err = ch.Publish(
				"",
				"results",
				false,  
				false,  
				amqp.Publishing{
					ContentType: "application/json",
					Body:        body,
				})
			if err != nil {
				fmt.Errorf("Failed to publish result: %s", err)
			}
		}
	}()
	select {}
}

func execute(sources []string, input []string, options languages.LanguageOptions) (string, error){
	
	languages.Init()

	return languages.StartCodeContainer(sources, input, options)
	
}

