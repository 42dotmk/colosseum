package main

import (
	"colosseum/languages"
	"encoding/json"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

type RabbitMQConn struct {
	Conn *amqp.Connection
	Channel *amqp.Channel
}

type ExecutionRequestContract struct {
	Sources []languages.File `json:"sources"`
	Input []languages.File	`json:"input"`
	Options languages.LanguageOptions `json:"options"`
	Metadata Metadata `json:"metadata"`
}

type Response struct{
	Result []languages.ExecutionResult `json:"result"`
	Metadata Metadata `json:"metadata"`
}
type Metadata struct {
	SubmissionId int `json:"submissionId"`
}

func NewRabbitMQ() (*RabbitMQConn, error){
	conn,err := amqp.Dial("amqp://guest:guest@localhost:5672")
	if err != nil {
		return nil, fmt.Errorf("Failed to connect to RabbitMQ: %s", err)
	}
	fmt.Println("Connected to RabbitMQ")

	ch, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("Failed to open a channel: %s", err)
	}
	return &RabbitMQConn{
		Conn: conn,
		Channel: ch,
	}, nil
}

func (r *RabbitMQConn) QueueDeclare(queueName string) error{
	_, err := r.Channel.QueueDeclare(
		queueName, 
		true,      
		false,     
		false,     
		false,
		nil,       
	)
	if err != nil {
		return fmt.Errorf("Failed to declare the queue: %s", err)
	}
	fmt.Println("Queue declared")
	return nil
}

func (r *RabbitMQConn) Publish(queueName string, message []byte) error{
	err := r.Channel.Publish(
		"",
		queueName,
		false,
		false,
		amqp.Publishing{
		ContentType: "application/text",	
		Body: message},
	)
	if err != nil {
		return fmt.Errorf("Failed to publish message: %s", err)
	}

	return nil
}

func main(){
	rabbit, err := NewRabbitMQ()
	if err != nil {
		fmt.Errorf("Failed to connect to RabbitMQ: %s", err)
	}

	err = rabbit.QueueDeclare("execution")
	if err != nil {
		fmt.Errorf("Failed to declare the queue: %s", err)
	}
	
	msgs, err := rabbit.Channel.Consume("execution", "", false, false, false, false, nil)
	fmt.Println("Channel opened")
	for d := range msgs {

	go func(msg amqp.Delivery){  
		var request ExecutionRequestContract
		err := json.Unmarshal(d.Body, &request)
		if err != nil {
			fmt.Println("Failed to unmarshal the request")
		}

		result, err := execute(request.Sources, request.Input, request.Options)
		if err != nil {
			fmt.Println("Failed to execute the code")
		}

		response := Response{
			Result: result,
			Metadata: request.Metadata,
		}

		responseBytes, err := json.Marshal(response)
		if err != nil {
			fmt.Println("Failed to marshal the response")
		}

		err = rabbit.Publish("result", responseBytes)
		if err != nil {
			fmt.Println("Failed to publish the response")
		}
		d.Ack(false)
	}(d)
	select{}
	}
}

func execute(sources []languages.File, input []languages.File, options languages.LanguageOptions) ([]languages.ExecutionResult, error){
	
	languages.Init()

	return languages.StartCodeContainer(sources, input, options)
	
}

