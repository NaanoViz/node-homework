const os = require('os');
const path = require('path');
const fs = require('fs');
const { create } = require('domain');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log('Platform:', os.platform())
console.log('CPU:', os.cpus()[0].model);
console.log('Total Memory:', os.totalmem());

// Path module
const joinedPath = path.join('/path', 'to', 'sample-files', 'folder', 'file.txt');
console.log('Joined path:', joinedPath);


// fs.promises API
async function fsPromises(){
  const demoTxt = path.join(sampleFilesDir, 'demo.txt');
  await fs.promises.writeFile(demoTxt, 'Hello from fs.promises!');
  const readItem = await fs.promises.readFile(demoTxt, 'utf8');
  console.log('fs.promises read:', readItem);

  largeFileStreaming();
}


// Streams for large files- log first 40 chars of each chunk
function largeFileStreaming() {
  const largeFilePath = path.join(sampleFilesDir, 'largefile.txt');

  const createStream = fs.createWriteStream(largeFilePath);
  for (let i = 0; i < 100; i++) {
    createStream.write(`This is a line in a large file...`)
  }
  createStream.end();

  createStream.on('finish', () => {
    const reading = fs.createReadStream(largeFilePath, {
      encoding:'utf8',
      highWaterMark: 1028
    });

    reading.on('data', (chunk) => {
      console.log(`Read chunk:`, chunk.substring(0,40));

    });

    reading.on('end', () => {
      console.log(`Finished reading large file with streams.`);
    });

  });

}

fsPromises();