const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");

router.post("/", taskController.create);
router.get("/", taskController.index);
router.get("/:id", taskController.show);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.deleteTask);

module.exports = router;