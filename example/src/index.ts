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