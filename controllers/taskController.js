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
                priority: value.priority,
                userId: req.user.id,        
            },
            select: { 
                id: true, 
                title: true, 
                isCompleted: true,
                priority: true
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (page < 1) page = 1;
        if (limit < 1 || limit > 100) limit = 10;
        
        const skip = (page - 1) * limit;

        const whereClause = { userId: req.user.id };

        if (req.query.find) {
            whereClause.title = {
                contains: req.query.find, // Matches %find% pattern
                mode: 'insensitive' // Case-insensitive search (ILIKE in PostgreSQL)
            };
        }


         const userTasks = await prisma.task.findMany({
            where: whereClause,
            select: { 
                id: true,
                title: true, 
                isCompleted: true,
                priority: true,
                createdAt: true,
                User: {  
                  select: {
                    name: true,
                    email: true
                }
            }
        },
            skip: skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
     });

        const totalTasks = await prisma.task.count({
            where: whereClause
        });


        if (userTasks.length === 0) {
            return res.status(404).json({ message: "No tasks found" });
        }
         const totalPages = Math.ceil(totalTasks / limit) || 1;

        const pagination = {
            page: page,
            limit: limit,
            total: totalTasks,
            pages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };

        return res.status(200).json({
            tasks: userTasks,
            pagination: pagination
        });
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
                    userId: req.user.id,
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
                    userId: req.user.id,
                },
            },
            select: { 
                id: true, 
                title: true, 
                isCompleted: true, 
                priority:true, 
                createdAt: true,
                User: { 
                    select: {
                        name: true,
                        email: true
                    }
                }}
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
                    userId: req.user.id,
                },
            },
            select: { title: true, isCompleted: true, id: true, priority: true }
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

// Bulk create with validation

const bulkCreate = async (req, res, next) => {  
    const { tasks } = req.body;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ 
      error: "Invalid request data. Expected an array of tasks." 
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || 'medium',
      userId: req.user.id
    });
  }

  // Use createMany for batch insertion
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false
    });

    return res.status(201).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length
    });
  } catch (err) {
    if (typeof next === "function") return next(err);
    return res.status(500).json({ message: "Database error" });
  }
};
module.exports = { create, index, show, update, deleteTask, bulkCreate };
