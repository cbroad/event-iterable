import { EventEmitter } from "events";

import { AbortController } from "node-abort-controller";

import { EventIterable } from "event-iterable";


class TimerEventEmitter extends EventEmitter {

    #tick:boolean = false;
    #timeout:NodeJS.Timeout|undefined;

    constructor() {
        super();
        this.ticktock();
    }

    ticktock():void {
        this.#tick = !this.#tick;
        this.emit( this.#tick?"tick":"tock", new Date() );
        this.#timeout = setTimeout( this.ticktock.bind( this ), Math.random()*2000 );
    }

    stop():void {
        clearTimeout( this.#timeout! );
    }
}

( async function main():Promise<void> {
    const eventEmitter = new TimerEventEmitter();
    // eventEmitter.on( "tick", console.log );
    // eventEmitter.on( "tock", console.log );

    // After 10 seconds, we'll abort using the Abort Controller
    const abortController = new AbortController();
    setTimeout( () => abortController.abort(), 10000 );

    const iterable = EventIterable.wrap( eventEmitter, ["tick", "tock"], abortController.signal );
    for await ( const event of iterable ) {
        console.log( event );
    }
    eventEmitter.stop();
} )();