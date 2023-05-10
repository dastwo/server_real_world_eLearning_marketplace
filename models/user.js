const mongoose = require('mongoose')

const {ObjectId} = mongoose.SchemaTypes

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        trim: true,
        required: [true, 'name is required'],
    },
    email:{
        type:String,
        trim: true,
        required: [true, 'email is required'],
        unique: true
    },
    password:{
        type:String,
        required: [true, 'password is required'],
        min: [6, 'password most be min 6 characters long'],
        max: [64, 'password most be max 64 characters long']
    },
    picture:{
        type:String,
        default:'./avatar.png'
    },
    role:{
        type:[String],
        enum:['Subscriber', 'Instructor', 'Admin'],
        default:['Subscriber']
    },
    stripe_account_id:'',
    stripe_seller:{},
    stripeSession:{},
    passwordResetCode:{
        type: String,
        default:''
    },
    courses: [{type: ObjectId, ref:'Course'}],
}, {timestamps: true, })

module.exports = mongoose.model('User', userSchema) 