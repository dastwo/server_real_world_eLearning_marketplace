const mongoose = require('mongoose')
mongoose.set('strictQuery', true);
 const connectDb = async () => {
    mongoose.connect(process.env.DATABASE, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }).then(()=>console.log(`**database connect**`)).catch((err)=>console.error('Not Connected'))
    
  }

module.exports = connectDb