const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dfqztov62',
    api_key: '178619623668134',
    api_secret: 'gqF7D2hF27q7t4d5PZ1Gz_p2nWY'
});

cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', { folder: 'connectblog' })
    .then(result => console.log('Success:', result.secure_url))
    .catch(error => console.error('Error:', error));
