- [Class:EventIterable](#classeventiterable)
  - [EventIterable.wrap( eventEmitter, eventNames[, signal ] )](#eventiterablewrap-eventemitter-eventnames-signal)
  - [eventIterable.stop()](#eventiterablestop)

# Class:EventIterable

```javascript
const { EventIterable } = require( "eventIterable" );
```
```javascript
import { EventIterable } from "eventIterable";
```

EventIterable is a wrapper for [EventEmitter](https://nodejs.org/api/events.html#class-eventemitter), creating an AsyncIterable of the requested events which the user can, in an [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) context, iterate through using a [for await ... of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of) statement.  When being iterated over, EventIterable produces objects of type: <code language="typescript">{ eventName:string|symbol, value:any }</code> where eventName is one of the eventNames provided in the [wrap](#eventiterablewrap-eventemitter-eventnames-signal) function.

## EventIterable.wrap( eventEmitter, eventNames[, signal ] )
- **eventEmitter** <code>&lt;EventEmitter&gt;</code> the event emitter being wrapped
- **eventNames** <code>&lt;string&gt;</code> | <code>&lt;symbol&gt;</code> | <code>&lt;(string|symbol)[]&gt;</code> the event names to be captured
- **signal** <code>&lt;AbortSignal&gt;</code> optional signal from an AbortController to signal the EventIterable to stop as an alternative to eventIterable.stop()
- Returns <code>&lt;EventIterable&gt;</code>


## eventIterable.stop()
The stop function causes the EventIterable to stop handling events and exit its generator function.

<br />
<br />

# Example

An example of using event-iterable to wrap an EventEmitter and use it as an AsyncIterable.  The EventEmitter in this example alternates between two types of messages, "tick" and "tock" accompanied by a date object, which are emitted at a variable, random interval between 0 and 2 seconds.  The example also shows how to use an AbortController (provided by the [node-abort-controller](https://www.npmjs.com/package/node-abort-controller) package) to stop it, the non-controller version is simply the .stop() method.

```javascript
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
```