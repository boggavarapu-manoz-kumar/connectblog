async function test() {
    console.time("multipart");
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
    formData.append('action', 'upload');
    formData.append('format', 'json');
    formData.append('source', blob, 'test.png');

    try {
        const response = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.timeEnd("multipart");
        console.log(data.image.url);
    } catch (e) { console.error(e); }
}
test();
