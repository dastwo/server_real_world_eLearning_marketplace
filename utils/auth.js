const bcrypt = require('bcrypt')

const hashPassword = async (password) => {
    try {
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (err) {
      throw new Error(`Error while hashing password: ${err.message}`);
    }
  };

const comparePassword = (password, hash)=>{
    return bcrypt.compare(password, hash)
}

module.exports = {hashPassword, comparePassword}