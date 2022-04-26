# event-iterable

An example of using event-iterable to wrap and event emitter and use it as an AsyncIterable.  Also shows how to use an AbortController to stop it.

```
const { EventEmitter } = require( "events" );

const { AbortController } = require( "node-abort-controller" );

const { EventIterable } = require( "event-iterable" );

class TimerEventEmitter extends EventEmitter {

    #tick = false;
    #timeout = undefined;

    constructor() {
        super();
        this.ticktock();
    }

    ticktock() {
        this.#tick = !this.#tick;
        this.emit( this.#tick?"tick":"tock", new Date() );
        this.#timeout = setTimeout( this.ticktock.bind( this ), Math.random()*2000 );
    }

    stop() {
        clearTimeout( this.#timeout );
    }
}

( async function main() {
    const ee = new TimerEventEmitter();
    // ee.on( "tick", console.log );
    // ee.on( "tock", console.log );

    const abortController = new AbortController();
    const est = new EventIterable( ee, ["tick", "tock"], abortController );
    setTimeout( abortController.abort.bind(abortController), 10000 );
    abortController.signal.addEventListener( "abort", ee.stop.bind(ee) );
    for await ( const event of est ) {
        console.log( event );
    }
} )();
```