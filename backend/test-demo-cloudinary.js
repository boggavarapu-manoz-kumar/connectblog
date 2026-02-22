async function testUnsigned() {
    try {
        const formData = new FormData();
        formData.append('file', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
        formData.append('upload_preset', 'docs_upload_example_us_preset');

        const response = await fetch('https://api.cloudinary.com/v1_1/demo/image/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log(data);
    } catch (e) {
        console.error(e);
    }
}
testUnsigned();
