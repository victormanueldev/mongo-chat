const mongo = require('mongodb').MongoClient
const express = require('express')
const http = require('http')
const cors = require('cors')
const client = require('socket.io')
const url = 'mongodb://black:135790kp@ds159263.mlab.com:59263/testing'
const optionConnect = { useNewUrlParser: true }

//Instancia del express
const app = express()
const server = http.Server(app)
const io = client(server)

app.use(cors())



server.listen(4000, function() {
    console.log('Server start on port 4000!')
    //Conectar con la base de datos
    mongo.connect(url, optionConnect, function (err, db) {
        if (err) {
            throw err
        }

        console.log('MongoDB Connected...')

        //Iniciar la conexion con el socket
        io.on('connection', function (socket) {
            let chat = db.db('testing').collection('messages')

            //Funcion para enviar el estado de las peticiones
            sendStatus = function (s) {
                socket.emit('status', s)
            }

            //Obtener los mensajes de la BD
            chat.find().limit(20).sort({ __id: 1 }).toArray(function (err, res) {
                if (err) {
                    throw err
                }

                //Emitir todos los mensajes
                socket.emit('output', res)
            })

            //Canal para eventos de entrada
            socket.on('input', function (data) {
                console.log("INPUT")
                let name = data.name
                let message = data.message

                if (name == '' || message == '') {
                    sendStatus('Por favor envie datos');
                } else {
                    chat.insertOne({
                        name: name,
                        message: message,
                    }, function () {
                        socket.emit('output', [data])

                        sendStatus({
                            message: 'Mensaje Enviado',
                            clear: true
                        })
                    })
                }
            })

            socket.on('clear', function (data) {
                chat.remove({}, function () {
                    socket.emit('cleared')
                })
            })
        })
    })

   
})

