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
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require('sharp');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const db = require('./model/model')

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
app.post('/postImage',upload.single('user_image'), async (req, res) => {
    console.log('req.body: ', req.body)
    console.log('req.file: ', req.file)
    // req.file.buffer = actual image & what needs to be send to S3.

    // resize image to a square
    const buffer = await sharp(req.file.buffer).resize({height: 1080, width: 1080, fit:'cover'}).toBuffer()
    
    // create post for s3 bucket and send
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `${req.body.user_id}_profile_image`,
        Body: buffer,
        ContentType: req.file.mimetype,
    })

    await s3.send(command)

    // get image url from newly created bucket entry
    const getObjectParams = {
        Bucket: bucketName,
        Key: `${req.body.user_id}_profile_image`
    }
    const urlCommand = new GetObjectCommand(getObjectParams)
    const imageUrl = await getSignedUrl(s3, urlCommand)
    console.log('imageUrl: ', imageUrl)

    // add entry to SQL data base with user_id, image_id, url
    db.query('INSERT INTO images (user_id, image_url) VALUES ($1, $2)', [req.body.user_id, imageUrl])
      .then((response) => {
        console.log('user_id and image_url successfully added to SQL: ', response)
        res.status(200).json({ message: 'Image added successfully!', imageUrl });
      })
      .catch((err) => {
        console.log('And error ocurred when adding the user_id and image_id to SQL: ', err)
        res.status(500).json({ error: 'An error occurred while adding the image.' });
    })
});

// returns the user image
app.get('/getImage', async (req, res) => {
  const { user_id } = req.body
  
  db.query('SELECT image_url FROM images WHERE user_id = $1', [user_id])
  .then((response) => {
    if (response.rows.length === 0){
        return res.status(404).json({ error: 'no image found for ', user_id})
    }
    const imageUrl = response.rows[0].image_url
    console.log('user image found: ', imageUrl)
    res.status(200).json({ imageUrl })
  })
  .catch((err) => {
    console.log('An error occurred when trying to access user image: ', err)
    res.status(500).json({ error: 'An error occurred when trying to access user image.'})
  })
});

app.listen(PORT, () => {
    console.log(`Server listening on image port: ${PORT}`)
});

module.exports = app;