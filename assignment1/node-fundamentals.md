# Node.js Fundamentals

## What is Node.js?
Answer here : In the simplest terms, Node.js is a version of Javascript that is used to run server side code, basically running Javascript code outside a web Browser.

## How does Node.js differ from running JavaScript in the browser?
Answer here : Node.js differes from Javascript in the sense that unlike Javascript in browsers, it runs API through modules instead of interacting with the Web Platform.

## What is the V8 engine, and how does Node use it?
Answer here : The V8 engine is a JavaScript Engine from google, utilizing C++ and complies Javscript before execution. 
Node uses the engine to read and understand the Javascript code to execute it.

## What are some key use cases for Node.js?
Answer here : Some key use cases for Node.js are, in the use of API's, streaming services like youtube,or apps like Discord

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**
```js
// Answer here : CommonJS are modules to package .js Code for Node.js, utilizing require, and module.exports.
// Ex. let blob = () => console.log("Blobbing");
// module.exports = blob; 
```

**ES Modules (supported in modern Node.js):**
```js
// Answer here : ES modules are used in Javascript to Import and Export modules. 
// Ex.
// export let blob = () => console.log("Blobbing");
// import { blob } from 'Above';
// blob();
``` 