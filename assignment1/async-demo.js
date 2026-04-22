const fs = require('fs');
const path = require('path');


// Write a sample file for demonstration

// 1. Callback style
const dirPath = path.join(__dirname, 'sample-files');
const filePath = path.join(dirPath, 'sample.txt');

if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
}
fs.writeFileSync(filePath, 'Hello, async world!');

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) throw err;
    console.log('Callback read:', data);
// Callback hell example (test and leave it in comments):
// An example of a call back Hell would be when there are multiple call backs without a promise

// getName(first, (main) => {
//   getMain(main, (miner) => {
//     getCave(miner, (caveData) => {
//       console.log("Mina is mining:",cavaData);
//     })
//   })
// })

  // 2. Promise style
fs.promises.readFile(filePath, 'utf8')
      .then((data) => {
        console.log('Promise read:', data);
        runAsyncRead();
        })
  .catch((err) => console.error(err));
});

      // 3. Async/Await style
async function runAsyncRead() {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        console.log('Async/Await read:', data);
    } catch (err) {
        console.error('Error in async/await:', err);
    }
}