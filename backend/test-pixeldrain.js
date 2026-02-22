async function testPixelDrain() {
    try {
        const formData = new FormData();
        const blob = new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')], { type: 'image/png' });
        formData.append('file', blob, 'test.png');

        const response = await fetch('https://pixeldrain.com/api/file', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log("PixelDrain:", data);
    } catch (e) {
        console.error(e);
    }
}
testPixelDrain();
