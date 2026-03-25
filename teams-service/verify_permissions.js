const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const data = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
}).toString();

const options = {
    hostname: 'login.microsoftonline.com',
    port: 443,
    path: `/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
    }
};

console.log("Fetching token to verify permissions...");
const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        try {
            const responseData = JSON.parse(body);
            if(!responseData.access_token) {
                 console.log('Failed to fetch token:', body);
                 return;
            }
            
            const token = responseData.access_token;
            const payloadBase64 = token.split('.')[1];
            // Decode safely
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
            
            if (!payload.roles) {
                console.log("\n❌ FAILED: The token has NO application permissions (the 'roles' array is completely missing).");
                console.log("\nThis means Graph API will reject ANY request with a 401 Unauthorized.");
                console.log("Please check Azure Portal:");
                console.log("1. Ensure permission is added as 'Application' (not Delegated).");
                console.log("2. Ensure you clicked the 'Grant admin consent' button and it has a green checkmark.");
            } else {
                console.log(`\n✅ SUCCESS: Found Application Permissions:`, payload.roles);
                if (payload.roles.includes('Calendars.ReadWrite')) {
                    console.log("Great! You have 'Calendars.ReadWrite' correctly configured.");
                } else {
                    console.log("WARNING: You have roles, but 'Calendars.ReadWrite' is missing.");
                }
            }
        } catch(e) { console.error(e) }
    });
});
req.write(data);
req.end();
