async function testImgbb() {
    try {
        const formData = new FormData();
        formData.append('image', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

        const response = await fetch('https://api.imgbb.com/1/upload?key=0df4821a73dd70624bc5dc90ebcb7e8e', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log("ImgBB Return:", data);
    } catch (e) {
        console.error(e);
    }
}
testImgbb();
