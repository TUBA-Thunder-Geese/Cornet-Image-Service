/*
Post = user ID & Image File
Get = user ID

Both will return the image file

https://medium.com/@edsin.delikumar/node-js-with-aws-sdk-integrating-s3-bucket-in-express-7f203c0f8c87
*/

const { S3Client } = require('@aws-sdk/client-s3');
const express = require('express');
const multer = require('multer');
const { Readable } = reuire('stream');

const PORT = 3003;
const app = express();

const s3Client = new S3Client({
    region:,
    credentials: {
        accessKeyID:,
        secretAccessKey:
    },
});

const upload = multer({ dest: '/' });

    // Define a route to handle file uploads
app.post('/',upload.single('file'), async (req, res) => {
    const fileStream = Readable.from(req.file.buffer);

    const params = {
        Bucket: 'YOUR_S3_BUCKET_NAME',
        Key: req.file.originalname,
        Body: fileStream,
      };
    
      try {
        await s3Client.send(new PutObjectCommand(params));
        console.log('File uploaded successfully');
        res.status(200).send('File uploaded');
      } catch (err) {
        console.error(err);
        res.status(500).send('Failed to upload file');
      }
});

app.get('/');

app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`)
});

module.exports = app;