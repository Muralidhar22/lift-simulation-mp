import { DEFAULT_FLOORS, DEFAULT_LIFTS } from "./lift-simulation.js"
import * as http from 'http';
import { Server } from "socket.io";
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server)
let clientCount = 0;

app.use(express.static(`${__dirname}/../client`));


const newConnection = () => {
        io.emit('newClient',"new client joined...")
        io.emit('liftGenerator',[DEFAULT_FLOORS, DEFAULT_LIFTS]) // if new client joins generate new lift simulation with default values for all
}

io.on('connection',(sock) => {
    clientCount++;
    sock.on('newClient',(text) => {
            newConnection()
    })
    sock.on('liftGenerator',(event) => {  //listening if any of the clients pressed generate
        io.emit('liftGenerator',event)
    })
    sock.on('liftCall',(data) => {
        io.emit('liftCall',data)
    })

    io.emit('clientCountUpdate',clientCount)
  
    sock.on('disconnect',()=>{
        clientCount--;
        io.emit('clientCountUpdate',clientCount)
    })
    
})

// errror handling server
server.on('error',(err) => {
    console.error(err)
})
// port
server.listen(8080,() => {
    console.log('server is ready')
})
