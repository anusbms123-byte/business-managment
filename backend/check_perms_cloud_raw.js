const axios = require('axios');

const CLOUD_URL = 'https://businessdevelopment-nine.vercel.app/api';
const ROLE_ID = 'cmlrp2wph000hlabmg2w0srt1';

async function checkCloudPermissionsRaw() {
    console.log(`Checking RAW Role Data for ID: ${ROLE_ID}...`);

    try {
        const response = await axios.get(`${CLOUD_URL}/roles/${ROLE_ID}`);
        console.log("Response Data:");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.log("Status:", error.response.status, error.response.data);
    }
}

checkCloudPermissionsRaw();
