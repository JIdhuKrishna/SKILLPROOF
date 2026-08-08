const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');

// Generate a dummy PDF file if it doesn't exist
const dummyPdfPath = path.join(__dirname, 'dummy_resume.pdf');
if (!fs.existsSync(dummyPdfPath)) {
    fs.writeFileSync(dummyPdfPath, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Dummy Resume) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000288 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n393\n%%EOF', 'utf8');
}

// Generate dummy token
const generateJWT = () => {
    // Just mock a header payload and signature for a dummy auth pass
    // if protect middleware strictly verifies it, we need a real token or to bypass it
    // Given we are hitting the real endpoint, we need a real User in the DB.
    return 'dummy-token';
};

const simulateUpload = async () => {
    try {
        // Need to create a real user to get a real token for the `protect` middleware
        const loginData = JSON.stringify({ email: 'test@example.com', password: 'password123' });

        let token;
        const loginOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': loginData.length
            }
        };

        const loginReq = http.request(loginOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const responseData = JSON.parse(data);
                token = responseData.token;

                if (!token) {
                    // Try registering instead
                    registerUser();
                } else {
                    uploadFile(token);
                }
            });
        });
        loginReq.on('error', (e) => {
            console.error('Login failed (server might not be up yet):', e.message);
        });
        loginReq.write(loginData);
        loginReq.end();

        const registerUser = () => {
            const regData = JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'password123' });
            const regOptions = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/register',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': regData.length
                }
            };
            const regReq = http.request(regOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const responseData = JSON.parse(data);
                    token = responseData.token;
                    if (token) uploadFile(token);
                    else console.error("Could not get token for test upload.");
                });
            });
            regReq.write(regData);
            regReq.end();
        }

        const uploadFile = (jwtToken) => {
            const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
            const fileContent = fs.readFileSync(dummyPdfPath);

            let postData = `--${boundary}\r\n`;
            postData += `Content-Disposition: form-data; name="resume"; filename="dummy_resume.pdf"\r\n`;
            postData += `Content-Type: application/pdf\r\n\r\n`;

            const postFooter = `\r\n--${boundary}--\r\n`;

            const reqOptions = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/upload/resume',
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Length': Buffer.byteLength(postData) + fileContent.length + Buffer.byteLength(postFooter)
                }
            };

            console.log(`Starting mock upload to http://localhost:5000/api/upload/resume... boundary: ${boundary}`);

            const req = http.request(reqOptions, (res) => {
                let chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const result = Buffer.concat(chunks).toString('utf8');
                    console.log(`\nMock Upload Status: ${res.statusCode}`);
                    console.log(`Mock Upload Response:\n${result}\n`);
                });
            });

            req.on('error', (e) => {
                console.error(`Error with upload request: ${e.message}`);
            });

            // Write multipart body
            req.write(postData);
            req.write(fileContent);
            req.write(postFooter);
            req.end();
        };

    } catch (e) {
        console.error('Test script error:', e);
    }
};

setTimeout(simulateUpload, 1000); // Wait 1 second for server to process
