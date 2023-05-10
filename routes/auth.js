const express = require('express')
const { register, login, logout, sendTestEmail, currentUser, forgetPassword, resetPassword } = require('../controllers/auth')
const {requireSignIn} = require('../middleware/index')
const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/logout', logout)
router.get('/send-email', sendTestEmail)
router.get('/current-user',requireSignIn ,currentUser)
router.post('/forget-password', forgetPassword)
router.post('/reset-password', resetPassword)


module.exports = router