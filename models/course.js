const mongoose = require('mongoose')

const {ObjectId} = mongoose.SchemaTypes

const lesseesSchema = new mongoose.Schema({
    title:{
        type: String,
        trim: true,
        munLength: 3,
        maxLength: 320,
        required: true
    },
    slug:{
        type:String,
        lowercase: true,
    },
    content:{
        type:String,
        minlength: 200,
    },
    video:{},
    free_preview:{
        type: Boolean,
        default: false
    },
},{timestamps: true}) 

const courseSchema = new mongoose.Schema({
    name:{
        type: String,
        trim: true,
        munLength: 3,
        maxLength: 320,
        required: true
    },
    slug:{
        type:String,
        lowercase: true,
        required: true
    },
    description:{
        type:{},
        minlength: 200,
        required: true
    },
    price:{
        type: Number,
        default: 9.99,
    },
    image:{},
    category: String,
    paid:{
        type: Boolean,
        default:false
    },
    instructor:{
        type: ObjectId,
        ref:'User',
        required: true
    },
    lessons:[lesseesSchema],
    published:{
        type: Boolean,
        default: false
    }

},{timestamps:true})


module.exports = mongoose.model('Course', courseSchema)