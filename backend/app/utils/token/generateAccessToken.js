const jwt = require('jsonwebtoken')



const generateAccessToken = (user)=>{
   return jwt.sign({
    id:user._id,
    email:user.email,
    role:user.role,
    type:"access"
   },
   process.env.ACCESS_TOKEN_SECRET,
   {
    expiresIn:process.env.ACCESS_TOKEN_EXPIRES_IN
   }
)
}

module.exports = generateAccessToken