const axios = require('axios');
const fs = require('fs');

async function run() {
    fs.writeFileSync('test.txt', 'hello world');
    try {
        const base = 'http://localhost:5000/api';

        // Register u1
        const r1 = await axios.post(`${base}/users/register`, { username: 'u111', email: 'u111@e.com', password: 'password' }).catch(e => e.response);
        const t1 = r1?.data?.token || (await axios.post(`${base}/users/login`, { username: 'u111', password: 'password' })).data.token;

        // Register u2
        const r2 = await axios.post(`${base}/users/register`, { username: 'u222', email: 'u222@e.com', password: 'password' }).catch(e => e.response);
        const t2 = r2?.data?.token || (await axios.post(`${base}/users/login`, { username: 'u222', password: 'password' })).data.token;

        // Upload file as u1
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fs.createReadStream('test.txt'));

        await axios.post(`${base}/files/upload`, form, {
            headers: { ...form.getHeaders(), 'Authorization': `Bearer ${t1}` }
        });

        // Check list as u1
        const list1 = await axios.get(`${base}/files/list`, { headers: { 'Authorization': `Bearer ${t1}` } });
        console.log('u1 files:', list1.data.map(f => f.originalName));

        // Check list as u2
        const list2 = await axios.get(`${base}/files/list`, { headers: { 'Authorization': `Bearer ${t2}` } });
        console.log('u2 files:', list2.data.map(f => f.originalName));

    } catch (e) {
        console.error(e.message);
    }
}
run();
