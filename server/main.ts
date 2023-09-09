import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import * as fs from 'fs';
import * as url from 'url';
import * as path from 'path';

import { Actor, CollisionSystem, CollisionType, MotionSystem, Physics, PointerScope, PointerSystem, Scene, SystemType, vec } from 'excalibur';

const server = createServer(async (req, res) => {
  // https://stackoverflow.com/a/29046869/839595
  console.log(`${req.method} ${req.url}`);

  // parse URL
  const parsedUrl = url.parse(req.url ?? '/index.html');
  // extract URL path
  let pathname = `./dist${parsedUrl.pathname}`;
  // based on the URL path, extract the file extension. e.g. .js, .doc, ...
  const ext = path.parse(pathname).ext || '.html';
  
  // maps file extension to MIME typere
  const map = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword'
  };

  fs.exists(pathname, function (exist) {
    if(!exist) {
      // if the file is not found, return 404
      res.statusCode = 404;
      res.end(`File ${pathname} not found!`);
      return;
    }

    // if is a directory search for index file matching the extension
    if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

    // read file from file system
    fs.readFile(pathname, function(err, data){
      if(err){
        res.statusCode = 500;
        res.end(`Error getting the file: ${err}.`);
      } else {
        // if the file is found, set Content-type and send data
        res.setHeader('Content-type', (map as any)[ext] ?? 'text/plain' );
        res.end(data);
      }
    });
  });

});

Physics.gravity = vec(0, 200);
const scene = new Scene();
scene.world.clearSystems();
scene.world.add(new MotionSystem());
scene.world.add(new CollisionSystem(scene.physics));

// add floor
scene.add(new Actor({
    pos: vec(300, 400),
    width: 600,
    height: 20,
    collisionType: CollisionType.Fixed
}));

const wss = new WebSocketServer({ server });

const clientMap = new Map<WebSocket, number>();
let _ID = 0;

wss.on('connection', (ws, request) => {
    if (ws.readyState === WebSocket.OPEN) {
        const id = _ID++;
        clientMap.set(ws, id);
        scene.add(new Actor({
            name: id.toString(),
            pos: vec(200, 200),
            width: 100,
            height: 100,
            collisionType: CollisionType.Active
        }));

        ws.on('error', console.error);
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'move') {
                const id = clientMap.get(ws);
                console.log('id:', id, message);
                if (id !== undefined) {
                    const actor = scene.world.entityManager.getByName(id.toString())[0] as Actor;
                    if (message.value === 'right') {
                        actor.vel.x = 100
                    }
                    if (message.value === 'left') {
                        actor.vel.x = -100;
                    }
                    if (message.value === 'up') {
                        actor.vel.y = -100;
                    }
                    if (message.value === 'down') {
                        actor.vel.y = 100;
                    }
                }
            }
        });
        ws.send(JSON.stringify({msg: 'hello from server'}));
        ws.send(JSON.stringify({
            type: 'init',
            id
        }));
    }
});

server.listen(9999);

// Server mainloop
setInterval(() => {
    scene.world.update(SystemType.Update, 30);
    for (let [ws] of clientMap.entries()) {
        ws.send(JSON.stringify({
            type: 'frame',
            actors: scene.actors.map(a => ({
                name: a.name,
                dimensions: {width: a.width, height: a.height},
                pos: {x: a.pos.x, y: a.pos.y}}
            ))
        }));
    }
}, 30); // 30 fps server update