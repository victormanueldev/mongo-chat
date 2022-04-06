const mongo = require('mongodb').MongoClient
const express = require('express')
const http = require('http')
const cors = require('cors')
const client = require('socket.io')
const url = 'mongodb://chatuser:mongo@172.20.0.2:27017/mongochat'
const optionConnect = { useNewUrlParser: true }

// Crea las instancias del servidor express.js
const app = express()
const server = http.Server(app)
const io = client(server)
app.use(cors())

// Crea el servidor y esta listo para recibir solicitudes
server.listen(4000, function() {
    console.log('Server start on port 4000!')

    //Conectar con la base de datos
    mongo.connect(url, optionConnect, function (err, db) {
        if (err) {
            throw err
        }
        console.log('MongoDB Connected...')

        // Obtiene todos los mensajes de la base de datos
        async function getChatMessages(chat) {
            const messages = await chat.find().limit(20).sort({ __id: 1 }).toArray()
            return messages
        }

        //Iniciar la conexion con el socket
        io.on('connection', function (socket) {

            // Inicia una sala publica, las salas permiten que varios clientes
            // se conecten al mismo socket y reciban los mismos eventos
            socket.join("some room");

            // Crea la variable que manejara la base de datos
            let chat = db.db('mongochat').collection('messages')

            //Funcion para enviar el estado de las peticiones
            sendStatus = function (s) {
                io.to("some room").emit('status', s)
            }

            const messages = await getChatMessages(chat)

            //Emitir todos los mensajes
            io.to("some room").emit('output', messages)

            //Canal qeu recibe los datos del cliente
            socket.on('input', function (data) {
                let name = data.name
                let message = data.message

                if (name == '' || message == '') {
                    sendStatus('Por favor envie datos');
                } else {
                    // Inserta el dato en la base de datos
                    chat.insertOne({
                        name: name,
                        message: message,
                    }, async function () {
                        // Obtiene todos los mensajes la DB
                        const allMessages = await getChatMessages(chat)
                        // Envia todos los mensajes de la DB
                        io.to("some room").emit('output', allMessages)

                        sendStatus({
                            message: 'Mensaje Enviado',
                            clear: true
                        })
                    })
                }
            })

            //Canal para limpiar todos los mensajes
            socket.on('clear', function (data) {
                chat.deleteMany({}, function () {
                    io.to("some room").emit('cleared')
                })
            })
        })
    })

   
})

