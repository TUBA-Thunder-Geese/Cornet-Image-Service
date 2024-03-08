
const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require('sharp');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const db = require('./model/model')
const cors = require('cors')
const promClient = require('prom-client');
const { httpRequestDurationMicroseconds, syntaxErrorsCounter } = require('./metrics/prometheus_methods');

const db_local = require('./model/model_local')

// accessing image file
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
upload.single('image');

require('dotenv').config()

const PORT = 3003;
const app = express();
app.use(express.json())

app.use(cors())

app.get('/setup', async (req, res) => {
  try {
    await db_local.query(`CREATE TABLE images (
      user_id INT UNIQUE NOT NULL,
      image_url VARCHAR(1000) UNIQUE NOT NULL
     
      );`);

    res.status(200).json({ message: 'successfully created database table "images"' })
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
})




const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const accessKey = process.env.ACCESS_KEY
const secretAccessKey = process.env.SECRET_ACCESS_KEY


const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion
})



// Saves the user image to the S3 bucket
app.post('/postImage', upload.single('image'), async (req, res) => {
  console.log('req.body: ', req.body)
  console.log('req.file: ', req.file)

  // resize image to a square
  const buffer = await sharp(req.file.buffer).resize({ height: 1080, width: 1080, fit: 'cover' }).toBuffer()

  console.log('reached line 55. Passed sharp')
  // create post for s3 bucket and send image
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: `${req.body.user_id}_profile_image`,
    Body: buffer,
    // ContentType: req.file.mimetype,
    ContentType: 'image/jpeg'
  })
  await s3.send(command)
  // get image url from newly created bucket entry
  const getObjectParams = {
    Bucket: bucketName,
    Key: `${req.body.user_id}_profile_image`
  }
  const urlCommand = new GetObjectCommand(getObjectParams)
  const imageUrl = await getSignedUrl(s3, urlCommand)
  // add entry to SQL data base with user_id, image_id, url

  const exists = await db_local.query(`SELECT * FROM images WHERE user_id = ${req.body.user_id}`)

  if (exists.rows.length === 0) {

    db_local.query('INSERT INTO images (user_id, image_url) VALUES ($1, $2)', [req.body.user_id, imageUrl])
      .then((response) => {
        console.log('user_id and image_url successfully added to SQL: ', response)
        res.status(200).json({ message: 'Image added successfully!', imageUrl });
      })
      .catch((err) => {
        console.log('And error ocurred when adding the user_id and image_id to SQL: ', err)
        res.status(500).json({ error: 'An error occurred while adding the image.' });
      })

  } else {
    db_local.query(`UPDATE images SET image_url = '${imageUrl}' WHERE user_id = ${req.body.user_id}`)
      .then((response) => {
        console.log('image_url successfully udpated in SQL: ', response)
        res.status(200).json({ message: 'Image changed successfully!', imageUrl });
      })
      .catch((err) => {
        console.log('And error ocurred when adding the user_id and image_id to SQL: ', err)
        res.status(500).json({ error: 'An error occurred while adding the image.' });
      })


  }
});

app.get('/getImage/:user_id', async (req, res, next) => {
  try {

    const user_id = req.params.user_id;

    const response = await db_local.query(`SELECT * FROM images WHERE user_id = ${user_id}`)
    res.status(200).send(response.rows[0].image_url)

  } catch (error) {
    next(error)

  }

})

app.get('/', (req, res) => {
  console.log('received get request from API gateway')
  res.send('received get request from API gateway')
})

// Example middleware to record request duration for prometheus metrics
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route.path, status_code: res.statusCode });
  });
  next();
});

// Expose metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.json( await promClient.register.metrics());
});

// Global Error handler
app.use((err, req, res, next) => {
  const defaultErr = {
    log: 'profile service global error handler caught unknown ærror',
    status: 500,
    message: { err: 'unknown error occured in profile service' }
  }

  // prometheus error logging
  syntaxErrorsCounter.labels({
    error_type: err.name, 
    error_stack: err.stack,
    error_message: err.message,
    exact_time: new Date().getTime(),
    service: 'auth'
  }).inc()

  const errorObj = Object.assign(defaultErr, err);
  console.log(errorObj.message)
  res.status(errorObj.status).json(errorObj.message);
});



app.listen(PORT, () => {
  console.log(`Server listening on image port: ${PORT}`)
});

module.exports = app;