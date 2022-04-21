import { EventEmitter } from "events";

import { Mutex } from "semasync";

export class EventIterable implements AsyncIterable<{eventName:string|symbol, value:any|any[]}> {

    #abortController:AbortController|undefined;
    #emitter:EventEmitter;
    #eventNames:(string|symbol)[];
    #internalEmitter:EventEmitter = new EventEmitter();

    public constructor( ee:EventEmitter, eventName:string|symbol );
    public constructor( ee:EventEmitter, eventName:string|symbol, abortController:AbortController );
    public constructor( ee:EventEmitter, eventNames:(string|symbol)[] );
    public constructor( ee:EventEmitter, eventNames:(string|symbol)[], abortController:AbortController );
    public constructor( ee:EventEmitter, eventNames:string|symbol|(string|symbol)[], abortController?:AbortController ) {
        this.#abortController = abortController;
        this.#emitter = ee;
        this.#eventNames = Array.isArray(eventNames) ? eventNames : [ eventNames ];

        this.stop.bind( this );

        if(this.#abortController?.signal.aborted===false ) {
            const abortHandler = () => {
                this.#abortController?.signal.removeEventListener( "abort", abortHandler );
                this.stop();
            }
            this.#abortController?.signal.addEventListener( "abort", abortHandler );
        }
        
    }

    public async* [Symbol.asyncIterator](): AsyncIterator<any, any, undefined> {
        const mutex:Mutex = new Mutex();
        const queue:{ eventName:string|symbol, value?:any}[] = [];
        let running:boolean = this.#abortController ? !this.#abortController.signal.aborted : true;

        const handlers:{ [type:string|symbol]:(...value:any[])=>unknown } = {};

        this.#eventNames.forEach( eventName => {
            handlers[eventName] = ( ...args:any[] ) => {
                queue.push( { eventName, value:args.length<=1?args[0]:args } );
                if( mutex.waiting ) {
                    mutex.release();
                }
            };
            this.#emitter.addListener( eventName, handlers[ eventName ] );
        } );
        this.#internalEmitter.on( "stop", onStop );

        await mutex.acquire();
        while( running ) {
            if( queue.length===0 ) {
                 await mutex.acquire();
            } else {
                const evt = queue.shift();
                yield evt;
            }
        }

        this.#internalEmitter.removeListener( "stop", onStop );
        Object.entries( handlers ).forEach( ( [ eventName, handler ] ) => this.#emitter.removeListener( eventName, handler ) );

        function onStop() {
            running = false;
            if( mutex.waiting ) {
                mutex.release();
            }
        }
    }

    public stop() {
        this.#internalEmitter.emit( "stop" );
    }

}