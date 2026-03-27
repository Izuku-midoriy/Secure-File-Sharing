const axios = require('axios');
const fs = require('fs');

async function run() {
    fs.writeFileSync('test2.txt', 'hello from izuku');
    try {
        const base = 'http://localhost:5000/api';

        // Register izuku (if not already) or login
        const r1 = await axios.post(`${base}/users/register`, { username: 'izukutest', email: 'izuku@e.com', password: 'password' }).catch(e => e.response);
        const t1 = r1?.data?.token || (await axios.post(`${base}/users/login`, { username: 'izukutest', password: 'password' })).data.token;

        // Upload file as izuku
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fs.createReadStream('test2.txt'));

        const uploadRes = await axios.post(`${base}/files/upload`, form, {
            headers: { ...form.getHeaders(), 'Authorization': `Bearer ${t1}` }
        });

        const fileId = uploadRes.data.fileId;
        console.log('Uploaded File ID:', fileId);

        // Now login as shoto BEFORE sharing
        const r2 = await axios.post(`${base}/users/register`, { username: 'shoto', email: 'shoto@e.com', password: 'password' }).catch(e => e.response);
        const t2 = r2?.data?.token || (await axios.post(`${base}/users/login`, { username: 'shoto', password: 'password' })).data.token;

        // Try to create temporary link as izuku
        try {
            const tempRes = await axios.post(`${base}/files/${fileId}/temporary-link`, {
                expiresInHours: 24,
                maxDownloads: 5,
                password: ''
            }, {
                headers: { 'Authorization': `Bearer ${t1}` }
            });
            console.log('Temporary link success:', tempRes.data);
        } catch (err) {
            console.error('Temporary link error:', err.response?.data || err.message);
        }

        // Try to share as izuku to shoto
        try {
            const shareRes = await axios.post(`${base}/files/${fileId}/share`, { userId: 'shoto', expiresInHours: 24 }, {
                headers: { 'Authorization': `Bearer ${t1}` }
            });
            console.log('Share success:', shareRes.data);

            // Try to generate token as kunal
            try {
                const tokenRes = await axios.post(`${base}/files/${fileId}/token`, {}, {
                    headers: { 'Authorization': `Bearer ${t2}` }
                });
                console.log('Token generation successful:', tokenRes.data);
            } catch (tokenErr) {
                console.error('Token generation failed:', tokenErr.response?.data || tokenErr.message);
            }

        } catch (err) {
            console.error('Share error:', err.response?.data || err.message);
        }

    } catch (e) {
        console.error(e.message);
    }
}
run();
