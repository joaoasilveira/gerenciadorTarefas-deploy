import request from "supertest";
import { app } from "@/app";
import { prisma } from "@/database/prisma";

describe("TasksController - Create Task", () => {
  let adminToken: string;
  let teamId: string;
  let userId: string;
  let createdTaskIds: string[] = [];

  
    afterAll(async () => {
        // Apaga tasks criadas nos testes
        if (createdTaskIds.length > 0) {
        await prisma.task.deleteMany({
            where: {
            id: { in: createdTaskIds },
            },
        });
        }

        // Remove membros do time criados
        if (teamId) {
        await prisma.teamMember.deleteMany({
            where: {
            teamId,
            userId,
            },
        });
        }

        // Apaga time criado
        if (teamId) {
        await prisma.team.delete({
            where: { id: teamId },
        });
        }

        // Apaga usuário criado
        if (userId) {
        await prisma.user.delete({
            where: { id: userId },
        });
        }
    });

  beforeAll(async () => {
    // Cria usuário admin e pega token
    const adminUser = await request(app).post("/users").send({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });
    userId = adminUser.body.id;

    const session = await request(app).post("/sessions").send({
      email: "admin@example.com",
      password: "password123",
    });
    adminToken = session.body.token;

    // Cria time
    const team = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dev Team" });
    teamId = team.body.id;

    // Adiciona usuário admin no time (para permitir atribuir tarefa)
    await request(app)
      .post(`/teams/${teamId}/members`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId });
  });

  it("should create a new task successfully", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "New Task",
        description: "Task description",
        assignedTo: userId,
        teamId: teamId,
        priority: "high",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.title).toBe("New Task");

    createdTaskIds.push(response.body.id);
  });

  it("should fail if team does not exist", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Invalid Team Task",
        assignedTo: userId,
        teamId: "00000000-0000-0000-0000-000000000000",
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Team not found.");
  });

  // mais testes podem seguir...
});