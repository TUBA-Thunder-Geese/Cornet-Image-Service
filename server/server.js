/*
Post = user ID & Image File
Get = user ID

Both will return the image file

https://medium.com/@edsin.delikumar/node-js-with-aws-sdk-integrating-s3-bucket-in-express-7f203c0f8c87
https://www.youtube.com/watch?v=eQAIojcArRY&t=1230s
*/
const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const PORT = 3003;
const app = express();

dotenv.config()

// S3 access credentials
const bucketName = process.env.BUCKET_NAME
const bucketRegion= process.env.BUCKET_REGION
const accessKey= process.env.ACCESS_KEY
const secretAccessKey= process.env.SECRET_ACCESS_KEY


// creating an S3Client class with access credentials
const s3 = new S3Client({
    credentials: {
      accessKeyID: accessKey,
      secretAccessKey: secretAccessKey,
    },
    region: bucketRegion
})

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

// Saves the user image to the S3 bucket
app.post('/',upload.single('user_image'), async (req, res) => {
    console.log('req.body: ', req.body)
    console.log('req.file: ', req.file)
    // req.file.buffer = actual image & what needs to be send to S3.

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
    })

    await s3.send(command)

});

// returns the user image
app.get('/');

app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`)
});

module.exports = app;