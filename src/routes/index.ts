import { Router } from "express";
import { usersRoutes } from "./users-routes";
import { teamsRoutes } from "./teams-routes";
import { sessionsRoutes } from "./sessions-routes";
import { tasksRoutes } from "./tasks-routes";

import { ensureAuthenticated } from "@/middlewares/ensure-authenticated";

const routes = Router()

//Rotas públicas.
routes.use("/users", usersRoutes)
routes.use("/sessions", sessionsRoutes)

//Rotas privadas.
routes.use(ensureAuthenticated)
routes.use("/teams", teamsRoutes)
routes.use("/tasks", tasksRoutes)

export {routes}