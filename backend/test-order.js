

(async () => {
    try {
        const loginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
        });
        let loginData = await loginRes.json();
        let token = loginData.token;

        if (!token) {
            const regRes = await fetch('http://localhost:3001/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'password123' })
            });
            const regData = await regRes.json();
            token = regData.token;
        }

        if (token) {
            console.log('Got token, creating order...');
            const res = await fetch('http://localhost:3001/api/payment/create-order', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ movieId: '699eeca5609cb8b9a0df3d39' }) 
            });
            console.log(res.status, await res.json());
        }
    } catch (err) {
        console.error(err);
    }
})();
