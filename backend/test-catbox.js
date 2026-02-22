async function testUpload() {
    try {
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');

        // Simple 1x1 base64 png buffer
        const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });

        formData.append('fileToUpload', blob, 'test.png');

        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        console.log("Catbox Output URL: ", text);
    } catch (e) {
        console.error(e);
    }
}
testUpload();
