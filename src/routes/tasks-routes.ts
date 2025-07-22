import { Router } from "express"
import { TasksController } from "@/controllers/tasks-controller"
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated"
import { verifyUserAuthorization } from "@/middlewares/verify-user-authorization"

const tasksRoutes = Router()
const tasksController = new TasksController()


tasksRoutes.post("/", verifyUserAuthorization(["admin"]), tasksController.create)
tasksRoutes.get("/", verifyUserAuthorization(["admin"]), tasksController.listAll),
tasksRoutes.get("/teams", verifyUserAuthorization(["admin", "member"]),  tasksController.listByTeam)
tasksRoutes.get("/users", verifyUserAuthorization(["admin", "member"]), tasksController.listByLoggedUser)
tasksRoutes.get("/users/filter", verifyUserAuthorization(["admin", "member"]), tasksController.listByUser)
tasksRoutes.get("/:id", verifyUserAuthorization(["admin", "member"]), tasksController.showById)
tasksRoutes.put("/:id", verifyUserAuthorization(["admin", "member"]), tasksController.update)
tasksRoutes.delete("/:id", verifyUserAuthorization(["admin"]), tasksController.delete)

//tasksRoutes.put("/:id", tasksController.update)
//tasksRoutes.delete("/:id", verifyUserAuthorization(["admin"]), tasksController.delete)

export { tasksRoutes }