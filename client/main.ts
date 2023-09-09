import { Actor, Color, Engine, Keys, vec } from 'excalibur';

const game = new Engine({
    width: 600,
    height: 400
});
game.toggleDebug();
game.start();
const ws = new WebSocket('ws://localhost:9999');
ws.addEventListener('open', () => {
    console.log("Connected to Server");
    if (WebSocket.OPEN === ws.OPEN) {
        ws.send(JSON.stringify({
            message: 'hello'
        }));
    }
});

const actors = new Map<number, Actor>();

ws.addEventListener('message', (event)=> {
    const data = JSON.parse(event.data);
    if (data.type === 'frame') {
        for (let actor of data.actors) {
            if (!actors.has(actor.name)) {
                const localActor = new Actor({
                    name: actor.name,
                    color: Color.Red,
                    width: actor.dimensions.width,
                    height: actor.dimensions.height,
                    pos: vec(actor.pos.x, actor.pos.y)
                });
                actors.set(actor.name, localActor);
                game.add(localActor);
            } else {
                // TODO interpolate
                const localActor = actors.get(actor.name);
                if (localActor) {
                    localActor.pos.setTo(actor.pos.x, actor.pos.y);
                }
            }
        }
    }
});


game.input.keyboard.on('press', (ev) => {
    if (ev.key === Keys.Right) {
        ws.send(JSON.stringify({
            type: 'move',
            value: 'right'
        }))
    }
    if (ev.key === Keys.Left) {
        ws.send(JSON.stringify({
            type: 'move',
            value: 'left'
        }))
    }
    if(ev.key === Keys.Up) {
        ws.send(JSON.stringify({
            type: 'move',
            value: 'up'
        }))
    }

    if(ev.key === Keys.Down) {
        ws.send(JSON.stringify({
            type: 'move',
            value: 'down'
        }))
    }
});