const http = require('http');
const express = require('express');
const { Server : SocketServer } = require('socket.io');
const fs = require('fs/promises');
const path = require('path');

const pty = require('node-pty');
const cors = require('cors');
const chokidar = require('chokidar');

const ptyProcess = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.INIT_CWD + '/user',
    env: process.env
});

const app = express();
const server = http.createServer(app);
const io = new SocketServer({
    cors: '*'
});

app.use(cors());

io.attach(server);

chokidar.watch('./user').on('all', (event, path) => {
    io.emit('file:refresh', path);
});

ptyProcess.onData(data => {
    io.emit('terminal:data', data);
});
io.on('connection', (socket) => {
    console.log('🚀 New client connected', socket.id);

    socket.emit('file:refresh');

    socket.on('file:change', async ({path, content}) => {
        await fs.writeFile(`./user/${path}`, content);
    });    
    socket.on('terminal:write', (data)=>{
        ptyProcess.write(data);
    })
});

app.get('/files', async (req, res) => {
    const fileTree = await generateFileTree('./user');
    return res.json({tree : fileTree});
});

app.get('/files/content', async (req, res) => {
    const { path } = req.query.path;
    const content = await fs.readFile(`./user/${path}`, 'utf-8');
    return res.json({content});
});

server.listen(9000, () => {
    console.log('🐳 Docker Server is running on port 9000');
});

async function generateFileTree(directory) { 
    const tree = {};

    async function buildTree(currentDir, currentTree) { 
        const files = await fs.readdir(currentDir);

        for(const file of files) { 
            const filePath = path.join(currentDir, file);
            const stats = await fs.stat(filePath);

            if(stats.isDirectory()) { 
                currentTree[file] = {};
                await buildTree(filePath, currentTree[file]);
            } else { 
                currentTree[file] = null;
            }
        }
    }

    await buildTree(directory, tree);
    return tree;
}