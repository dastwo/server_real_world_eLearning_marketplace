const express = require('express');
const {readdirSync} = require('fs');
const cors = require('cors')
const csrf = require('csurf')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
require('dotenv').config()
require('./config/database')()

const app = express()
const csrfProtection = csrf({ cookie: true })


app.use(cors())
app.use(express.json({ limit: '5mb', extended: true }))
app.use(morgan('dev'))
app.use(cookieParser())

readdirSync('./routes').map((r)=> app.use('/api', require(`./routes/${r}`)))

app.use(csrfProtection)

app.get('/api/csrf-token', (req, res)=>{
    res.json({csrfToken: req.csrfToken()});
})

const port = process.env.PORT || 8080
app.listen(port, ()=>{
    console.log(`server run port ${port}`);
})