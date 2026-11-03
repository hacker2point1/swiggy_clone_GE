const jwt = require('jsonwebtoken')



const generateRefreshToken = (user)=>{
   return jwt.sign({
    id:user._id,
    email:user.email,
    role:user.role,
    type:"refresh"
   },
   process.env.REFRESH_TOKEN_SECRET,
   {
    expiresIn:process.env.REFRESH_TOKEN_EXPIRES_IN
   }
)
}

module.exports = generateRefreshToken