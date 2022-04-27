import { EventEmitter } from "events";

import { Mutex } from "semasync";


/**
 * @classdesc A wrapper for EventEmitter, creating an AsyncIterable of the requested events which
 * the user can, in an async context, iterate through using a for-await-of statement.  When being
 * iterated over, EventIterable produces objects of type: { eventName:string|symbol, value:any } where
 * eventName is one of the eventNames provided in the {@link wrap} function.
 * @class
 * @hideconstructor
 */
export class EventIterable implements AsyncIterable<{eventName:string|symbol, value:any}> {

    #abortHandler:(()=>void)|undefined;
    #eventEmitter:EventEmitter;
    #eventNames:(string|symbol)[];
    #privateEmitter:EventEmitter = new EventEmitter();
    #signal:AbortSignal|undefined;

    /**
     * Create an EventIterable
     * 
     * @param {EventEmitter} eventEmitter the event emitter being wrapped
     * @param {string|symbol|(string|symbol)[]} eventNames the event names to be captured
     * @param {AbortSignal} [signal] (optional) signal from an AbortController to signal the EventIterable to stop as an alternative to eventIterable.stop()
     */
    private constructor( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[] );
    private constructor( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[], signal:AbortSignal );
    private constructor( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[], signal?:AbortSignal ) {
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


    /**
     * Signal the EventIterable to stop handling events and exit its generator function.
     */
    public stop():void {
        if( this.#signal?.aborted===true && this.#abortHandler ) {
            this.#signal!.removeEventListener( "abort", this.#abortHandler );
            this.#abortHandler = undefined;
        }
        this.#privateEmitter.emit( "stop" );
    }

    /**
     * Wraps an EventEmitter into an EventIterable.
     * 
     * @param {EventEmitter} eventEmitter the event emitter being wrapped
     * @param {string|symbol|(string|symbol)[]} eventNames the event names to be captured
     * @param {AbortSignal} [signal] (optional) signal from an AbortController to signal the EventIterable to stop as an alternative to eventIterable.stop()
     * @returns {EventIterable} {@link EventIterable}
     */
    public static wrap( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[] ):EventIterable;
    public static wrap( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[], signal:AbortSignal ):EventIterable;
    public static wrap( eventEmitter:EventEmitter, eventNames:string|symbol|(string|symbol)[], signal?:AbortSignal ):EventIterable {
        return new EventIterable( eventEmitter, eventNames, signal! );
    }

}