import {Router} from "express"
import { TeamsController } from "@/controllers/teams-controller"
import { verifyUserAuthorization } from "@/middlewares/verify-user-authorization"

const teamsRoutes = Router()
const teamsController = new TeamsController()

teamsRoutes.post(
    "/",
    verifyUserAuthorization(["admin"]),
    teamsController.create
)

teamsRoutes.get(
    "/",
    verifyUserAuthorization(["admin"]),
    teamsController.index
)

teamsRoutes.put(
  "/:teamId",
  verifyUserAuthorization(["admin"]),
  teamsController.update
)

teamsRoutes.delete(
  "/:teamId",
  verifyUserAuthorization(["admin"]),
  teamsController.delete
)

teamsRoutes.get(
  "/users",
  verifyUserAuthorization(["admin", "member"]),
  teamsController.listByLoggedUser
)

teamsRoutes.post(
  "/:teamId/members",
  verifyUserAuthorization(["admin"]),
  teamsController.addMember
)

teamsRoutes.delete(
  "/:teamId/members/:userId",
  verifyUserAuthorization(["admin"]),
  teamsController.removeMember
)

export {teamsRoutes}