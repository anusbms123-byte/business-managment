const axios = require('axios');

const url = 'https://businessdevelopment-nine.vercel.app/api/users';
const payload = {
    username: 'test_verify_endpoint_' + Date.now(),
    password: 'password123',
    email: 'test@example.com',
    fullName: 'Test Verify Endpoint',
    roleId: 'cmkcue3n1000p11b0seeiragb', // Admin Role ID from previous logs
    companyId: 'cmkntaqig0005az3m8nkz0s3e' // Company ID from previous logs
};

console.log(`Testing POST ${url}...`);

axios.post(url, payload)
    .then(res => {
        console.log("Response Status:", res.status);
        console.log("Response Data:", res.data);
    })
    .catch(err => {
        if (err.response) {
            console.error("Error Response Status:", err.response.status);
            console.error("Error Response Data:", err.response.data);
        } else {
            console.error("Error:", err.message);
        }
    });
