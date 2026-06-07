const { StatusCodes } = require("http-status-codes");
const prisma = require("../db/prisma");

const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const scrypt = util.promisify(crypto.scrypt);

const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");


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

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

const register = async (req, res, next) => {
    if (!req.body) req.body = {};
        
        const { error, value } = userSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
            message: "Validation failed",
            details: error.details,
            });
        }
        value.hashedPassword = await hashPassword(value.password);
        delete value.password;
        // the code to here is like the in-memory version
       
        // Do the Joi validation, so that value contains the user entry you want.
        // hash the password, and put it in value.hashedPassword
        // delete value.password as that doesn't get stored

        try {
        const result = await prisma.$transaction(async (tx) => {
            
         const newUser = await tx.user.create({
            data: { 
                name: value.name, 
                email: value.email.toLowerCase(), // Force lowercase representation
                hashedPassword: value.hashedPassword 
            },
            select: { id: true, name: true, email: true, createdAt: true } // specify the column values to return
        });

        const welcomeTaskData = [
                { title: "Complete your profile", userId: newUser.id, priority: "medium" },
                { title: "Add your first task", userId: newUser.id, priority: "high" },
                { title: "Explore the app", userId: newUser.id, priority: "low" }
            ];
            await tx.task.createMany({ data: welcomeTaskData });
        
            const welcomeTasks = await tx.task.findMany({
                where: {
                    userId: newUser.id,
                    title: { in: welcomeTaskData.map(t => t.title) }
                },
                select: {
                    id: true,
                    title: true,
                    isCompleted: true,
                    userId: true,
                    priority: true
                }
            });

            return { user: newUser, welcomeTasks };
        });


        // otherwise register succeeded, so set global.user_id with user.id, and do the
        // appropriate res.status().json().
        // otherwise user now contains the new user.  You can return a 201 and the appropriate
        // object.  Be sure to also set global.user_id with the id of the user record you just created. 
    
        const csrfToken = setJwtCookie(req, res, result.user);


    return res.status(201).json({
        user: {
        name: result.user.name,
        email: result.user.email,
        },
        csrfToken
    });
    

        } catch (err) {
            if (err.code === "P2002") { 
            return res.status(400).json({ error: "Email already registered" }); 
        } else {
            return next(err);
        }
    }

    };

const logon = async (req, res, next) => {
    let { email, password } = req.body;
    
    try {
        email = email.toLowerCase() // Joi validation always converts the email to lower case
                            // but you don't want logon to fail if the user types mixed case
        const user = await prisma.user.findUnique({ 
            where: { email },
              select: {
                id: true,
                name: true,
                email: true,
                hashedPassword: true // Needed to run comparePassword securely
            }
        
        });
                            // also Prisma findUnique can't do a case insensitive search

        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
        }

        if (await comparePassword(password, user.hashedPassword)) {
            const csrfToken = setJwtCookie(req, res, user);
            return res.status(StatusCodes.OK).json({ name: user.name, email: user.email, csrfToken });
        } else {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
        }
    } catch (err) {
        return next(err);
    }
};

const logoff = (req,res) => {
    res.clearCookie("jwt", cookieFlags(req));
    return res.status(StatusCodes.OK).json({ message: "Logged off successfully." });;
};

module.exports = { register, logon, logoff };
