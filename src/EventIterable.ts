import { EventEmitter } from "events";

import { Mutex } from "semasync";

export class EventIterable implements AsyncIterable<{eventName:string|symbol, value:any}> {

    #abortHandler:(()=>void)|undefined;
    #eventEmitter:EventEmitter;
    #eventNames:(string|symbol)[];
    #privateEmitter:EventEmitter = new EventEmitter();
    #signal:AbortSignal|undefined;

    public constructor( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[] );
    public constructor( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[], signal:AbortSignal );
    public constructor( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[], signal?:AbortSignal ) {
        this.#signal = signal;
        this.#eventEmitter = eventEmitter;
        this.#eventNames = Array.isArray(eventNames) ? eventNames : [ eventNames ];

        if(this.#signal?.aborted===false ) {
            this.#abortHandler = this.stop.bind(this);
            this.#signal.addEventListener( "abort", this.#abortHandler );
        }
        
    }

    public async* [Symbol.asyncIterator](): AsyncIterator<any, any, undefined> {
        const mutex:Mutex = new Mutex();
        const queue:{ eventName:string|symbol, value?:any }[] = [];
        let running:boolean = this.#signal ? this.#signal.aborted===false : true;

        const handlers:{ [type:string|symbol]:(...value:any[])=>unknown } = {};

        for( const eventName of this.#eventNames ) {
            handlers[eventName] = handler
            this.#eventEmitter.addListener( eventName, handler );
            function handler( ...args:any[] ) {
                queue.push( { eventName, value:args.length<=1?args[0]:args } );
                if( mutex.waiting ) {
                    mutex.release();
                }
            }
        }
        this.#privateEmitter.on( "stop", onStop );

        await mutex.acquire();
        while( running ) {
            if( queue.length===0 ) {
                await mutex.acquire();
            } else {
                const evt = queue.shift();
                yield evt;
            }
        }
        mutex.release();

        this.#privateEmitter.removeListener( "stop", onStop );
        for( const [ eventName, handler ] of Object.entries( handlers ) ) {
            this.#eventEmitter.removeListener( eventName, handler );
        }

        function onStop() {
            running = false;
            if( mutex.waiting ) {
                mutex.release();
            }
        }
    }

    public stop() {
        if( this.#signal?.aborted===true && this.#abortHandler ) {
            this.#signal!.removeEventListener( "abort", this.#abortHandler );
            this.#abortHandler = undefined;
        }
        this.#privateEmitter.emit( "stop" );
    }

}