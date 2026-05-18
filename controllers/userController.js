const { StatusCodes } = require("http-status-codes");

const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");
const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const register = async (req, res, next) => {
    if (!req.body) req.body = {};
        
        const { error, value } = userSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
            message: "Validation failed",
            details: error.details,
            });
        }
        let user = null;
        value.hashed_password = await hashPassword(value.password);
        // the code to here is like the in-memory version
        try {
            user = await pool.query(`INSERT INTO users (email, name, hashed_password) 
            VALUES ($1, $2, $3) RETURNING id, email, name`,
            [value.email, value.name, value.hashed_password]
            ); // note that you use a parameterized query
        } catch (e) { // the email might already be registered
        if (e.code === "23505") { // this means the unique constraint for email was violated
            // here you return the 400 and the error message.  Use a return statement, so that 
            // you don't keep going in this function
         return res.status(400).json({ message: "Email is already registered." });

        }
        return next(e); // all other errors get passed to the error handler
        }
        // otherwise user now contains the new user.  You can return a 201 and the appropriate
        // object.  Be sure to also set global.user_id with the id of the user record you just created. 
    const newUser = user.rows[0];
    global.user_id = newUser.id; 

    return res.status(201).json({
    name: newUser.name,
    email: newUser.email
    });
    };


const logon = async (req, res, next) => {
    const { email, password } = req.body;
    
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
        }

        const user = result.rows[0];

        if (await comparePassword(password, user.hashed_password)) {
            global.user_id = user.id;  
            return res.status(StatusCodes.OK).json({ name: user.name, email: user.email });
        } else {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
        }
    } catch (err) {
        return next(err);
    }
};

const logoff = (req,res) => {
    global.user_id = null;
    res.sendStatus(StatusCodes.OK);
};

module.exports = { register, logon, logoff };
