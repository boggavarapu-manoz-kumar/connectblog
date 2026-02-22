async function run() {
    try {
        console.log("Registering user 1...");
        let user1Res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser_' + Date.now(),
                email: 'test' + Date.now() + '@example.com',
                password: 'password123'
            })
        });
        let user1Data = await user1Res.json();
        let token1 = user1Data.token;
        let id1 = user1Data._id;
        console.log("User 1 registered:", id1);

        console.log("Registering user 2...");
        let user2Res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser2_' + Date.now(),
                email: 'test2' + Date.now() + '@example.com',
                password: 'password123'
            })
        });
        let user2Data = await user2Res.json();
        let token2 = user2Data.token;
        let id2 = user2Data._id;
        console.log("User 2 registered:", id2);

        console.log("User 1 creating post...");
        let postRes = await fetch('http://localhost:5000/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token1 },
            body: JSON.stringify({ title: 'Hello', content: 'World' })
        });
        let postData = await postRes.json();
        let postId = postData._id;
        console.log("Post created:", postId);

        console.log("User 2 following User 1...");
        let followRes = await fetch(`http://localhost:5000/api/users/${id1}/follow`, { method: 'PUT', headers: { Authorization: 'Bearer ' + token2 } });
        console.log("Follow response status:", followRes.status, await followRes.text());

        console.log("User 2 liking Post...");
        let likeRes = await fetch(`http://localhost:5000/api/posts/${postId}/like`, { method: 'PUT', headers: { Authorization: 'Bearer ' + token2 } });
        console.log("Like response status:", likeRes.status, await likeRes.text());

        console.log("User 2 unfollowing User 1...");
        let unfollowRes = await fetch(`http://localhost:5000/api/users/${id1}/unfollow`, { method: 'PUT', headers: { Authorization: 'Bearer ' + token2 } });
        console.log("Unfollow response status:", unfollowRes.status, await unfollowRes.text());

        console.log("User 2 unliking Post...");
        let unlikeRes = await fetch(`http://localhost:5000/api/posts/${postId}/unlike`, { method: 'PUT', headers: { Authorization: 'Bearer ' + token2 } });
        console.log("Unlike response status:", unlikeRes.status, await unlikeRes.text());

    } catch (e) {
        console.error("Test failed:", e.message);
    }
}
run();
