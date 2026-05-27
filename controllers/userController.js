const { StatusCodes } = require("http-status-codes");
const prisma = require("../db/prisma");

const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
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
        value.hashedPassword = await hashPassword(value.password);
        delete value.password;
        // the code to here is like the in-memory version
       
        // Do the Joi validation, so that value contains the user entry you want.
        // hash the password, and put it in value.hashedPassword
        // delete value.password as that doesn't get stored

        try {
        user = await prisma.user.create({
            data: { 
                name: value.name, 
                email: value.email.toLowerCase(), // Force lowercase representation
                hashedPassword: value.hashedPassword 
            },
            select: { name: true, email: true, id: true }// specify the column values to return
        });
        } catch (err) {
            if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
            // send the appropriate error back -- the email was already registered
            return res.status(400).json({ message: "The email was already registered." });
            } else {
            return next(err); // the error handler takes care of other errors
            }
        }
        // otherwise register succeeded, so set global.user_id with user.id, and do the
        // appropriate res.status().json().
        // otherwise user now contains the new user.  You can return a 201 and the appropriate
        // object.  Be sure to also set global.user_id with the id of the user record you just created. 
    global.user_id = user.id; 

    return res.status(201).json({
        name: user.name,
        email: user.email
    });
    };


const logon = async (req, res, next) => {
    let { email, password } = req.body;
    
    try {
        email = email.toLowerCase() // Joi validation always converts the email to lower case
                            // but you don't want logon to fail if the user types mixed case
        const user = await prisma.user.findUnique({ where: { email }});
                            // also Prisma findUnique can't do a case insensitive search

        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
        }

        if (await comparePassword(password, user.hashedPassword)) {
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
