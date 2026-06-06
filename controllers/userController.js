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
    global.user_id = result.user.id; 

    return res.status(201).json({
        user: result.user,      
        welcomeTasks: result.welcomeTasks, 
        transactionStatus: "success"
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
