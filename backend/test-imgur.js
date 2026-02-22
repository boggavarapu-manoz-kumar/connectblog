

async function testUpload() {
    try {
        const formData = new URLSearchParams();
        // A minimal valid 1x1 base64 png
        formData.append('image', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

        const response = await fetch('https://api.imgbb.com/1/upload?key=67fbb2ec10be133dcff2ed1895a0dd04', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log(data);
    } catch (e) {
        console.error(e);
    }
}
testUpload();
