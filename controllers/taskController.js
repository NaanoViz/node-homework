const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const { StatusCodes } = require("http-status-codes");
const pool = require("../db/pg-pool");


const create = async (req, res, next) => {
    if(!req.body) req.body = {};
    const { error, value } = taskSchema.validate(req.body, {abortEarly: false });

    if (error){
        return res.status(400).json({ message: error.message });
    }

    const activeUserId = global.user_id?.id || global.user_id;

    try {
        const result = await pool.query(
            `INSERT INTO tasks (title, is_completed, user_id) 
             VALUES ($1, $2, $3) RETURNING id, title, is_completed`,
            [value.title, value.is_completed || false, activeUserId]
        );

        // we don't send back the userId! This statement removes it.
        return res.status(201).json(result.rows[0]);  
    } catch (err) {
        if (typeof next === "function") return next(err);
        return res.status(500).json({ message: "Database error" });
    }
}


const index = async (req, res, next) => {

    const activeUserId = global.user_id?.id || global.user_id;

    try {
        const result = await pool.query(
            "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
            [activeUserId]
        );

        const userTasks = result.rows;
        if (userTasks.length === 0) {
            return res.status(404).json({ message: "No tasks found" });
        }

        return res.json(userTasks);
    } catch (err) {
        if (typeof next === "function") return next(err);
        return res.status(500).json({ message: "Database error" });
    }
};

const deleteTask = async (req, res, next) => {
    const taskToFind = parseInt(req.params?.id); // if there are no params, the ? makes sure that you
                // get a null
    
    if (!taskToFind) {
        return res.status(400).json({message: "The task ID passed is not valid."})
    }
    
    const activeUserId = global.user_id?.id || global.user_id;


    try {
        const result = await pool.query(
            "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title, is_completed",
            [taskToFind, activeUserId]
        );
        
        if (result.rows.length === 0) { // if no such task
            return res.status(StatusCodes.NOT_FOUND).json({message: "That task was not found"}); 
        // else it's a 404.
        }
        
        // pull userId out and keep a copy of everything else, so the response is sanitized
        const task = result.rows[0];
        // do the delete
        return res.json(task); // return the deleted entry without its userId. The default status code, OK, is returned
    } catch (err) {
        if (typeof next === "function") return next(err);
        return res.status(500).json({ message: "Database error" });
    }
}

const show = async (req, res, next) => {
     const taskToFind = parseInt(req.params?.id); // if there are no params, the ? makes sure that you
                // get a null
    
    if (!taskToFind) {
        return res.status(400).json({message: "The task ID passed is not valid."})
    }
    
    const activeUserId = global.user_id?.id || global.user_id;

    try {
        const result = await pool.query(
            "SELECT id, title, is_completed FROM tasks WHERE id = $1 AND user_id = $2",
            [taskToFind, activeUserId]
        );

        if (result.rows.length === 0) { // if no such task
            return res.status(404).json({ message: "That task was not found" });
        }
        
        const sanitizedTask = result.rows[0];

        return res.json(sanitizedTask);
    } catch (err) {
        if (typeof next === "function") return next(err);
        return res.status(500).json({ message: "Database error" });
    }
};

const update = async (req, res, next) => {
    if (!req.body) req.body = {};
    
    const {error, value} = patchTaskSchema.validate(req.body, { abortEarly: false });

    if (error){
        return res.status(400).json({ message: error.message});
    }
    
    const taskToFind = parseInt(req.params?.id);
    
    if (!taskToFind) {
        return res.status(400).json({ message: "The task ID passed is not valid." });
    }
    
    if (Object.keys(value).length === 0) {
        return res.status(400).json({ message: "No update fields provided." });
    }

    const activeUserId = global.user_id?.id || global.user_id;

    try {
        let keys = Object.keys(value);
        keys = keys.map((key) => key === "isCompleted" ? "is_completed" : key);
        
        const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
        const idParm = `$${keys.length + 1}`;
        const userParm = `$${keys.length + 2}`;

        const result = await pool.query(
            `UPDATE tasks SET ${setClauses} 
             WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`, 
            [...Object.values(value), taskToFind, activeUserId]
        );

        if (result.rows.length === 0) { 
            return res.status(404).json({ message: "That task was not found" });
        }
        
        const sanitizedTask = result.rows[0];
        return res.json(sanitizedTask);
    } catch (err) {
        if (typeof next === "function") return next(err);
        return res.status(500).json({ message: "Database error" });
    }
}

module.exports = { create, index, show, update, deleteTask };
