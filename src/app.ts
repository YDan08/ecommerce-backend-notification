import amqp, { Channel, Connection } from "amqplib"
import { config } from "dotenv"
import nodemailer from "nodemailer"

config()

const transport = nodemailer.createTransport({
	host: "smtp-mail.outlook.com",
	port: 587,
	secure: false,
	auth: {
		user: `${process.env.EMAIL_NODEMAILER}`,
		pass: `${process.env.PASSWORD_NODEMAILER}`,
	},
})

const consumeMessages = async () => {
	const connection: Connection = await amqp.connect(`${process.env.RABBITMQ_SERVER}`)
	const channel: Channel = await connection.createChannel()
	await channel.assertExchange("topic_orders", "topic")
	const q = await channel.assertQueue("orderQueue")
	await channel.bindQueue(q.queue, "topic_orders", "order.placed")
	channel.consume(q.queue, msg => {
		if (msg) {
			const data = JSON.parse(msg.content.toString())
			transport.sendMail({
				from: `<${process.env.EMAIL_NODEMAILER}>`,
				to: data.email,
				subject: "Teste API Notification",
				html: `<h1>Order:${data.id}</h1><h2>Products</h2>${data.products.map(
					(product: { name: String; quantity: Number }) =>
						`<div><h4>${product.name}</h4><p>Quantity: ${product.quantity}</p></div>`
				)}`,
				text: `Order: ${data.id}`,
			})

			channel.ack(msg)
		}
	})
}

consumeMessages()
