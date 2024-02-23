const express = require('express')

const PORT = 3003
const app = express()

app.use('/')


app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`)
})
module.exports = app;