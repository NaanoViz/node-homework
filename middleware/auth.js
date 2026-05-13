// Checks, Logged user
// If global.user_id = null => Unauthorized stat code w/JSON msg saying Unauthorized
// If = true, says next() 

module.exports = (req, res, next) => {
  if (global.user_id === null) {
    return res.status(401).json({ message: "unauthorized"})
  }
  else{
    next()
  }
    
};