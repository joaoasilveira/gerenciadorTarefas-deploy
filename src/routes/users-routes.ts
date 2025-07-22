import { Router } from "express";
import { UsersController } from "../controllers/users-controller";
import { verifyUserAuthorization } from "@/middlewares/verify-user-authorization";
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated";

const usersRoutes = Router();
const usersController = new UsersController();

usersRoutes.post("/", usersController.create);

usersRoutes.use(ensureAuthenticated)
usersRoutes.use(verifyUserAuthorization(["admin"])); // aplica para todas as rotas abaixo

usersRoutes.get("/", usersController.index);
usersRoutes.get("/:id", usersController.show);
usersRoutes.put("/:id", usersController.update);
usersRoutes.delete("/:id", usersController.delete);

export { usersRoutes };