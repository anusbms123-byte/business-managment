const axios = require('axios');

const url = 'https://business-managment-gamma.vercel.app/api/users';
const payload = {
    username: 'hello', // The username of the stuck user
    password: 'password123',
    email: null,
    fullName: 'hello',
    roleId: 'cmkcue3n1000p11b0seeiragb',
    companyId: 'cmkntaqig0005az3m8nkz0s3e'
};

console.log(`Testing POST ${url} with duplicate username 'hello'...`);

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
