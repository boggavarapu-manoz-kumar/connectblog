async function testImgur() {
    try {
        const formData = new FormData();
        formData.append('image', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': 'Client-ID 99b380fb2b5ba66'
            }
        });

        const data = await response.json();
        console.log("Response:", data);
    } catch (e) {
        console.error(e);
    }
}
testImgur();
