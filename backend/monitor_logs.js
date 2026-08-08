const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'backend_log.txt');
let lastReadPosition = 0;

console.log("Starting Real-Time Log Monitor... (Monitoring backend_log.txt)");

const checkLogs = () => {
    if (!fs.existsSync(logFile)) return;

    const stats = fs.statSync(logFile);
    if (stats.size > lastReadPosition) {
        const stream = fs.createReadStream(logFile, {
            encoding: 'utf8',
            start: lastReadPosition,
            end: stats.size - 1
        });

        stream.on('data', (chunk) => {
            process.stdout.write(chunk);
        });

        stream.on('end', () => {
            lastReadPosition = stats.size;
        });
    } else if (stats.size < lastReadPosition) {
        // File was truncated or rotated
        lastReadPosition = 0;
    }
};

// Check every 500ms
setInterval(checkLogs, 500);
