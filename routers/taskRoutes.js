const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");

router.post("/", taskController.create);
router.get("/", taskController.index);
router.get("/:id", taskController.show);
router.patch("/", taskController.update);
router.delete("/", taskController.deleteTask);

module.exports = router;