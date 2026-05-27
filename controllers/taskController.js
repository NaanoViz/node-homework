const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const { StatusCodes } = require("http-status-codes");
const prisma = require('../db/prisma');

const create = async (req, res, next) => {
    if(!req.body) req.body = {};
    const { error, value } = taskSchema.validate(req.body, {abortEarly: false });

    if (error){
        return res.status(400).json({ message: error.message });
    }

    try {
        const newTask = await prisma.task.create({
            data: {
                title: value.title,
                isCompleted: value.isCompleted || false, 
                userId: global.user_id,          
            },
            select: { 
                id: true, 
                title: true, 
                isCompleted: true 
            }
        });

        return res.status(201).json(newTask);  
    } catch (err) {
        if (typeof next === "function") return next(err);
        return res.status(500).json({ message: "Database error" });
    }
};


const index = async (req, res, next) => {

    try {
         const userTasks = await prisma.task.findMany({
            where: {
                userId: global.user_id, 
            },
            select: { title: true, isCompleted: true, id: true }
        });

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


    try {
        const task = await prisma.task.delete({
            where: {
                id_userId: {
                    id: taskToFind,
                    userId: global.user_id,
                },
            },
            select: { id: true, title: true, isCompleted: true } 
        });
        
        return res.json(task); 
    } catch (err) {
        
        if (err.code === "P2025") {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
        } else {
            if (typeof next === "function") return next(err);
        return res.status(500).json({ message: "Database error" });
      }
    }
};

const show = async (req, res, next) => {
     const taskToFind = parseInt(req.params?.id); // if there are no params, the ? makes sure that you
                // get a null
    
    if (!taskToFind) {
        return res.status(400).json({message: "The task ID passed is not valid."})
    }
    
    try {
        const task = await prisma.task.findUniqueOrThrow({
            where: {
                id_userId: {
                    id: taskToFind,
                    userId: global.user_id,
                },
            },
            select: { id: true, title: true, isCompleted: true }
        });

        return res.json(task);
    } catch (err) {
        if (err.code === "P2025") {
            return res.status(404).json({ message: "That task was not found" });
        } else {
        if (typeof next === "function") return next(err);
        return res.status(500).json({ message: "Database error" });
    }
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

    try {
        const task = await prisma.task.update({
            data: value, 
            where: {
                id_userId: {
                    id: taskToFind,
                    userId: global.user_id,
                },
            },
            select: { title: true, isCompleted: true, id: true }
        });

        return res.json(task);
    } catch (err) {
        if (err.code === "P2025") {
            return res.status(404).json({ message: "The task was not found." });
        } else {
            if (typeof next === "function") return next(err);
            return res.status(500).json({ message: "Database error" });
        }
    }
};

module.exports = { create, index, show, update, deleteTask };
