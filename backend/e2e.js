const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function run() {
    const baseURL = `http://localhost:5000/api`;

    try {
        fs.writeFileSync('test_a.txt', 'hello A');
        fs.writeFileSync('test_b.txt', 'hello B');

        // Register U1 and U2
        const r1 = await axios.post(`${baseURL}/users/register`, { username: 'u1' + Date.now(), email: 'u1@t.c' + Date.now(), password: 'pas' });
        const token1 = r1.data.token;
        const u1_name = r1.data.user.username;
        const r2 = await axios.post(`${baseURL}/users/register`, { username: 'u2' + Date.now(), email: 'u2@t.c' + Date.now(), password: 'pas' });
        const token2 = r2.data.token;
        const u2_name = r2.data.user.username;

        // U1 uploads File A
        const formA = new FormData();
        formA.append('file', fs.createReadStream('test_a.txt'), { filename: 'fileA.txt' });
        const uA = await axios.post(`${baseURL}/files/upload`, formA, {
            headers: { ...formA.getHeaders(), Authorization: `Bearer ${token1}` }
        });
        const fileA_Id = uA.data.fileId;

        // U1 shares File A with U2
        await axios.post(`${baseURL}/files/${fileA_Id}/share`, { userId: u2_name }, {
            headers: { Authorization: `Bearer ${token1}` }
        });

        // U1 uploads File B
        const formB = new FormData();
        formB.append('file', fs.createReadStream('test_b.txt'), { filename: 'fileB.txt' });
        await axios.post(`${baseURL}/files/upload`, formB, {
            headers: { ...formB.getHeaders(), Authorization: `Bearer ${token1}` }
        });

        // List files for U2
        const l2 = await axios.get(`${baseURL}/files/list`, {
            headers: { Authorization: `Bearer ${token2}` }
        });

        console.log('User 2 sees:', l2.data.map(f => f.originalName));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    } finally {
        if (fs.existsSync('test_a.txt')) fs.unlinkSync('test_a.txt');
        if (fs.existsSync('test_b.txt')) fs.unlinkSync('test_b.txt');
    }
}
run();
